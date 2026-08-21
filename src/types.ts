export type MediaType = 'image' | 'video';

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  mediaType: MediaType;
  relativePath?: string; // e.g. "series-333/dial/clock.png" or "videos/demo.mp4"
  folderPath?: string; // e.g. "series-333/dial"
  originalSize: number;
  originalFormat: string;
  previewUrl: string; // Object URL for image thumbnail or video poster
  videoUrl?: string; // Object URL specifically for video playback
  duration?: number; // Duration in seconds if video
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number; // 0 to 100
  compressedBlob: Blob | null;
  compressedUrl?: string | null;
  compressedSize: number | null;
  compressedFormat: string | null;
  outputFilename: string;
  outputRelativePath?: string;
  width?: number;
  height?: number;
  compressedWidth?: number;
  compressedHeight?: number;
  error?: string | null;
  warning?: string | null;
}

export type MediaItem = ImageItem;

export interface CompressionSettings {
  quality: number; // 1 - 100, default 80
  maxWidth: number | null;
  maxHeight: number | null;
  keepOriginalFormat: boolean; // default true
  convertToWebp: boolean; // default false (for images)
  videoFps: number; // default 30 (for videos)
  muteAudio: boolean; // default false (for videos)
  concurrency: number; // default 4
  stripExif: boolean;
}

export interface BatchStats {
  totalOriginalSize: number;
  totalCompressedSize: number;
  processedCount: number;
  totalCount: number;
  savedBytes: number;
  savedPercentage: number;
  isProcessing: boolean;
  isCompleted: boolean;
}

export type ViewMode = 'grid' | 'table';
export type ThemeMode = 'light' | 'dark' | 'system';
