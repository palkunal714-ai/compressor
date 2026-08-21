import { CompressionSettings, ImageItem } from '../types';
import { getFileExtension, replaceFileExtension } from './formatters';

/**
 * Extract natural dimensions and duration from a Video file or Blob
 */
export async function getVideoMetadata(
  file: File | Blob
): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const duration = isFinite(video.duration) ? video.duration : 0;
      cleanup();
      resolve({ width, height, duration });
    };

    video.onerror = () => {
      cleanup();
      resolve({ width: 0, height: 0, duration: 0 });
    };

    video.src = url;
  });
}

/**
 * Generate a sharp poster thumbnail image from the video
 */
export async function generateVideoThumbnail(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let resolved = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    const captureFrame = () => {
      if (resolved) return;
      resolved = true;
      try {
        const targetWidth = Math.min(480, video.videoWidth || 480);
        const aspect = (video.videoHeight || 270) / (video.videoWidth || 480);
        const targetHeight = Math.round(targetWidth * aspect);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.warn('Could not extract canvas frame:', err);
      }
      cleanup();
      resolve('');
    };

    video.onloadeddata = () => {
      // Seek slightly into the video to avoid black intro frames
      const seekTime = Math.min(0.5, (video.duration || 1) / 4);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.onerror = () => {
      cleanup();
      resolve('');
    };

    // Safety timeout
    setTimeout(() => {
      if (!resolved) {
        captureFrame();
      }
    }, 2500);

    video.src = url;
  });
}

/**
 * Get best supported MediaRecorder MIME type on current browser
 */
function getSupportedVideoMimeType(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', extension: 'webm' };
  }

  const types = [
    { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t.mimeType)) {
      return t;
    }
  }

  return { mimeType: 'video/webm', extension: 'webm' };
}

/**
 * Calculate dynamic video bitrate based on resolution and quality setting
 */
function calculateTargetBitrate(
  width: number,
  height: number,
  quality: number,
  fps: number = 30
): number {
  const pixelCount = width * height;
  const qualityFactor = Math.max(0.1, Math.min(1.5, quality / 80));

  // Baseline bits per pixel per frame factor
  const bpp = 0.08;
  const calculatedBitrate = Math.round(pixelCount * fps * bpp * qualityFactor);

  // Bounds: min 250 kbps, max 12 Mbps
  return Math.max(250_000, Math.min(12_000_000, calculatedBitrate));
}

/**
 * Compress a single video client-side in the browser using HTML5 Canvas & MediaRecorder
 */
export async function compressSingleVideo(
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
  duration: number;
  warning?: string;
}> {
  return new Promise((resolve, reject) => {
    const videoUrl = URL.createObjectURL(item.file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = settings.muteAudio;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let animationFrameId: number | null = null;
    let audioContext: AudioContext | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    const recordedChunks: Blob[] = [];

    const cleanup = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (audioContext && audioContext.state !== 'closed') {
        try {
          audioContext.close();
        } catch {
          // ignore
        }
      }
      video.pause();
      URL.revokeObjectURL(videoUrl);
      video.remove();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video for compression. Codec or file format may be unsupported by your browser.'));
    };

    video.onloadedmetadata = async () => {
      try {
        const origW = video.videoWidth || 1280;
        const origH = video.videoHeight || 720;
        const duration = isFinite(video.duration) ? video.duration : 1;

        // Calculate target dimensions (must be even numbers for video encoders)
        let targetW = origW;
        let targetH = origH;

        if (settings.maxWidth && targetW > settings.maxWidth) {
          targetH = Math.round((targetH * settings.maxWidth) / targetW);
          targetW = settings.maxWidth;
        }
        if (settings.maxHeight && targetH > settings.maxHeight) {
          targetW = Math.round((targetW * settings.maxHeight) / targetH);
          targetH = settings.maxHeight;
        }

        // Enforce even dimensions
        targetW = Math.max(2, Math.floor(targetW / 2) * 2);
        targetH = Math.max(2, Math.floor(targetH / 2) * 2);

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          cleanup();
          reject(new Error('Could not initialize 2D canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const fps = settings.videoFps || 30;
        const targetBitrate = calculateTargetBitrate(targetW, targetH, settings.quality, fps);
        const { mimeType: chosenMime, extension: outputExt } = getSupportedVideoMimeType();

        // Capture stream from canvas
        const canvasStream = canvas.captureStream(fps);

        // Try preserving audio stream if not muted
        if (!settings.muteAudio) {
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              audioContext = new AudioCtx();
              const source = audioContext.createMediaElementSource(video);
              const destination = audioContext.createMediaStreamDestination();
              source.connect(destination);
              source.connect(audioContext.destination);

              destination.stream.getAudioTracks().forEach((track) => {
                canvasStream.addTrack(track);
              });
            }
          } catch (audioErr) {
            console.warn('Could not route audio track:', audioErr);
          }
        }

        // Initialize MediaRecorder
        try {
          mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: chosenMime,
            videoBitsPerSecond: targetBitrate,
          });
        } catch (e) {
          // Fallback to default MediaRecorder options
          mediaRecorder = new MediaRecorder(canvasStream);
        }

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(recordedChunks, { type: chosenMime });
          cleanup();

          const origExt = getFileExtension(item.name);
          const targetExtension = settings.keepOriginalFormat && origExt === 'mp4' && outputExt === 'mp4'
            ? 'mp4'
            : outputExt;

          const outputFilename = replaceFileExtension(item.name, targetExtension);
          const outputRelativePath = item.relativePath
            ? replaceFileExtension(item.relativePath, targetExtension)
            : undefined;

          if (onProgress) onProgress(100);

          resolve({
            blob: compressedBlob,
            size: compressedBlob.size,
            format: chosenMime,
            outputFilename,
            outputRelativePath,
            width: targetW,
            height: targetH,
            duration,
          });
        };

        // Draw loop
        const drawFrame = () => {
          if (video.paused || video.ended) return;

          ctx.drawImage(video, 0, 0, targetW, targetH);

          if (duration > 0 && onProgress) {
            const progress = Math.min(99, Math.round((video.currentTime / duration) * 98) + 1);
            onProgress(progress);
          }

          animationFrameId = requestAnimationFrame(drawFrame);
        };

        video.onended = () => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };

        // Start recording
        mediaRecorder.start(100); // 100ms timeslices for smooth buffering
        video.currentTime = 0;

        try {
          await video.play();
          drawFrame();
        } catch (playErr: any) {
          // If autoplay blocked, try muting
          video.muted = true;
          await video.play();
          drawFrame();
        }
      } catch (err: any) {
        cleanup();
        reject(err);
      }
    };

    video.src = videoUrl;
  });
}
