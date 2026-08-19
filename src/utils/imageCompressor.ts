import imageCompression from 'browser-image-compression';
import { CompressionSettings, ImageItem } from '../types';
import { getFileExtension, replaceFileExtension } from './formatters';

// Dynamic import for heic2any to avoid SSR / bundler edge cases
let heic2anyLib: any = null;
async function getHeic2Any() {
  if (!heic2anyLib) {
    try {
      const module = await import('heic2any');
      heic2anyLib = module.default || module;
    } catch (e) {
      console.warn('heic2any could not be loaded directly:', e);
    }
  }
  return heic2anyLib;
}

/**
 * Extract image natural dimensions from a File or Blob
 */
export async function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

/**
 * Handle special conversion for formats like HEIC, TIFF, BMP, GIF before primary compression
 */
async function prepareFileForCompression(file: File): Promise<{ preparedFile: File; warning?: string }> {
  const ext = getFileExtension(file.name);
  const type = file.type.toLowerCase();

  // HEIC / HEIF format conversion
  if (ext === 'heic' || ext === 'heif' || type.includes('heic') || type.includes('heif')) {
    const heic2any = await getHeic2Any();
    if (heic2any) {
      try {
        const converted = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.95,
        });
        const blob = Array.isArray(converted) ? converted[0] : converted;
        const convertedFile = new File([blob], file.name, { type: 'image/jpeg' });
        return { preparedFile: convertedFile, warning: 'Converted HEIC to high-quality JPEG for processing.' };
      } catch (err: any) {
        console.error('HEIC conversion failed:', err);
        throw new Error('Failed to decode HEIC image. The file might be corrupted or format unsupported by browser.');
      }
    }
  }

  // Static GIF handling (compression libraries often struggle with multi-frame GIFs)
  if (ext === 'gif' || type === 'image/gif') {
    return {
      preparedFile: file,
      warning: 'GIF compressed as static frame to optimize file size.',
    };
  }

  // BMP / TIFF or generic canvas conversion if needed
  if (ext === 'bmp' || ext === 'tiff' || ext === 'tif' || type.includes('bmp') || type.includes('tiff')) {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        const blob: Blob = await new Promise((res, rej) => {
          canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas to Blob failed'))), 'image/png', 0.95);
        });
        const convertedFile = new File([blob], file.name, { type: 'image/png' });
        return { preparedFile: convertedFile };
      }
    } catch {
      // fallback to original file
    }
  }

  return { preparedFile: file };
}

/**
 * Determine output MIME type, filename, and relative path based on settings
 */
export function determineOutputDetails(
  originalFile: File,
  settings: CompressionSettings,
  relativePath?: string
): { outputType: string; outputFilename: string; outputRelativePath?: string } {
  const originalName = originalFile.name;
  const originalExt = getFileExtension(originalName);
  const rawType = originalFile.type.toLowerCase();

  let targetExt = originalExt;
  let outputType = 'image/jpeg';

  // If user selected convert to WebP
  if (!settings.keepOriginalFormat && settings.convertToWebp) {
    targetExt = 'webp';
    outputType = 'image/webp';
  } else if (rawType.includes('png') || originalExt === 'png') {
    targetExt = 'png';
    outputType = 'image/png';
  } else if (rawType.includes('webp') || originalExt === 'webp') {
    targetExt = 'webp';
    outputType = 'image/webp';
  } else if (rawType.includes('gif') || originalExt === 'gif') {
    targetExt = originalExt || 'gif';
    outputType = 'image/png';
  } else if (rawType.includes('heic') || originalExt === 'heic' || originalExt === 'heif') {
    targetExt = 'jpg';
    outputType = 'image/jpeg';
  } else {
    targetExt = originalExt || 'jpg';
    outputType = 'image/jpeg';
  }

  const outputFilename = replaceFileExtension(originalName, targetExt);
  const outputRelativePath = relativePath
    ? replaceFileExtension(relativePath, targetExt)
    : undefined;

  return { outputType, outputFilename, outputRelativePath };
}

/**
 * Compress a single image item
 */
