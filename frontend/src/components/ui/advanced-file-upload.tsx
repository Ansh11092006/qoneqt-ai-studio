import React, { useState, useRef, useEffect, useCallback, DragEvent, ChangeEvent } from "react";
import {
  Image as ImageIcon, Film, FileText, X,
  CheckCircle2, AlertCircle, RefreshCw, Loader2, Sparkles,
} from "lucide-react";
import { pollAssetStatus } from "@/api/client";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnalysisStatus = "pending" | "analyzing" | "complete" | "failed";

export interface UploadedFile {
  id: string;
  fingerprint: string;
  assetId?: string;
  name: string;
  size: number;
  type: string;
  kind: "script" | "media" | "logo";
  previewUrl?: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  analysisStatus: AnalysisStatus;
  errorMessage?: string;
  text?: string;
  abortController?: AbortController;
}

interface FileUploadProps {
  accept: string;
  maxSizeMB: number;
  maxFiles?: number;
  kind: "script" | "media" | "logo";
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  onScriptLoaded?: (text: string) => void;
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONCURRENCY = 3;
const MAX_IMG_DIM = 1920;
const IMG_QUALITY = 0.82;
const POLL_MS     = 2500;
const MAX_RETRIES = 3;

// ── Helpers ───────────────────────────────────────────────────────────────────

function mkFP(f: File): string {
  return f.name + "_" + f.size + "_" + f.lastModified;
}

function fmtB(b: number): string {
  return b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";
}

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  if (file.size < 512000) return file;
  return new Promise<File>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.width;
      let h = img.height;
      if (w > MAX_IMG_DIM || h > MAX_IMG_DIM) {
        const ratio = Math.min(MAX_IMG_DIM / w, MAX_IMG_DIM / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const ctx = cv.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
      cv.toBlob((blob) => {
        if (!blob || blob.size >= file.size) { resolve(file); return; }
        resolve(new File([blob], file.name, { type: outType, lastModified: file.lastModified }));
      }, outType, IMG_QUALITY);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function xhrUp(
  file: File,
  signal: AbortSignal,
  onProg: (p: number) => void
): Promise<{ asset_id: string; kind: string; url: string; status: string; analysisStatus: string; text?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProg(Math.round((e.loaded / e.total) * 95));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); }
        catch { reject(new Error("Bad response")); }
      } else {
        try { reject(new Error(JSON.parse(xhr.responseText).detail || "HTTP " + xhr.status)); }
        catch { reject(new Error("HTTP " + xhr.status)); }
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Cancelled")));
    signal.addEventListener("abort", () => xhr.abort());
    xhr.open("POST", "/api/uploads");
    xhr.send(fd);
  });
}

async function uploadWithRetry(
  file: File,
  signal: AbortSignal,
  onProg: (p: number) => void,
  attempt = 0
): Promise<{ asset_id: string; kind: string; url: string; status: string; analysisStatus: string; text?: string }> {
  try {
    return await xhrUp(file, signal, onProg);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "Cancelled") throw err;
    if (attempt < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      return uploadWithRetry(file, signal, onProg, attempt + 1);
    }
    throw err;
  }
}

type Task = () => Promise<void>;

