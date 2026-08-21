/**
 * Format raw bytes into human readable binary/decimal sizes (KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

/**
 * Format seconds into mm:ss or hh:mm:ss duration
 */
export function formatDuration(seconds?: number): string {
  if (seconds === undefined || isNaN(seconds) || seconds < 0) return '0:00';
  const totalSeconds = Math.round(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get file extension in lowercase without leading dot
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  if (parts.length <= 1) return '';
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Replace or append extension
 */
export function replaceFileExtension(filename: string, newExt: string): string {
  const cleanExt = newExt.startsWith('.') ? newExt.slice(1) : newExt;
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return `${filename}.${cleanExt}`;
  }
  return `${filename.substring(0, lastDotIndex)}.${cleanExt}`;
}

/**
 * Format MIME type or extension to human-friendly tag
 */
export function formatMimeBadge(mime: string, ext?: string): string {
  const cleanMime = (mime || '').toLowerCase();
  const cleanExt = (ext || '').toLowerCase();

  // Video formats
  if (cleanMime.includes('mp4') || cleanExt === 'mp4' || cleanExt === 'm4v') return 'MP4';
  if (cleanMime.includes('webm') || cleanExt === 'webm') return 'WEBM';
  if (cleanMime.includes('quicktime') || cleanExt === 'mov') return 'MOV';
  if (cleanMime.includes('matroska') || cleanExt === 'mkv') return 'MKV';
  if (cleanMime.includes('avi') || cleanExt === 'avi') return 'AVI';
  if (cleanMime.startsWith('video/')) return 'VIDEO';

  // Image formats
  if (cleanMime.includes('jpeg') || cleanMime.includes('jpg') || cleanExt === 'jpg' || cleanExt === 'jpeg') return 'JPEG';
  if (cleanMime.includes('png') || cleanExt === 'png') return 'PNG';
  if (cleanMime.includes('webp') || cleanExt === 'webp') return 'WEBP';
  if (cleanMime.includes('gif') || cleanExt === 'gif') return 'GIF';
  if (cleanMime.includes('heic') || cleanMime.includes('heif') || cleanExt === 'heic' || cleanExt === 'heif') return 'HEIC';
  if (cleanMime.includes('bmp') || cleanExt === 'bmp') return 'BMP';
  if (cleanMime.includes('tiff') || cleanMime.includes('tif') || cleanExt === 'tiff' || cleanExt === 'tif') return 'TIFF';
  if (cleanMime.includes('svg') || cleanExt === 'svg') return 'SVG';
  if (cleanMime.includes('avif') || cleanExt === 'avif') return 'AVIF';

  if (ext) return ext.toUpperCase();
  return 'FILE';
}

/**
 * Generate default ZIP file name: compressed-media-YYYY-MM-DD.zip
 */
export function generateZipFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `compressed-media-${year}-${month}-${day}.zip`;
}

/**
 * Calculate saved percentage safely
 */
export function calculateSavedPercentage(original: number, compressed: number): number {
  if (original <= 0 || compressed <= 0) return 0;
  if (compressed >= original) return 0;
  return Math.round(((original - compressed) / original) * 100);
}
