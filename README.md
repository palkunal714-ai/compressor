# Bulk Image Compressor

A high-performance, 100% client-side web application for compressing unlimited images in bulk and packaging them into a downloadable ZIP file with original filenames preserved.

## ✨ Key Features

- **Unlimited Batch Processing**: Select 10, 50, or 200+ images with zero artificial limits.
- **100% Client-Side Privacy**: All compression executes locally in the browser via Web Workers; zero images are uploaded to any server.
- **Original Filename Preservation**: Compressed files in the generated ZIP retain their exact original names and extensions.
- **Full Format Support**:
  - **JPEG / JPG**
  - **PNG** (alpha transparency preserved)
  - **WebP**
  - **HEIC / HEIF** (with dynamic decoder fallback)
  - **GIF** (optimized static compression)
  - **BMP & TIFF**
- **Top Settings Panel**:
  - Quality Slider (1–100%, with presets: Max 92%, High 80%, Medium 65%, Low 45%)
  - Max Width & Max Height dimension scaling (with aspect ratio preservation and 4K/1080p/720p presets)
  - "Keep Original Format" toggle
  - "Convert to WebP" option for extra space savings
  - Parallel Concurrency slider (1–8 worker threads)
  - EXIF / GPS metadata stripping for privacy
- **Interactive UI**:
  - Drag-and-drop zone and folder selection
  - Grid View and Dense Table View
  - Real-time progress bars and before/after size comparisons
  - Interactive Before/After split comparison modal
  - Dark / Light mode toggle (persisted in `localStorage`)
  - Automatic ZIP creation named `compressed-images-YYYY-MM-DD.zip` with instant browser download
  - Keyboard shortcuts (`Delete`/`Backspace` to remove focused items)

## 🚀 Getting Started

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```
The static build will be generated in `dist/`.