export async function compressSingleImage(
  item: ImageItem,
  settings: CompressionSettings,
  onProgress?: (progress: number) => void
): Promise<{
  blob: Blob;
  size: number;
  format: string;
  outputFilename: string;
  outputRelativePath?: string;
  width: number;
  height: number;
  warning?: string;
}> {
  const { preparedFile, warning } = await prepareFileForCompression(item.file);
  const { outputType, outputFilename, outputRelativePath } = determineOutputDetails(
    item.file,
    settings,
    item.relativePath
  );

  // If target is PNG, browser-image-compression handles PNG compression.
  // We compute normalized max width / height if requested.
  const maxWidthOrHeight = Math.max(settings.maxWidth || 0, settings.maxHeight || 0) || undefined;

  const qualityFactor = Math.max(0.01, Math.min(1, settings.quality / 100));

  const options: any = {
    maxSizeMB: Math.max(0.05, (preparedFile.size / (1024 * 1024)) * qualityFactor),
    maxWidthOrHeight: maxWidthOrHeight,
    useWebWorker: true,
    initialQuality: qualityFactor,
    fileType: outputType,
    preserveExif: !settings.stripExif,
    onProgress: (prog: number) => {
      if (onProgress) {
        onProgress(Math.min(99, Math.max(5, Math.round(prog))));
      }
    },
  };

  try {
    let compressedBlob: Blob;

    // Special case for custom PNG / WebP canvas fallback if compression library yields larger size
    if (outputType === 'image/webp') {
      compressedBlob = await imageCompression(preparedFile, {
        ...options,
        fileType: 'image/webp',
      });
    } else {
      compressedBlob = await imageCompression(preparedFile, options);
    }

    // Measure compressed dimensions
    const dimensions = await getImageDimensions(compressedBlob);

    // If the compressed size is unexpectedly larger than original (can happen with already ultra-compressed small files),
    // and format was kept original without dimension resize, we can fallback to original or keep the best result.
    if (
      compressedBlob.size > preparedFile.size &&
      !settings.maxWidth &&
      !settings.maxHeight &&
      settings.keepOriginalFormat
    ) {
      // Still return the compressed one if quality was deliberately lower, but keep original if it was smaller
      if (settings.quality >= 85) {
        const origDim = await getImageDimensions(preparedFile);
        return {
          blob: preparedFile,
          size: preparedFile.size,
          format: preparedFile.type || outputType,
          outputFilename,
          outputRelativePath,
          width: origDim.width,
          height: origDim.height,
          warning: warning || 'File was already optimized; retained best original quality.',
        };
      }
    }

    if (onProgress) onProgress(100);

    return {
      blob: compressedBlob,
      size: compressedBlob.size,
      format: outputType,
      outputFilename,
      outputRelativePath,
      width: dimensions.width,
      height: dimensions.height,
      warning,
    };
  } catch (error: any) {
    console.error('Error during imageCompression:', error);
    // Canvas fallback compression if web worker or lib failed
    try {
      const fallbackResult = await compressViaCanvasFallback(
        preparedFile,
        settings,
        outputType,
        outputFilename,
        outputRelativePath
      );
      if (onProgress) onProgress(100);
      return fallbackResult;
    } catch (fallbackError: any) {
      throw new Error(fallbackError?.message || error?.message || 'Compression failed');
    }
  }
}

/**
 * Robust canvas fallback compression
 */
async function compressViaCanvasFallback(
  file: File,
  settings: CompressionSettings,
  outputType: string,
  outputFilename: string,
  outputRelativePath?: string
): Promise<{
  blob: Blob;
  size: number;
  format: string;
  outputFilename: string;
  outputRelativePath?: string;
  width: number;
  height: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image for fallback compression'));
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Resize calculation preserving aspect ratio
        if (settings.maxWidth && width > settings.maxWidth) {
          height = Math.round((height * settings.maxWidth) / width);
          width = settings.maxWidth;
        }
        if (settings.maxHeight && height > settings.maxHeight) {
          width = Math.round((width * settings.maxHeight) / height);
          height = settings.maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        // Draw image onto canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const quality = Math.max(0.05, Math.min(1.0, settings.quality / 100));
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate image blob'));
              return;
            }
            resolve({
              blob,
              size: blob.size,
              format: outputType,
              outputFilename,
              outputRelativePath,
              width,
              height,
            });
          },
          outputType,
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Concurrency runner for processing multiple items without blocking the main UI thread
 */
export async function processQueueWithConcurrency<T>(
  items: T[],
  concurrency: number,
  workerFn: (item: T, index: number) => Promise<void>
): Promise<void> {
  const poolSize = Math.max(1, Math.min(8, concurrency));
  let currentIndex = 0;

  async function executeWorker(): Promise<void> {
    while (currentIndex < items.length) {
      const itemIndex = currentIndex++;
      const item = items[itemIndex];
      try {
        await workerFn(item, itemIndex);
      } catch (err) {
        console.error(`Worker error at index ${itemIndex}:`, err);
      }
    }
  }

  const workers = Array.from({ length: Math.min(poolSize, items.length) }, () => executeWorker());
  await Promise.all(workers);
}