async function runParallel(tasks: Task[], limit: number): Promise<void> {
  const q = [...tasks];
  await Promise.all(
    Array.from({ length: Math.min(limit, q.length) }, async () => {
      while (q.length) {
        const t = q.shift();
        if (t) await t().catch(() => {});
      }
    })
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export const FileUpload: React.FC<FileUploadProps> = ({
  accept, maxSizeMB, maxFiles = 6, kind, files,
  onFilesChange, onScriptLoaded, className,
}) => {
  const [isDrag, setIsDrag]  = useState(false);
  const dragRef  = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fRef     = useRef<UploadedFile[]>(files);
  const timers   = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  useEffect(() => { fRef.current = files; }, [files]);

  const update = useCallback((id: string, patch: Partial<UploadedFile>) => {
    const next = fRef.current.map((f) => f.id === id ? { ...f, ...patch } : f);
    fRef.current = next;
    onFilesChange(next);
  }, [onFilesChange]);

  const startPoll = useCallback((id: string, aid: string) => {
    if (timers.current.has(id)) return;
    const t = setInterval(async () => {
      try {
        const r = await pollAssetStatus(aid);
        update(id, { analysisStatus: r.analysisStatus as AnalysisStatus });
        if (r.analysisStatus === "complete" || r.analysisStatus === "failed") {
          clearInterval(t);
          timers.current.delete(id);
        }
      } catch { /* ignore transient poll errors */ }
    }, POLL_MS);
    timers.current.set(id, t);
  }, [update]);

  useEffect(() => () => {
    timers.current.forEach(clearInterval);
    fRef.current.forEach((f) => {
      if (f.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(f.previewUrl);
    });
  }, []);

  const process = useCallback(async (sel: FileList | File[]) => {
    const list = Array.from(sel);
    if (!list.length) return;

    const fpSet = new Set(fRef.current.map((f) => f.fingerprint));
    const uniq  = list.filter((f) => !fpSet.has(mkFP(f)));
    const slots = kind === "logo" ? 1 : maxFiles - fRef.current.length;
    const batch = uniq.slice(0, slots);
    if (!batch.length) return;

    // Create entries right away so thumbnails appear instantly
    const entries: UploadedFile[] = batch.map((f) => ({
      id:             "e_" + Date.now() + "_" + Math.random().toString(36).slice(2),
      fingerprint:    mkFP(f),
      name:           f.name,
      size:           f.size,
      type:           f.type,
      kind,
      previewUrl:     f.type.startsWith("image/") || f.type.startsWith("video/")
                        ? URL.createObjectURL(f) : undefined,
      progress:       0,
      status:         "uploading" as const,
      analysisStatus: "pending" as const,
    }));

    const next = kind === "logo" ? [...entries] : [...fRef.current, ...entries];
    fRef.current = next;
    onFilesChange(next);

    // Read plain-text scripts synchronously
    batch.forEach((f, i) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (kind === "script" && ["txt", "md"].includes(ext)) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const txt = ev.target?.result as string;
          if (txt && onScriptLoaded) onScriptLoaded(txt);
          update(entries[i].id, { text: txt });
        };
        reader.readAsText(f);
      }
    });

    const tasks: Task[] = batch.map((raw, i) => async () => {
      const e = entries[i];
      if (raw.size > maxSizeMB * 1048576) {
        update(e.id, { status: "error", errorMessage: "Exceeds " + maxSizeMB + " MB limit" });
        return;
      }
      const comp = await compressImage(raw).catch(() => raw);
      const ac = new AbortController();
      update(e.id, { abortController: ac });
      try {
        const res = await uploadWithRetry(comp, ac.signal, (p) => update(e.id, { progress: p }));
        update(e.id, {
          assetId:         res.asset_id,
          status:          "completed",
          progress:        100,
          analysisStatus:  (res.analysisStatus as AnalysisStatus) || "pending",
          text:            res.text,
          abortController: undefined,
        });
        if (res.analysisStatus !== "complete") startPoll(e.id, res.asset_id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        if (msg === "Cancelled") {
          const wo = fRef.current.filter((f) => f.id !== e.id);
          fRef.current = wo;
          onFilesChange(wo);
        } else {
          update(e.id, { status: "error", errorMessage: msg, abortController: undefined });
        }
      }
    });

    await runParallel(tasks, CONCURRENCY);
  }, [kind, maxFiles, maxSizeMB, onFilesChange, onScriptLoaded, startPoll, update]);

  const remove = useCallback((id: string) => {
    const t = fRef.current.find((f) => f.id === id);
    if (t?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(t.previewUrl);
    if (t?.abortController) t.abortController.abort();
    const tm = timers.current.get(id);
    if (tm) { clearInterval(tm); timers.current.delete(id); }
    const wo = fRef.current.filter((f) => f.id !== id);
    fRef.current = wo;
    onFilesChange(wo);
  }, [onFilesChange]);

  const cancel = useCallback((e: UploadedFile) => e.abortController?.abort(), []);

  const dEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); dragRef.current++;
    if (e.dataTransfer.items?.length > 0) setIsDrag(true);
  };
  const dLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (--dragRef.current <= 0) { dragRef.current = 0; setIsDrag(false); }
  };
  const dOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
  const dDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    setIsDrag(false); dragRef.current = 0;
    if (e.dataTransfer.files) process(e.dataTransfer.files);
  };
  const onCh = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { process(e.target.files); e.target.value = ""; }
  };

  const doneCount  = files.filter((f) => f.status === "completed").length;
  const analCount  = files.filter((f) => f.analysisStatus === "analyzing").length;
  const allReady   = files.length > 0 &&
    files.every((f) => f.status === "completed" && f.analysisStatus === "complete");

  // Sub-components
  const ZoneIcon = () => {
    if (kind === "script") return <FileText size={22} className="text-[var(--accent)]" />;
    if (kind === "logo")   return <ImageIcon size={22} className="text-[var(--accent)]" />;
    return <Film size={22} className="text-[var(--accent)]" />;
  };

  const ABadge = ({ s }: { s: AnalysisStatus }) => {
    if (s === "complete")  return (
      <span className="flex items-center gap-0.5 text-emerald-400 text-[9px] font-mono">
        <Sparkles size={8} /> Analyzed
      </span>
    );
    if (s === "analyzing") return (
      <span className="flex items-center gap-0.5 text-sky-400 text-[9px] font-mono animate-pulse">
        <Loader2 size={8} className="animate-spin" /> Analyzing&hellip;
      </span>
    );
    if (s === "failed")    return (
      <span className="text-orange-400 text-[9px] font-mono">Analysis failed</span>
    );
    return <span className="text-white/25 text-[9px] font-mono">Awaiting analysis</span>;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input ref={inputRef} type="file" accept={accept}
        multiple={kind !== "logo"} onChange={onCh} className="hidden" />

      {/* Drop Zone */}
      <div
        onDragEnter={dEnter} onDragLeave={dLeave} onDragOver={dOver} onDrop={dDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer select-none",
          isDrag
            ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.01]"
            : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8"
        )}
      >
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2.5 shadow-inner">
          <ZoneIcon />
        </div>
        <p className="text-sm font-semibold text-white/90 text-center">
          <span className="text-[var(--accent)]">Click to browse</span> or drag &amp; drop{" "}
          {kind === "script" ? "script (.txt/.md)" : kind === "logo" ? "brand logo" : "clips & images"}
        </p>
        <p className="text-xs text-white/35 mt-1">
          Max {maxSizeMB}MB
          {kind !== "logo" && (" \u00b7 Up to " + maxFiles + " files")}
          {kind === "media" && " \u00b7 Images auto-compressed"}
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {files.map((file) => (
            <div key={file.id}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-black/40 border border-white/10 text-xs">

              {/* Thumbnail */}
              {file.previewUrl && file.type.startsWith("image/") ? (
                <img src={file.previewUrl} alt={file.name}
                  className="w-9 h-9 rounded object-cover border border-white/10 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 shrink-0">
                  {file.kind === "script" ? <FileText size={15} /> : <Film size={15} />}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-white/90 font-medium truncate max-w-[150px] sm:max-w-[200px]">{file.name}</p>
                  <span className="text-[9px] text-white/25 shrink-0">{fmtB(file.size)}</span>
                </div>

                {file.status === "uploading" && (
                  <div className="space-y-0.5">
                    <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-100"
                        style={{ width: file.progress + "%" }} />
                    </div>
                    <span className="text-[9px] text-white/35 font-mono">{file.progress}% uploading&hellip;</span>
                  </div>
                )}

                {file.status === "completed" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-emerald-400 text-[9px] font-mono">&#10003; Uploaded</span>
                    <ABadge s={file.analysisStatus} />
                  </div>
                )}

                {file.status === "error" && (
                  <p className="text-red-400 text-[9px] font-mono truncate">{file.errorMessage}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 shrink-0">
                {file.status === "completed" && (
                  <CheckCircle2 size={14} className="text-emerald-400" />
                )}
                {file.status === "error" && (
                  <>
                    <AlertCircle size={14} className="text-red-400" />
                    <button
                      onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                      title="Retry — re-select file"
                      className="p-1 rounded hover:bg-white/10 text-sky-400 transition-colors">
                      <RefreshCw size={13} />
                    </button>
                  </>
                )}
                {file.status === "uploading" ? (
                  <button onClick={(e) => { e.stopPropagation(); cancel(file); }}
                    title="Cancel upload"
                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors">
                    <X size={13} />
                  </button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); remove(file.id); }}
                    title="Remove"
                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {files.length > 0 && (
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[10px] text-white/30 font-mono">
            {doneCount}/{files.length} uploaded
            {files.some((f) => f.status === "uploading") && " \u00b7 in progress\u2026"}
          </p>
          {analCount > 0 && (
            <span className="text-[10px] text-sky-400/70 font-mono flex items-center gap-1">
              <Loader2 size={9} className="animate-spin" />
              {" AI analyzing " + analCount + (analCount > 1 ? " assets\u2026" : " asset\u2026")}
            </span>
          )}
          {allReady && (
            <span className="text-[10px] text-emerald-400/80 font-mono flex items-center gap-1">
              <Sparkles size={9} /> Assets ready
            </span>
          )}
        </div>
      )}
    </div>
  );
};
