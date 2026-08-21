/**
 * Advanced file and folder scanning utility for web applications.
 * Handles single files, multi-file selections, and arbitrary-depth recursive folder trees
 * from both file inputs (webkitdirectory), File System Access API (showDirectoryPicker),
 * and Drag & Drop (FileSystemEntry API) for both IMAGES and VIDEOS.
 */

export interface ScannedFileItem {
  file: File;
  relativePath: string;
  folderPath?: string;
  mediaType?: 'image' | 'video';
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'heic',
  'heif',
  'tiff',
  'tif',
  'bmp',
  'gif',
  'avif',
  'svg',
]);

const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'webm',
  'mov',
  'mkv',
  'avi',
  'm4v',
  'ogv',
  '3gp',
]);

const IGNORED_FILES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
  '.gitkeep',
  '.gitignore',
]);

/**
 * Check if a file is a supported image or video based on extension or MIME type
 */
export function isValidMediaFile(filename: string, mimeType?: string): { isValid: boolean; mediaType: 'image' | 'video' } {
  const lowerName = filename.toLowerCase();

  // Filter out system hidden metadata files
  if (IGNORED_FILES.has(lowerName) || lowerName.startsWith('._') || lowerName.startsWith('.')) {
    return { isValid: false, mediaType: 'image' };
  }

  if (mimeType) {
    if (mimeType.startsWith('video/')) {
      return { isValid: true, mediaType: 'video' };
    }
    if (mimeType.startsWith('image/')) {
      return { isValid: true, mediaType: 'image' };
    }
  }

  const dotIdx = lowerName.lastIndexOf('.');
  if (dotIdx !== -1) {
    const ext = lowerName.slice(dotIdx + 1);
    if (SUPPORTED_VIDEO_EXTENSIONS.has(ext)) {
      return { isValid: true, mediaType: 'video' };
    }
    if (SUPPORTED_IMAGE_EXTENSIONS.has(ext)) {
      return { isValid: true, mediaType: 'image' };
    }
  }

  return { isValid: false, mediaType: 'image' };
}

/**
 * Backward compatibility alias for isValidImageFile
 */
export function isValidImageFile(filename: string, mimeType?: string): boolean {
  return isValidMediaFile(filename, mimeType).isValid;
}

/**
 * Extract clean folder path from relative path
 * e.g. "series-333/dial/clock.png" -> "series-333/dial"
 * e.g. "photo.jpg" -> undefined
 */
export function extractFolderPath(relativePath: string): string | undefined {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const lastSlashIndex = normalized.lastIndexOf('/');
  if (lastSlashIndex !== -1) {
    return normalized.substring(0, lastSlashIndex);
  }
  return undefined;
}

/**
 * Scan standard FileList or File[] (from input or folder picker)
 */
export function scanFileList(files: FileList | File[]): ScannedFileItem[] {
  const results: ScannedFileItem[] = [];
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    const check = isValidMediaFile(file.name, file.type);
    if (!check.isValid) {
      continue;
    }

    // webkitRelativePath is populated when selected via webkitdirectory
    let relativePath = file.webkitRelativePath
      ? file.webkitRelativePath.replace(/\\/g, '/')
      : file.name;

    relativePath = relativePath.replace(/^\/+/, '');
    const folderPath = extractFolderPath(relativePath);

    results.push({
      file,
      relativePath,
      folderPath,
      mediaType: check.mediaType,
    });
  }

  return results;
}

/**
 * Read all entries in a FileSystemDirectoryReader (looping until empty to bypass Chromium 100-entry limit)
 */
async function readAllEntriesFromReader(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const allEntries: FileSystemEntry[] = [];

  const readBatch = (): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
  };

  try {
    let entries = await readBatch();
    while (entries.length > 0) {
      allEntries.push(...entries);
      entries = await readBatch();
    }
  } catch (err) {
    console.warn('Error reading directory entries batch:', err);
  }

  return allEntries;
}

/**
 * Recursively scan FileSystemEntry (file or directory) to arbitrary depth
 */
