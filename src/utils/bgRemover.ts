import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageItem } from '../types';

/**
 * Remove background from a single image file, returning a transparent PNG blob.
 * Uses @imgly/background-removal which runs an AI segmentation model entirely in-browser.
 */
export async function removeImageBackground(
  file: File | Blob,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const blob = await removeBackground(file, {
    progress: (key: string, current: number, total: number) => {
      if (onProgress && total > 0) {
        // The library reports multiple phases; we normalize to 0–100
        const percent = Math.round((current / total) * 100);
        onProgress(Math.min(99, percent));
      }
    },
  });
  if (onProgress) onProgress(100);
  return blob;
}

/**
 * Batch remove backgrounds from all image items, package into ZIP preserving folder structure.
 * Videos are skipped — only images are processed.
 */
export async function batchRemoveBgAndZip(
  items: ImageItem[],
  concurrency: number,
  onItemStart?: (itemId: string) => void,
  onItemProgress?: (itemId: string, progress: number) => void,
  onItemDone?: (itemId: string, resultBlob: Blob) => void,
  onItemError?: (itemId: string, error: string) => void,
  onZipProgress?: (percent: number) => void,
  isCancelled?: () => boolean
): Promise<{ success: boolean; filename: string; totalItems: number }> {
  // Filter to only images (bg removal doesn't apply to video)
  const imageItems = items.filter(
    (it) => it.mediaType === 'image'
  );

  if (imageItems.length === 0) {
    throw new Error('No images found in the queue for background removal.');
  }

  const results: Map<string, { blob: Blob; path: string }> = new Map();

  // Process items with concurrency
  const poolSize = Math.max(1, Math.min(4, concurrency)); // Cap at 4 for bg removal (heavy)
  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < imageItems.length) {
      if (isCancelled?.()) return;
      const idx = currentIndex++;
      const item = imageItems[idx];

      if (onItemStart) onItemStart(item.id);

      try {
        const resultBlob = await removeImageBackground(item.file, (progress) => {
          if (onItemProgress) onItemProgress(item.id, progress);
        });

        // Build the output path: keep folder structure, force PNG extension for transparency
        let outputPath = (
          item.relativePath ||
          item.name
        ).replace(/\\/g, '/').replace(/^\/+/, '');

        // Force .png extension since the output is always transparent PNG
        const dotIdx = outputPath.lastIndexOf('.');
        if (dotIdx !== -1) {
          outputPath = outputPath.substring(0, dotIdx) + '.png';
        } else {
          outputPath += '.png';
        }

        results.set(item.id, { blob: resultBlob, path: outputPath });
        if (onItemDone) onItemDone(item.id, resultBlob);
      } catch (err: any) {
        console.error(`BG removal failed for ${item.name}:`, err);
        if (onItemError) onItemError(item.id, err?.message || 'Background removal failed');
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(poolSize, imageItems.length) },
    () => worker()
  );
  await Promise.all(workers);

  // Package into ZIP
  if (results.size === 0) {
    throw new Error('All background removal attempts failed. No images to package.');
  }

  const zip = new JSZip();
  const pathCountMap = new Map<string, number>();

  for (const [, { blob, path }] of results) {
    let targetPath = path;

    // Handle potential duplicate paths
    if (pathCountMap.has(targetPath)) {
      const count = pathCountMap.get(targetPath)! + 1;
      pathCountMap.set(targetPath, count);
      const dotIdx = targetPath.lastIndexOf('.');
      if (dotIdx !== -1) {
        targetPath = `${targetPath.substring(0, dotIdx)} (${count})${targetPath.substring(dotIdx)}`;
      } else {
        targetPath = `${targetPath} (${count})`;
      }
    } else {
      pathCountMap.set(targetPath, 0);
    }

    zip.file(targetPath, blob);
  }

  // Generate ZIP filename
  const rootFolders = new Set<string>();
  for (const item of imageItems) {
    if (item.folderPath) {
      const root = item.folderPath.split('/')[0];
      if (root) rootFolders.add(root);
    }
  }

  let zipFilename: string;
  if (rootFolders.size === 1) {
    const singleRoot = Array.from(rootFolders)[0];
    zipFilename = `${singleRoot}-bg-removed.zip`;
  } else {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    zipFilename = `bg-removed-${y}-${m}-${d}.zip`;
  }

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      if (onZipProgress) {
        onZipProgress(Math.round(metadata.percent));
      }
    }
  );

  saveAs(zipBlob, zipFilename);

  return {
    success: true,
    filename: zipFilename,
    totalItems: results.size,
  };
}
