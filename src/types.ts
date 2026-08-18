export interface ImageItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalFormat: string;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number; // 0 to 100
  compressedBlob: Blob | null;
  compressedSize: number | null;
  compressedFormat: string | null;
  outputFilename: string;
  width?: number;
  height?: number;
  compressedWidth?: number;
  compressedHeight?: number;
  error?: string | null;
  warning?: string | null;
}

export interface CompressionSettings {
  quality: number; // 1 - 100, default 80
  maxWidth: number | null;
  maxHeight: number | null;
  keepOriginalFormat: boolean; // default true
  convertToWebp: boolean; // default false
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
