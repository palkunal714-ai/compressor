import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { SettingsPanel } from './components/SettingsPanel';
import { DropZone } from './components/DropZone';
import { StatsBar } from './components/StatsBar';
import { ImageCard } from './components/ImageCard';
import { ImageTableRow } from './components/ImageTableRow';
import { ImageComparisonModal } from './components/ImageComparisonModal';
import { EmptyState } from './components/EmptyState';
import { ToastContainer, ToastItem } from './components/ToastContainer';
import { ImageItem, CompressionSettings, BatchStats, ViewMode } from './types';
import { formatBytes } from './utils/formatters';
import { compressSingleImage, getImageDimensions, processQueueWithConcurrency } from './utils/imageCompressor';
import { compressSingleVideo, generateVideoThumbnail, getVideoMetadata } from './utils/videoCompressor';
import { createAndDownloadZip, downloadSingleFile } from './utils/zipPackager';
import { generateSampleImages } from './utils/sampleGenerator';
import { ScannedFileItem, extractFolderPath, getFolderHierarchySummary, isValidMediaFile } from './utils/fileScanner';
import { batchRemoveBgAndZip } from './utils/bgRemover';

const DEFAULT_SETTINGS: CompressionSettings = {
  quality: 80,
  maxWidth: null,
  maxHeight: null,
  keepOriginalFormat: true,
  convertToWebp: false,
  videoFps: 30,
  muteAudio: false,
  concurrency: 4,
  stripExif: true,
};

const SETTINGS_STORAGE_KEY = 'bulk_compressor_settings_v2';
const THEME_STORAGE_KEY = 'bulk_compressor_theme_v2';
const VIEW_STORAGE_KEY = 'bulk_compressor_view_v2';

