import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, Image as ImageIcon, FolderUp, Plus } from 'lucide-react';
import { formatMimeBadge } from '../utils/formatters';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  totalImages?: number;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  disabled = false,
  compact = false,
  totalImages = 0,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = ['JPG', 'PNG', 'WEBP', 'HEIC', 'GIF', 'BMP', 'TIFF'];

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files);
      onFilesSelected(fileList);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      onFilesSelected(fileList);
      e.target.value = '';
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const openFolderDialog = () => {
    if (!disabled && folderInputRef.current) {
      folderInputRef.current.click();
    }
  };

  if (compact) {
    return (
      <div
        id="compact-drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        className={`w-full py-3.5 px-5 rounded-xl border border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left ${
          isDragOver
            ? 'border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/20'
            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20'
        } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif,.tiff,.tif,.bmp,.gif,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Plus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-white/90">
              Drag & Drop Additional Images or Folders
            </div>
            <div className="text-[10px] text-white/30">
              Unlimited batch size • Processing remains 100% local
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={openFileDialog}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all"
          >
            Add Images
          </button>
          <button
            type="button"
            onClick={openFolderDialog}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 transition-colors"
          >
            Add Folder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="main-drop-zone"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full rounded-2xl border-2 border-dashed transition-all p-8 sm:p-14 text-center flex flex-col items-center justify-center cursor-pointer select-none group ${
        isDragOver
          ? 'border-blue-500 bg-blue-950/20 ring-4 ring-blue-500/20 scale-[1.005]'
          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/20'
      } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={openFileDialog}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.heic,.heif,.tiff,.tif,.bmp,.gif,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hero Drop Icon */}
      <div className={`w-20 h-20 rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/10 flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-105 ${
        isDragOver
          ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30'
          : 'text-white/40 group-hover:text-blue-400 group-hover:border-blue-500/40'
      }`}>
        <UploadCloud className="w-10 h-10" />
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
        {isDragOver ? 'Drop images to load instantly' : 'Drag & Drop Images or Folders'}
      </h2>
      <p className="text-xs sm:text-sm text-white/40 max-w-md mb-6 leading-relaxed">
        Unlimited file batching • Max 50 MB per file recommended • Fully processed within your browser sandbox
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8" onClick={(e) => e.stopPropagation()}>
        <button
          id="select-images-primary-btn"
          type="button"
          disabled={disabled}
          onClick={openFileDialog}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 transition-all flex items-center gap-2"
        >
          <ImageIcon className="w-4 h-4" />
          Select Images
        </button>

        <button
          id="select-folder-btn"
          type="button"
          disabled={disabled}
          onClick={openFolderDialog}
          className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 font-semibold text-sm border border-white/10 transition-all flex items-center gap-2"
          title="Select an entire folder of images"
        >
          <FolderUp className="w-4 h-4 text-white/40" />
          Select Folder
        </button>
      </div>

      {/* Format tags */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
        <span className="text-[10px] text-white/30 uppercase tracking-widest mr-1">Formats:</span>
        {supportedFormats.map((fmt) => (
          <span
            key={fmt}
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/5"
          >
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
};
