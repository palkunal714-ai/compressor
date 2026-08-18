import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageItem } from '../types';
import { generateZipFilename } from './formatters';

/**
 * Package compressed images into a single ZIP file and trigger browser download
 */
export async function createAndDownloadZip(
  items: ImageItem[],
  customZipName?: string,
  onProgress?: (percent: number) => void
): Promise<{ success: boolean; filename: string; totalItems: number }> {
  const validItems = items.filter((item) => item.status === 'done' && item.compressedBlob);

  if (validItems.length === 0) {
    throw new Error('No successfully compressed images to package into ZIP.');
  }

  const zip = new JSZip();
  const filenameCountMap = new Map<string, number>();

  for (const item of validItems) {
    if (!item.compressedBlob) continue;

    let filename = item.outputFilename || item.name;

    // Handle potential duplicate filenames in batch by adding numeric suffix before extension
    if (filenameCountMap.has(filename)) {
      const count = filenameCountMap.get(filename)! + 1;
      filenameCountMap.set(filename, count);

      const dotIdx = filename.lastIndexOf('.');
      if (dotIdx !== -1) {
        filename = `${filename.substring(0, dotIdx)} (${count})${filename.substring(dotIdx)}`;
      } else {
        filename = `${filename} (${count})`;
      }
    } else {
      filenameCountMap.set(filename, 0);
    }

    zip.file(filename, item.compressedBlob);
  }

  const zipFilename = customZipName || generateZipFilename();

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onProgress) {
        onProgress(Math.round(metadata.percent));
      }
    }
  );

  // Trigger download via file-saver
  saveAs(zipBlob, zipFilename);

  return {
    success: true,
    filename: zipFilename,
    totalItems: validItems.length,
  };
}

/**
 * Single file download helper
 */
export function downloadSingleFile(item: ImageItem): void {
  if (!item.compressedBlob) return;
  saveAs(item.compressedBlob, item.outputFilename || item.name);
}
