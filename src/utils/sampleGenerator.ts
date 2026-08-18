/**
 * Generates rich synthetic sample images (JPEG, PNG with transparency, WebP) directly on client canvas
 * for instant testing without requiring external network requests.
 */
export async function generateSampleImages(): Promise<File[]> {
  const samples = [
    {
      name: 'nature-sunset-4k.jpg',
      type: 'image/jpeg',
      width: 2400,
      height: 1600,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Sunset gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1a103c');
        grad.addColorStop(0.3, '#7928ca');
        grad.addColorStop(0.6, '#ff0080');
        grad.addColorStop(0.8, '#ff4d4d');
        grad.addColorStop(1, '#ffaa40');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Sun
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.7, 180, 0, Math.PI * 2);
        ctx.fillStyle = '#fff4cc';
        ctx.shadowColor = '#ffdd55';
        ctx.shadowBlur = 80;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Mountains
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(w * 0.2, h * 0.55);
        ctx.lineTo(w * 0.45, h * 0.75);
        ctx.lineTo(w * 0.75, h * 0.5);
        ctx.lineTo(w, h * 0.8);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = '#120b24';
        ctx.fill();

        // Text banner
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = 'bold 72px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Sunset Mountain Landscape — 4K High Dynamic Range', 100, 180);
      },
    },
    {
      name: 'product-icon-transparent.png',
      type: 'image/png',
      width: 1600,
      height: 1600,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Transparent PNG with rich circular 3D glass effect
        ctx.clearRect(0, 0, w, h);

        const radGrad = ctx.createRadialGradient(w * 0.4, h * 0.35, 50, w * 0.5, h * 0.5, 600);
        radGrad.addColorStop(0, '#00dfd8');
        radGrad.addColorStop(0.5, '#007cf0');
        radGrad.addColorStop(1, '#002244');

        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 550, 0, Math.PI * 2);
        ctx.fillStyle = radGrad;
        ctx.fill();

        // Inner glowing geometry
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 24;
        ctx.strokeRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TRANSPARENT PNG ASSET', w / 2, h * 0.52);
      },
    },
    {
      name: 'urban-architecture-photo.jpg',
      type: 'image/jpeg',
      width: 2000,
      height: 1333,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // High frequency architectural pattern
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);

        // Grid of modern architectural glass panels
        const cols = 20;
        const rows = 14;
        const colW = w / cols;
        const rowH = h / rows;

        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            const hue = 190 + ((i + j) * 8) % 60;
            const lum = 25 + Math.sin(i * 0.5) * Math.cos(j * 0.5) * 20;
            ctx.fillStyle = `hsl(${hue}, 70%, ${lum}%)`;
            ctx.fillRect(i * colW + 2, j * rowH + 2, colW - 4, rowH - 4);
          }
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Metropolitan Skyscraper Texture', 80, 120);
      },
    },
    {
      name: 'creative-graphic-banner.webp',
      type: 'image/webp',
      width: 1920,
      height: 1080,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        // Mesh gradient
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#f12711');
        grad.addColorStop(0.5, '#f5af19');
        grad.addColorStop(1, '#11998e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 40; i++) {
          ctx.beginPath();
          ctx.arc(
            (Math.sin(i * 1.5) * 0.5 + 0.5) * w,
            (Math.cos(i * 1.2) * 0.5 + 0.5) * h,
            40 + i * 5,
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + (i % 5) * 0.04})`;
          ctx.fill();
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 56px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('High Fidelity Graphic Illustration', 100, 200);
      },
    },
  ];

  const files: File[] = [];

  for (const sample of samples) {
    const canvas = document.createElement('canvas');
    canvas.width = sample.width;
    canvas.height = sample.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      sample.draw(ctx, sample.width, sample.height);
      const blob: Blob = await new Promise((res) => {
        canvas.toBlob((b) => res(b || new Blob()), sample.type, 0.98);
      });
      const file = new File([blob], sample.name, { type: sample.type });
      files.push(file);
    }
  }

  return files;
}