export default function App() {
  // --- States ---
  const [images, setImages] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<CompressionSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved) return saved === 'dark';
      return true; // Default to dark theme
    } catch {
      return true;
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      return (saved as ViewMode) || 'grid';
    } catch {
      return 'grid';
    }
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [activePreviewItem, setActivePreviewItem] = useState<ImageItem | null>(null);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Background removal state
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemovalProgress, setBgRemovalProgress] = useState(0);
  const [bgRemovalItemsDone, setBgRemovalItemsDone] = useState(0);
  const [bgRemovalItemsTotal, setBgRemovalItemsTotal] = useState(0);

  const isCancelledRef = useRef(false);

  // Theme sync
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [darkMode]);

  // Settings sync
  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // View mode sync
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Toast notification helper
  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration || 5000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // --- Add Files or Folders to Batch ---
  const handleFilesSelected = useCallback(
    async (incoming: (File | ScannedFileItem)[]) => {
      if (incoming.length === 0) return;

      const largeFiles: string[] = [];
      const newItems: ImageItem[] = [];

      for (const item of incoming) {
        let file: File;
        let relativePath: string;
        let folderPath: string | undefined;
        let mediaType: 'image' | 'video' = 'image';

        if ('file' in item && 'relativePath' in item) {
          file = item.file;
          relativePath = item.relativePath;
          folderPath = item.folderPath;
          mediaType = item.mediaType || isValidMediaFile(file.name, file.type).mediaType;
        } else {
          file = item as File;
          relativePath = file.webkitRelativePath
            ? file.webkitRelativePath.replace(/\\/g, '/')
            : file.name;
          relativePath = relativePath.replace(/^\/+/, '');
          folderPath = extractFolderPath(relativePath);
          mediaType = isValidMediaFile(file.name, file.type).mediaType;
        }

        if (file.size > 80 * 1024 * 1024) {
          largeFiles.push(file.name);
        }

        const previewUrl = mediaType === 'image' ? URL.createObjectURL(file) : '';
        const imageItem: ImageItem = {
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          name: file.name,
          mediaType,
          relativePath,
          folderPath,
          originalSize: file.size,
          originalFormat: file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
          previewUrl,
          status: 'pending',
          progress: 0,
          compressedBlob: null,
          compressedSize: null,
          compressedFormat: null,
          outputFilename: file.name,
          outputRelativePath: relativePath,
        };

        newItems.push(imageItem);
      }

      // Populate metadata in background
      newItems.forEach(async (item) => {
        if (item.mediaType === 'video') {
          const [meta, thumb] = await Promise.all([
            getVideoMetadata(item.file),
            generateVideoThumbnail(item.file),
          ]);
          setImages((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    width: meta.width,
                    height: meta.height,
                    duration: meta.duration,
                    previewUrl: thumb || it.previewUrl,
                  }
                : it
            )
          );
        } else {
          const dim = await getImageDimensions(item.file);
          setImages((prev) =>
            prev.map((it) => (it.id === item.id ? { ...it, width: dim.width, height: dim.height } : it))
          );
        }
      });

      setImages((prev) => [...prev, ...newItems]);

      const summary = getFolderHierarchySummary(newItems);
      const videoCount = newItems.filter((it) => it.mediaType === 'video').length;
      const imageCount = newItems.length - videoCount;

      if (summary.distinctFoldersCount > 0) {
        const rootList = summary.rootFolders.slice(0, 3).join(', ');
        const extra = summary.rootFolders.length > 3 ? ` +${summary.rootFolders.length - 3} more` : '';
        addToast({
          type: 'success',
          title: `Mapped ${newItems.length} items across ${summary.distinctFoldersCount} folder(s)`,
          message: `Folder hierarchy preserved (${rootList}${extra}). Output archive will mirror nested directory trees.`,
          duration: 5000,
        });
      } else if (largeFiles.length > 0) {
        addToast({
          type: 'warning',
          title: 'Large files detected',
          message: `${largeFiles.length} file(s) over 80 MB detected. In-browser processing may take slightly longer.`,
          duration: 6000,
        });
      } else {
        const desc = videoCount > 0 && imageCount > 0
          ? `${imageCount} image(s) and ${videoCount} video(s)`
          : videoCount > 0
          ? `${videoCount} video(s)`
          : `${imageCount} image(s)`;

        addToast({
          type: 'info',
          title: `Added ${desc}`,
          message: 'Ready for batch compression.',
          duration: 3000,
        });
      }
    },
    [addToast]
  );

  // --- Remove Single Media Item ---
  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target && target.previewUrl && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((it) => it.id !== id);
    });
  }, []);

  // --- Clear Queue ---
  const handleClearAll = useCallback(() => {
    images.forEach((it) => {
      if (it.previewUrl && it.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(it.previewUrl);
      }
    });
    setImages([]);
    addToast({
      type: 'info',
      title: 'Queue Cleared',
      message: 'All items removed from batch.',
      duration: 3000,
    });
  }, [images, addToast]);

  // --- Reset Settings ---
  const handleResetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    addToast({
      type: 'info',
      title: 'Settings Reset',
      message: 'Defaults restored (80% Quality, Original Format).',
      duration: 3000,
    });
  }, [addToast]);

  // --- Compress Single Item (Image or Video) ---
  const handleCompressItem = useCallback(
    async (item: ImageItem, currentSettings: CompressionSettings) => {
      setImages((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: 'processing', progress: 5, error: null } : it
        )
      );

      try {
        if (item.mediaType === 'video') {
          const result = await compressSingleVideo(item, currentSettings, (progress) => {
            setImages((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, progress } : it))
            );
          });

          setImages((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'done',
                    progress: 100,
                    compressedBlob: result.blob,
                    compressedSize: result.size,
                    compressedFormat: result.format,
                    outputFilename: result.outputFilename,
                    outputRelativePath: result.outputRelativePath,
                    compressedWidth: result.width,
                    compressedHeight: result.height,
                    warning: result.warning || null,
                    error: null,
                  }
                : it
            )
          );
        } else {
          const result = await compressSingleImage(item, currentSettings, (progress) => {
            setImages((prev) =>
              prev.map((it) => (it.id === item.id ? { ...it, progress } : it))
            );
          });

          setImages((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? {
                    ...it,
                    status: 'done',
                    progress: 100,
                    compressedBlob: result.blob,
                    compressedSize: result.size,
                    compressedFormat: result.format,
                    outputFilename: result.outputFilename,
                    outputRelativePath: result.outputRelativePath,
                    compressedWidth: result.width,
                    compressedHeight: result.height,
                    warning: result.warning || null,
                    error: null,
                  }
                : it
            )
          );
        }
      } catch (err: any) {
        console.error(`Error compressing ${item.name}:`, err);
        setImages((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: 'error',
                  progress: 0,
                  error: err?.message || 'Compression failed',
                }
              : it
          )
        );
      }
    },
    []
  );

  // --- Trigger ZIP Generation & Download ---
  const triggerZipDownload = useCallback(
    async (currentImages?: ImageItem[]) => {
      const targetImages = currentImages || images;
      const validItems = targetImages.filter((it) => it.status === 'done' && it.compressedBlob);

      if (validItems.length === 0) {
        addToast({
          type: 'warning',
          title: 'No Compressed Media',
          message: 'Please compress items before generating the ZIP archive.',
        });
        return;
      }

      setIsZipping(true);
      setZipProgress(0);

      try {
        const zipResult = await createAndDownloadZip(validItems, undefined, (percent) => {
          setZipProgress(percent);
        });

        setIsZipping(false);

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 75,
            origin: { y: 0.7 },
          });
        } catch {
          // ignore
        }

        const totalOrig = validItems.reduce((acc, it) => acc + it.originalSize, 0);
        const totalComp = validItems.reduce((acc, it) => acc + (it.compressedSize || it.originalSize), 0);
        const savedBytes = Math.max(0, totalOrig - totalComp);
        const savedPercent = totalOrig > 0 ? Math.round((savedBytes / totalOrig) * 100) : 0;

        addToast({
          type: 'success',
          title: 'ZIP Archive Downloaded',
          message: `Saved ${formatBytes(savedBytes)} (${savedPercent}%) across ${zipResult.totalItems} files.`,
          duration: 7000,
        });
      } catch (err: any) {
        console.error('ZIP generation failed:', err);
        setIsZipping(false);
        addToast({
          type: 'error',
          title: 'ZIP Creation Failed',
          message: err?.message || 'Could not assemble the ZIP file.',
        });
      }
    },
    [images, addToast]
  );

  // --- Compress All Batch ---
  const handleCompressAll = useCallback(
    async (autoDownloadZipAfter: boolean = false) => {
      if (images.length === 0 || isProcessing) return;

      isCancelledRef.current = false;
      setIsProcessing(true);

      const itemsToProcess = images.map((it) => ({
        ...it,
        status: 'pending' as const,
        progress: 0,
      }));
      setImages(itemsToProcess);

      try {
        await processQueueWithConcurrency(itemsToProcess, settings.concurrency, async (item) => {
          if (isCancelledRef.current) return;
          await handleCompressItem(item, settings);
        });

        setIsProcessing(false);

        if (autoDownloadZipAfter && !isCancelledRef.current) {
          setImages((latestImages) => {
            const completedItems = latestImages.filter((it) => it.status === 'done' && it.compressedBlob);
            if (completedItems.length > 0) {
              triggerZipDownload(latestImages);
            }
            return latestImages;
          });
        }
      } catch (error: any) {
        console.error('Batch compression failed:', error);
        setIsProcessing(false);
        addToast({
          type: 'error',
          title: 'Batch Error',
          message: error?.message || 'An error occurred during batch processing.',
        });
      }
    },
    [images, isProcessing, settings, handleCompressItem, triggerZipDownload, addToast]
  );

  // --- Cancel Processing ---
  const handleCancelProcessing = useCallback(() => {
    isCancelledRef.current = true;
    setIsProcessing(false);
    addToast({
      type: 'info',
      title: 'Batch Cancelled',
      message: 'Processing stopped by user.',
      duration: 3000,
    });
  }, [addToast]);

  // --- Load Demo Synthetic Samples ---
  const handleLoadSamples = useCallback(async () => {
    setIsLoadingSamples(true);
    try {
      const sampleFiles = await generateSampleImages(true);
      await handleFilesSelected(sampleFiles);
    } catch (err) {
      console.error('Failed to generate samples:', err);
      addToast({
        type: 'error',
        title: 'Could not load samples',
      });
    } finally {
      setIsLoadingSamples(false);
    }
  }, [handleFilesSelected, addToast]);

  // --- Background Removal & ZIP ---
  const handleRemoveBgAndZip = useCallback(async () => {
    const imageOnlyItems = images.filter((it) => it.mediaType === 'image');
    if (imageOnlyItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Images Found',
        message: 'Background removal only works on images. Add some images to the queue first.',
      });
      return;
    }

    if (isRemovingBg || isProcessing) return;

    setIsRemovingBg(true);
    setBgRemovalProgress(0);
    setBgRemovalItemsDone(0);
    setBgRemovalItemsTotal(imageOnlyItems.length);

    addToast({
      type: 'info',
      title: 'Background Removal Started',
      message: `Processing ${imageOnlyItems.length} image(s). The AI model will load on first use (~30s).`,
      duration: 6000,
    });

    try {
      const result = await batchRemoveBgAndZip(
        images,
        settings.concurrency,
        // onItemStart
        (itemId) => {
          setBgRemovalProgress(0);
        },
        // onItemProgress
        (itemId, progress) => {
          setBgRemovalProgress(progress);
        },
        // onItemDone
        (itemId, resultBlob) => {
          setBgRemovalItemsDone((prev) => prev + 1);
        },
        // onItemError
        (itemId, error) => {
          setBgRemovalItemsDone((prev) => prev + 1);
        },
        // onZipProgress
        (percent) => {
          setBgRemovalProgress(percent);
        },
        // isCancelled
        () => isCancelledRef.current
      );

      setIsRemovingBg(false);

      // Confetti celebration
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#d946ef', '#a855f7', '#ec4899', '#f472b6'],
        });
      } catch {
        // ignore
      }

      addToast({
        type: 'success',
        title: 'Background Removed & ZIP Downloaded',
        message: `${result.totalItems} transparent PNG(s) packaged into ${result.filename}`,
        duration: 7000,
      });
    } catch (err: any) {
      console.error('BG removal failed:', err);
      setIsRemovingBg(false);
      addToast({
        type: 'error',
        title: 'Background Removal Failed',
        message: err?.message || 'An error occurred during background removal.',
      });
    }
  }, [images, isRemovingBg, isProcessing, settings.concurrency, addToast]);

  // --- Batch Stats Calculations ---
  const totalOriginalSize = images.reduce((acc, it) => acc + it.originalSize, 0);
  const doneImages = images.filter((it) => it.status === 'done' && it.compressedSize !== null);
  const totalCompressedSize = doneImages.reduce((acc, it) => acc + (it.compressedSize || 0), 0);
  const processedCount = doneImages.length;
  const totalCount = images.length;
  const savedBytes = Math.max(0, totalOriginalSize - totalCompressedSize);
  const savedPercentage =
    totalOriginalSize > 0 && totalCompressedSize > 0
      ? Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100)
      : 0;

  const isCompleted = totalCount > 0 && processedCount === totalCount && !isProcessing;

  const batchStats: BatchStats = {
    totalOriginalSize,
    totalCompressedSize,
    processedCount,
    totalCount,
    savedBytes,
    savedPercentage,
    isProcessing,
    isCompleted,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-[#050505] text-slate-900 dark:text-white font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Top Header */}
      <Header
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        totalImages={images.length}
        onClearAll={handleClearAll}
        isProcessing={isProcessing}
      />

      {/* Main App Layout: Sidebar + Canvas Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Settings Sidebar */}
        <SettingsPanel
          settings={settings}
          onChangeSettings={setSettings}
          onResetSettings={handleResetSettings}
          disabled={isProcessing || isZipping}
          className="w-full lg:w-76 shrink-0"
        />

        {/* Center Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto">
          {images.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center">
              <DropZone
                onFilesSelected={handleFilesSelected}
                disabled={isProcessing}
                compact={false}
              />
              <EmptyState
                onLoadSamples={handleLoadSamples}
                isLoadingSamples={isLoadingSamples}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Compact Drop Zone Banner */}
              <DropZone
                onFilesSelected={handleFilesSelected}
                disabled={isProcessing}
                compact={true}
                totalImages={images.length}
              />

              {/* Grid / Table Workspace Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                    Active Queue ({images.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-white/30 hidden sm:inline">
                  Select card and press <kbd className="font-mono text-slate-700 dark:text-white/60 bg-slate-200 dark:bg-white/5 px-1 py-0.5 rounded border border-slate-300 dark:border-white/10">Delete</kbd> to remove
                </span>
              </div>

              {/* View Rendering */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {images.map((item) => (
                    <ImageCard
                      key={item.id}
                      item={item}
                      onRemove={handleRemoveImage}
                      onDownload={downloadSingleFile}
                      onPreview={setActivePreviewItem}
                      onRetry={(it) => handleCompressItem(it, settings)}
                      disabled={isProcessing}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#0c0c0c] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-xl transition-colors">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#080808] text-[10px] font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest">
                          <th className="py-3 px-4">Media Details</th>
                          <th className="py-3 px-3">Original Size</th>
                          <th className="py-3 px-3">Compressed</th>
                          <th className="py-3 px-3">Reduction</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {images.map((item) => (
                          <ImageTableRow
                            key={item.id}
                            item={item}
                            onRemove={handleRemoveImage}
                            onDownload={downloadSingleFile}
                            onPreview={setActivePreviewItem}
                            onRetry={(it) => handleCompressItem(it, settings)}
                            disabled={isProcessing}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Sticky Bottom Stats & Action Bar */}
      {images.length > 0 && (
        <StatsBar
          stats={batchStats}
          folderCount={getFolderHierarchySummary(images).distinctFoldersCount}
          onCompressAndDownload={() => handleCompressAll(true)}
          onCompressAll={() => handleCompressAll(false)}
          onDownloadZip={() => triggerZipDownload()}
          onCancelProcessing={handleCancelProcessing}
          isZipping={isZipping}
          zipProgress={zipProgress}
          onRemoveBgAndZip={handleRemoveBgAndZip}
          isRemovingBg={isRemovingBg}
          bgRemovalProgress={bgRemovalProgress}
          bgRemovalItemsDone={bgRemovalItemsDone}
          bgRemovalItemsTotal={bgRemovalItemsTotal}
        />
      )}

      {/* Comparison Modal */}
      {activePreviewItem && (
        <ImageComparisonModal
          item={activePreviewItem}
          onClose={() => setActivePreviewItem(null)}
          onDownload={downloadSingleFile}
        />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
