import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from "react";
import { UploadCloud, Image as ImageIcon, Film, FileText, X, CheckCircle2, AlertCircle } from "lucide-react";
import { uploadAsset } from "@/api/client";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  id: string;
  assetId?: string;
  name: string;
  size: number;
  type: string;
  kind: "script" | "media" | "logo";
  previewUrl?: string;
  progress: number;
  status: "uploading" | "completed" | "error";
  errorMessage?: string;
  text?: string;
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

export const FileUpload: React.FC<FileUploadProps> = ({
  accept,
  maxSizeMB,
  maxFiles = 6,
  kind,
  files,
  onFilesChange,
  onScriptLoaded,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl && f.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
    };
  }, [files]);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const processFiles = async (selectedFiles: FileList | File[]) => {
    const fileList = Array.from(selectedFiles);
    if (!fileList.length) return;

    if (kind === "logo" && files.length >= 1) {
      onFilesChange([]);
    }

    const remainingSlots = kind === "logo" ? 1 : maxFiles - files.length;
    const filesToUpload = fileList.slice(0, remainingSlots);

    const newEntries: UploadedFile[] = filesToUpload.map((f) => ({
      id: `${f.name}_${Date.now()}_${Math.random()}`,
      name: f.name,
      size: f.size,
      type: f.type,
      kind,
      previewUrl: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
      progress: 20,
      status: "uploading" as const,
    }));

    // local mutable array so we can update entries by id without functional setState
    let currentFiles: UploadedFile[] = kind === "logo" ? [...newEntries] : [...files, ...newEntries];
    onFilesChange(currentFiles);

    const updateEntry = (entryId: string, patch: Partial<UploadedFile>) => {
      currentFiles = currentFiles.map((item) =>
        item.id === entryId ? { ...item, ...patch } : item
      );
      onFilesChange(currentFiles);
    };

    // Upload files to server
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const entryId = newEntries[i].id;

      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        updateEntry(entryId, { status: "error", errorMessage: `Exceeds ${maxSizeMB}MB limit` });
        continue;
      }

      // If script, also read text client-side
      if (kind === "script") {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (content && onScriptLoaded) {
            onScriptLoaded(content);
          }
        };
        reader.readAsText(file);
      }

      try {
        const res = await uploadAsset(file);
        updateEntry(entryId, {
          assetId: res.asset_id,
          status: "completed",
          progress: 100,
          text: res.text,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateEntry(entryId, { status: "error", errorMessage: msg });
      }
    }
  };


  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (id: string) => {
    const target = files.find((f) => f.id === id);
    if (target?.previewUrl && target.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(target.previewUrl);
    }
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const getIcon = () => {
    if (kind === "script") return <FileText size={24} className="text-[var(--accent)]" />;
    if (kind === "logo") return <ImageIcon size={24} className="text-[var(--accent)]" />;
    return <Film size={24} className="text-[var(--accent)]" />;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={kind === "media"}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed transition-all cursor-pointer",
          isDragging
            ? "border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.01]"
            : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/8"
        )}
      >
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-white/80 shadow-inner">
          {getIcon()}
        </div>
        <p className="text-sm font-semibold text-white/90 text-center">
          <span className="text-[var(--accent)]">Click to browse</span> or drag & drop {kind === "script" ? "script (.txt/.md)" : kind === "logo" ? "brand logo" : "clips & images"}
        </p>
        <p className="text-xs text-white/40 mt-1">
          Max {maxSizeMB}MB {kind === "media" ? `• Up to ${maxFiles} files` : ""}
        </p>
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="w-8 h-8 rounded object-cover border border-white/10 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-white/60 shrink-0">
                    {file.kind === "script" ? <FileText size={16} /> : <Film size={16} />}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white/90 font-medium truncate max-w-[180px] sm:max-w-[240px]">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-white/40">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                    {file.status === "completed" && <span className="text-emerald-400">Ready</span>}
                    {file.status === "uploading" && <span className="text-yellow-400">Uploading...</span>}
                    {file.status === "error" && <span className="text-red-400">{file.errorMessage}</span>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {file.status === "completed" && (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                )}
                {file.status === "error" && (
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
