import React, { useState } from "react";
import { FileText, Film, Image as ImageIcon, Mic, Sparkles, CheckCircle2 } from "lucide-react";
import { FileUpload, UploadedFile } from "@/components/ui/advanced-file-upload";

interface UploadCardProps {
  onScriptLoaded: (text: string) => void;
  onAssetsChanged: (assetIds: string[]) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({
  onScriptLoaded,
  onAssetsChanged,
}) => {
  const [activeTab, setActiveTab] = useState<"media" | "docs" | "audio" | "logo">("media");
  const [mediaFiles, setMediaFiles] = useState<UploadedFile[]>([]);
  const [docFiles, setDocFiles] = useState<UploadedFile[]>([]);
  const [audioFiles, setAudioFiles] = useState<UploadedFile[]>([]);
  const [logoFiles, setLogoFiles] = useState<UploadedFile[]>([]);

  const handleMediaChange = (files: UploadedFile[]) => {
    setMediaFiles(files);
    const validIds = files.filter((f) => f.assetId).map((f) => f.assetId as string);
    if (logoFiles.length && logoFiles[0].assetId) {
      validIds.push(logoFiles[0].assetId);
    }
    onAssetsChanged(validIds);
  };

  const handleLogoChange = (files: UploadedFile[]) => {
    setLogoFiles(files);
    const validIds = mediaFiles.filter((f) => f.assetId).map((f) => f.assetId as string);
    if (files.length && files[0].assetId) {
      validIds.push(files[0].assetId);
    }
    onAssetsChanged(validIds);
  };

  return (
    <div className="flex flex-col h-full justify-between space-y-4">
      {/* Upload Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("media")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "media"
                ? "bg-[#ff0055] text-white shadow-md font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Film size={13} /> Clips & Photos ({mediaFiles.length}/6)
          </button>
          <button
            onClick={() => setActiveTab("docs")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "docs"
                ? "bg-[#ff0055] text-white shadow-md font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            <FileText size={13} /> PDF / DOCX / TXT ({docFiles.length}/3)
          </button>
          <button
            onClick={() => setActiveTab("audio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "audio"
                ? "bg-[#ff0055] text-white shadow-md font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Mic size={13} /> Voice Clone / Audio ({audioFiles.length}/2)
          </button>
          <button
            onClick={() => setActiveTab("logo")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "logo"
                ? "bg-[#ff0055] text-white shadow-md font-bold"
                : "text-white/60 hover:text-white"
            }`}
          >
            <ImageIcon size={13} /> Logo {logoFiles.length ? "(1)" : ""}
          </button>
        </div>

        {/* AI Role Info Badge */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#ff0055] bg-[#ff0055]/10 px-2.5 py-1 rounded-full border border-[#ff0055]/20">
          <Sparkles size={11} />
          {activeTab === "media" && "AI Scene & Visual Style Reference"}
          {activeTab === "docs" && "Auto Script & Context Extraction"}
          {activeTab === "audio" && "Neural Voice & Narration Clone"}
          {activeTab === "logo" && "Watermark & Brand Overlay"}
        </div>
      </div>

      {/* Active Tab Upload Component */}
      <div className="flex-1">
        {activeTab === "media" && (
          <FileUpload
            kind="media"
            accept="image/*,video/mp4,video/webm"
            maxSizeMB={50}
            maxFiles={6}
            files={mediaFiles}
            onFilesChange={handleMediaChange}
          />
        )}
        {activeTab === "docs" && (
          <FileUpload
            kind="script"
            accept=".pdf,.docx,.txt,.md"
            maxSizeMB={15}
            maxFiles={3}
            files={docFiles}
            onFilesChange={setDocFiles}
            onScriptLoaded={onScriptLoaded}
          />
        )}
        {activeTab === "audio" && (
          <FileUpload
            kind="media"
            accept="audio/mp3,audio/wav,audio/m4a"
            maxSizeMB={25}
            maxFiles={2}
            files={audioFiles}
            onFilesChange={setAudioFiles}
          />
        )}
        {activeTab === "logo" && (
          <FileUpload
            kind="logo"
            accept="image/png,image/jpeg,image/webp"
            maxSizeMB={5}
            maxFiles={1}
            files={logoFiles}
            onFilesChange={handleLogoChange}
          />
        )}
      </div>
    </div>
  );
};