async function scanFileSystemEntry(entry: FileSystemEntry, currentPath: string = ''): Promise<ScannedFileItem[]> {
  const results: ScannedFileItem[] = [];

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    try {
      const file: File = await new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });

      const check = isValidMediaFile(file.name, file.type);
      if (check.isValid) {
        const fullRelativePath = currentPath ? `${currentPath}/${file.name}` : file.name;
        const folderPath = extractFolderPath(fullRelativePath);
        results.push({
          file,
          relativePath: fullRelativePath,
          folderPath,
          mediaType: check.mediaType,
        });
      }
    } catch (err) {
      console.warn(`Could not read file entry for ${entry.name}:`, err);
    }
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const dirReader = dirEntry.createReader();
    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    const childEntries = await readAllEntriesFromReader(dirReader);
    for (const child of childEntries) {
      const childResults = await scanFileSystemEntry(child, nextPath);
      results.push(...childResults);
    }
  }

  return results;
}

/**
 * Scan items dropped into the browser via Drag & Drop, extracting entire folder trees recursively
 */
export async function scanDroppedDataTransfer(dataTransfer: DataTransfer): Promise<ScannedFileItem[]> {
  const results: ScannedFileItem[] = [];

  // 1. Try FileSystemEntry API if supported
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const items = Array.from(dataTransfer.items);
    const entryPromises: Promise<ScannedFileItem[]>[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) {
          entryPromises.push(scanFileSystemEntry(entry));
        }
      }
    }

    if (entryPromises.length > 0) {
      const scannedBatches = await Promise.all(entryPromises);
      for (const batch of scannedBatches) {
        results.push(...batch);
      }
    }
  }

  // 2. Fallback to standard dataTransfer.files if FileSystemEntry was empty or unsupported
  if (results.length === 0 && dataTransfer.files && dataTransfer.files.length > 0) {
    return scanFileList(dataTransfer.files);
  }

  return results;
}

/**
 * Recursively scan native FileSystemDirectoryHandle (File System Access API)
 */
export async function scanDirectoryHandle(
  dirHandle: FileSystemDirectoryHandle,
  currentPath: string = ''
): Promise<ScannedFileItem[]> {
  const results: ScannedFileItem[] = [];
  const folderName = dirHandle.name;
  const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;

  // @ts-ignore
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const fileHandle = entry as FileSystemFileHandle;
      try {
        const file = await fileHandle.getFile();
        const check = isValidMediaFile(file.name, file.type);
        if (check.isValid) {
          const fullRelativePath = `${folderPath}/${file.name}`;
          results.push({
            file,
            relativePath: fullRelativePath,
            folderPath: folderPath,
            mediaType: check.mediaType,
          });
        }
      } catch (err) {
        console.warn(`Could not read file from handle ${entry.name}:`, err);
      }
    } else if (entry.kind === 'directory') {
      const subDirHandle = entry as FileSystemDirectoryHandle;
      const subResults = await scanDirectoryHandle(subDirHandle, folderPath);
      results.push(...subResults);
    }
  }

  return results;
}

/**
 * Open native directory picker (where Windows shows 'Select Folder' button)
 * Returns scanned items, or null if cancelled / unsupported.
 */
export async function openNativeDirectoryPicker(): Promise<ScannedFileItem[] | null> {
  // @ts-ignore
  if (typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function') {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read',
      });
      if (dirHandle) {
        return await scanDirectoryHandle(dirHandle);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // User cancelled folder selection
        return null;
      }
      console.warn('Native showDirectoryPicker failed, fallback to input:', err);
    }
  }
  return null;
}

/**
 * Extract summary of folder hierarchy (e.g. number of distinct folders)
 */
export function getFolderHierarchySummary(items: ScannedFileItem[] | { folderPath?: string }[]): {
  distinctFoldersCount: number;
  rootFolders: string[];
} {
  const folderSet = new Set<string>();
  const rootFolderSet = new Set<string>();

  for (const item of items) {
    if (item.folderPath) {
      folderSet.add(item.folderPath);
      const root = item.folderPath.split('/')[0];
      if (root) rootFolderSet.add(root);
    }
  }

  return {
    distinctFoldersCount: folderSet.size,
    rootFolders: Array.from(rootFolderSet),
  };
}
