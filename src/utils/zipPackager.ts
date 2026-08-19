import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ImageItem } from '../types';
import { generateZipFilename } from './formatters';

/**
 * Package compressed images into a single ZIP file preserving exact folder structures and trigger browser download
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
  const pathCountMap = new Map<string, number>();

  for (const item of validItems) {
    if (!item.compressedBlob) continue;

    // Use outputRelativePath (folder/subfolder/filename.ext) if available, or relativePath, or outputFilename
    let targetPath = (
      item.outputRelativePath ||
      item.relativePath ||
      item.outputFilename ||
      item.name
    ).replace(/\\/g, '/');

    // Strip leading slashes to prevent root-level absolute path issues
    targetPath = targetPath.replace(/^\/+/, '');

    // Handle potential duplicate file paths in batch by adding numeric suffix before extension
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

    // JSZip automatically creates intermediate folders when a path containing '/' is passed
    zip.file(targetPath, item.compressedBlob);
  }

  // Smart naming: if all files share a common root folder, name it after that folder
  let zipFilename = customZipName;
  if (!zipFilename) {
    const rootFolders = new Set<string>();
    for (const item of validItems) {
      if (item.folderPath) {
        const root = item.folderPath.split('/')[0];
        if (root) rootFolders.add(root);
      }
    }
    if (rootFolders.size === 1) {
      const singleRoot = Array.from(rootFolders)[0];
      zipFilename = `${singleRoot}-compressed.zip`;
    } else {
      zipFilename = generateZipFilename();
    }
  }

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
