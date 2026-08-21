import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, Image as ImageIcon, FolderUp, Plus, Loader2, FolderTree, Video } from 'lucide-react';
import {
  ScannedFileItem,
  scanFileList,
  scanDroppedDataTransfer,
  openNativeDirectoryPicker,
} from '../utils/fileScanner';

interface DropZoneProps {
  onFilesSelected: (items: ScannedFileItem[]) => void;
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
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = ['JPG', 'PNG', 'WEBP', 'MP4', 'WEBM', 'MOV', 'HEIC', 'GIF', 'MKV'];

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isScanning) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isScanning) return;

    setIsScanning(true);
    try {
      const scannedItems = await scanDroppedDataTransfer(e.dataTransfer);
      if (scannedItems.length > 0) {
        onFilesSelected(scannedItems);
      }
    } catch (err) {
      console.error('Failed to scan dropped items:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const scannedItems = scanFileList(e.target.files);
      if (scannedItems.length > 0) {
        onFilesSelected(scannedItems);
      }
      e.target.value = '';
    }
  };

  const openFileDialog = () => {
    if (!disabled && !isScanning && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const openFolderDialog = async () => {
    if (disabled || isScanning) return;

    // 1. Try modern File System Access API (Native 'Select Folder' dialog in Windows)
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      setIsScanning(true);
      try {
        const nativeItems = await openNativeDirectoryPicker();
        if (nativeItems && nativeItems.length > 0) {
          onFilesSelected(nativeItems);
          setIsScanning(false);
          return;
        }
        setIsScanning(false);
        return;
      } catch (err) {
        console.warn('Native folder selection fallback:', err);
        setIsScanning(false);
      }
    }

    // 2. Fallback to standard webkitdirectory file input
    if (folderInputRef.current) {
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
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
            : 'border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:border-slate-400 dark:hover:border-white/20'
        } ${disabled || isScanning ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.heic,.heif,.tiff,.tif,.bmp,.gif,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mkv,.avi"
          className="hidden"
          onChange={handleFileInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          // @ts-ignore
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white/90">
              {isScanning ? 'Scanning directory tree...' : 'Drag & Drop Additional Media or Folders'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-white/30 flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
              <span>Unlimited images & videos</span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400/90 font-medium flex items-center gap-0.5">
                <FolderTree className="w-2.5 h-2.5" /> Preserves folder hierarchy in ZIP
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            id="compact-add-images-btn"
            type="button"
            disabled={disabled || isScanning}
            onClick={openFileDialog}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Add Media</span>
          </button>
          <button
            id="compact-add-folder-btn"
            type="button"
            disabled={disabled || isScanning}
            onClick={openFolderDialog}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Select folder with nested subfolders"
          >
            <FolderUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Add Folder</span>
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
      className={`relative w-full rounded-2xl border-2 border-dashed transition-all p-8 sm:p-12 text-center flex flex-col items-center justify-center cursor-pointer select-none group ${
        isDragOver
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 ring-4 ring-blue-500/20 scale-[1.005]'
          : 'border-slate-300 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-slate-100/70 dark:hover:bg-white/[0.03] hover:border-slate-400 dark:hover:border-white/20 shadow-xs'
      } ${disabled || isScanning ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={openFileDialog}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,.heic,.heif,.tiff,.tif,.bmp,.gif,.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov,.mkv,.avi"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Hero Drop Icon */}
      <div
        className={`w-20 h-20 rounded-full border flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-105 ${
          isDragOver
            ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 border-blue-500'
            : isScanning
            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-500/40'
            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-white/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-300 dark:group-hover:border-blue-500/40 shadow-xs'
        }`}
      >
        {isScanning ? (
          <Loader2 className="w-10 h-10 animate-spin text-amber-500 dark:text-amber-400" />
        ) : (
          <UploadCloud className="w-10 h-10" />
        )}
      </div>

      {/* Main Title & Subtitle */}
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
        {isScanning
          ? 'Scanning Directory Hierarchy...'
          : isDragOver
          ? 'Drop Images, Videos or Folders to Load Instantly'
          : 'Drag & Drop Images, Videos or Complete Folders'}
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-white/40 max-w-md mb-6 leading-relaxed">
        Select single photos, video clips, or entire folder structures with subfolders. All nested directory trees are preserved identically in your exported ZIP archive.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3.5 mb-7" onClick={(e) => e.stopPropagation()}>
        <button
          id="select-images-primary-btn"
          type="button"
          disabled={disabled || isScanning}
          onClick={openFileDialog}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm shadow-xl shadow-blue-600/20 hover:shadow-blue-500/30 transition-all flex items-center gap-2 cursor-pointer"
        >
          <ImageIcon className="w-4 h-4" />
          <span>Select Images & Videos</span>
        </button>

        <button
          id="select-folder-btn"
          type="button"
          disabled={disabled || isScanning}
          onClick={openFolderDialog}
          className="px-6 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 active:bg-amber-200 dark:active:bg-amber-500/30 text-amber-800 dark:text-amber-300 font-bold text-sm border border-amber-300 dark:border-amber-500/30 shadow-md shadow-amber-500/5 transition-all flex items-center gap-2 cursor-pointer"
          title="Select a folder containing multiple subfolders"
        >
          <FolderUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Select Folder (With Subfolders)</span>
        </button>
      </div>

      {/* Format tags */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
        <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest mr-1">Supported:</span>
        {supportedFormats.map((fmt) => (
          <span
            key={fmt}
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-white/5 text-slate-600 dark:text-white/50 border border-slate-300/60 dark:border-white/5"
          >
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
};
