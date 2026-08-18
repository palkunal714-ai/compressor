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
 * Format MIME type to human-friendly tag
 */
export function formatMimeBadge(mime: string, ext?: string): string {
  const cleanMime = mime.toLowerCase();
  if (cleanMime.includes('jpeg') || cleanMime.includes('jpg')) return 'JPEG';
  if (cleanMime.includes('png')) return 'PNG';
  if (cleanMime.includes('webp')) return 'WEBP';
  if (cleanMime.includes('gif')) return 'GIF';
  if (cleanMime.includes('heic') || cleanMime.includes('heif')) return 'HEIC';
  if (cleanMime.includes('bmp')) return 'BMP';
  if (cleanMime.includes('tiff') || cleanMime.includes('tif')) return 'TIFF';
  if (cleanMime.includes('svg')) return 'SVG';
  if (ext) return ext.toUpperCase();
  return 'IMG';
}

/**
 * Generate default ZIP file name: compressed-images-YYYY-MM-DD.zip
 */
export function generateZipFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `compressed-images-${year}-${month}-${day}.zip`;
}

/**
 * Calculate saved percentage safely
 */
export function calculateSavedPercentage(original: number, compressed: number): number {
  if (original <= 0 || compressed <= 0) return 0;
  if (compressed >= original) return 0;
  return Math.round(((original - compressed) / original) * 100);
}
