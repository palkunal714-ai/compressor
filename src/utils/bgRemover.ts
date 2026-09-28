import { removeBackground } from '@imgly/background-removal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageItem, CompressionSettings } from '../types';
import { removeStudioBackground } from './fastBgRemover';

export interface BgRemovalBatchOptions {
  engine?: 'studio' | 'ai';
  tolerance?: number;
  feather?: number;
  aiModel?: 'small' | 'medium';
  aiDevice?: 'gpu' | 'cpu';
  concurrency?: number;
}

/**
 * Remove background from a single image file, returning a transparent PNG blob.
 * Automatically chooses between ultra-fast Studio mode (canvas edge-flood) and deep learning AI (ISNet).
 */
export async function removeImageBackground(
  file: File | Blob,
  options: BgRemovalBatchOptions = {},
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const engine = options.engine ?? 'studio';

  if (engine === 'studio') {
    if (onProgress) onProgress(30);
    const blob = await removeStudioBackground(file, {
      tolerance: options.tolerance ?? 32,
      feather: options.feather ?? 1.5,
      defringe: true,
    });
    if (onProgress) onProgress(100);
    return blob;
  }

  // AI Deep Learning mode (@imgly)
  const modelName = options.aiModel === 'medium' ? 'isnet_fp16' : 'isnet_quint8';
  const blob = await removeBackground(file, {
    model: modelName,
    device: options.aiDevice ?? 'gpu',
    progress: (key: string, current: number, total: number) => {
      if (onProgress && total > 0) {
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
  settings: Partial<CompressionSettings> = {},
  onItemStart?: (itemId: string) => void,
  onItemProgress?: (itemId: string, progress: number) => void,
  onItemDone?: (itemId: string, resultBlob: Blob) => void,
  onItemError?: (itemId: string, error: string) => void,
  onZipProgress?: (percent: number) => void,
  isCancelled?: () => boolean,
  autoDownloadZip: boolean = false
): Promise<{ success: boolean; filename: string; totalItems: number }> {
  // Filter to only images (bg removal doesn't apply to video)
  const imageItems = items.filter(
    (it) => it.mediaType === 'image'
  );

  if (imageItems.length === 0) {
    throw new Error('No images found in the queue for background removal.');
  }

  const results: Map<string, { blob: Blob; path: string }> = new Map();
  const engine = settings.bgEngine ?? 'studio';

  // Concurrency strategy:
  // For Studio mode: Canvas 2D is lightweight and can run 4 parallel workers.
  // For AI mode: MUST be strictly 1 worker. ONNX Web does not support concurrent inference
  // on the same session (will throw "Session already started" or crash with memory corruption).
  const poolSize = engine === 'studio'
    ? Math.max(1, Math.min(6, settings.concurrency ?? 4))
    : 1;

  let currentIndex = 0;

  async function worker(): Promise<void> {
    while (currentIndex < imageItems.length) {
      if (isCancelled?.()) return;
      const idx = currentIndex++;
      const item = imageItems[idx];

      if (onItemStart) onItemStart(item.id);

      try {
        const resultBlob = await removeImageBackground(
          item.file,
          {
            engine,
            tolerance: settings.bgTolerance ?? 32,
            feather: settings.bgFeather ?? 1.5,
            aiModel: settings.bgAiModel ?? 'small',
            aiDevice: settings.bgAiDevice ?? 'gpu',
          },
          (progress) => {
            if (onItemProgress) onItemProgress(item.id, progress);
          }
        );

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

        // Micro-yield to browser event loop so UI stays 60fps responsive
        await new Promise((r) => setTimeout(r, 12));
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

  if (isCancelled?.()) {
    throw new Error('Background removal was stopped by user.');
  }

  if (results.size === 0) {
    throw new Error('All background removal attempts failed. No images to package.');
  }

  // Only package and auto-download ZIP if explicitly requested
  if (autoDownloadZip) {
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

  return {
    success: true,
    filename: '',
    totalItems: results.size,
  };
}

export const batchRemoveBg = batchRemoveBgAndZip;

