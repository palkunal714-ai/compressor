import { ScannedFileItem } from './fileScanner';

/**
 * Generates rich synthetic sample images with nested folder hierarchies
 * (inspired by watch and clock product series) directly on client canvas.
 */
export async function generateSampleImages(withFolderStructure: boolean = true): Promise<ScannedFileItem[]> {
  const sampleDefs = [
    {
      name: 'antique-dial.jpg',
      relativePath: withFolderStructure ? 'ornate-classic/antique-dial.jpg' : 'antique-dial.jpg',
      folderPath: withFolderStructure ? 'ornate-classic' : undefined,
      type: 'image/jpeg',
      width: 1920,
      height: 1280,
      title: 'Ornate Classic — Antique Roman Dial',
      primaryColor: '#c5a059',
      bgColor: '#16120e',
    },
    {
      name: 'pendulum-mechanism.png',
      relativePath: withFolderStructure ? 'ornate-classic/sub/pendulum-mechanism.png' : 'pendulum-mechanism.png',
      folderPath: withFolderStructure ? 'ornate-classic/sub' : undefined,
      type: 'image/png',
      width: 1600,
      height: 1600,
      title: 'Pendulum Brass Gear Mechanism',
      primaryColor: '#e5b869',
      bgColor: '#0f0e0c',
    },
    {
      name: 'series-333-front.jpg',
      relativePath: withFolderStructure ? 'series-333/series-333-front.jpg' : 'series-333-front.jpg',
      folderPath: withFolderStructure ? 'series-333' : undefined,
      type: 'image/jpeg',
      width: 2000,
      height: 1400,
      title: 'Series 333 — Minimalist Dual Index',
      primaryColor: '#3b82f6',
      bgColor: '#090d16',
    },
    {
      name: 'series-444-dial.webp',
      relativePath: withFolderStructure ? 'series-444/gallery/series-444-dial.webp' : 'series-444-dial.webp',
      folderPath: withFolderStructure ? 'series-444/gallery' : undefined,
      type: 'image/webp',
      width: 1920,
      height: 1080,
      title: 'Series 444 — Precision Quartz Index',
      primaryColor: '#10b981',
      bgColor: '#071510',
    },
    {
      name: 'series-740-gold.jpg',
      relativePath: withFolderStructure ? 'series-740/series-740-gold.jpg' : 'series-740-gold.jpg',
      folderPath: withFolderStructure ? 'series-740' : undefined,
      type: 'image/jpeg',
      width: 1800,
      height: 1200,
      title: 'Series 740 — 24K Gilded Bezel',
      primaryColor: '#f59e0b',
      bgColor: '#171206',
    },
    {
      name: 'chrono-subdial.png',
      relativePath: withFolderStructure ? 'series-755dx/sub-dial/chrono-subdial.png' : 'chrono-subdial.png',
      folderPath: withFolderStructure ? 'series-755dx/sub-dial' : undefined,
      type: 'image/png',
      width: 1500,
      height: 1500,
      title: 'Series 755 DX — Triple Sub-Dial',
      primaryColor: '#8b5cf6',
      bgColor: '#110c1c',
    },
    {
      name: 'master-edition.webp',
      relativePath: withFolderStructure ? 'series-760dx/deep-nested/master-edition.webp' : 'master-edition.webp',
      folderPath: withFolderStructure ? 'series-760dx/deep-nested' : undefined,
      type: 'image/webp',
      width: 2400,
      height: 1600,
      title: 'Series 760 DX — Grand Masterpiece',
      primaryColor: '#ec4899',
      bgColor: '#1a0b14',
    },
  ];

  const results: ScannedFileItem[] = [];

  for (const def of sampleDefs) {
    const canvas = document.createElement('canvas');
    canvas.width = def.width;
    canvas.height = def.height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Draw luxury background
      ctx.fillStyle = def.bgColor;
      ctx.fillRect(0, 0, def.width, def.height);

      // Radial glowing gradient in center
      const radGrad = ctx.createRadialGradient(
        def.width / 2,
        def.height / 2,
        100,
        def.width / 2,
        def.height / 2,
        def.width * 0.6
      );
      radGrad.addColorStop(0, `${def.primaryColor}33`);
      radGrad.addColorStop(0.5, `${def.primaryColor}0d`);
      radGrad.addColorStop(1, '#00000000');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, def.width, def.height);

      // Outer watch / dial geometry
      const centerX = def.width / 2;
      const centerY = def.height / 2;
      const radius = Math.min(def.width, def.height) * 0.35;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `${def.primaryColor}88`;
      ctx.lineWidth = 12;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.92, 0, Math.PI * 2);
      ctx.strokeStyle = `${def.primaryColor}44`;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Hour ticks
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const x1 = centerX + Math.cos(angle) * (radius * 0.82);
        const y1 = centerY + Math.sin(angle) * (radius * 0.82);
        const x2 = centerX + Math.cos(angle) * (radius * 0.9);
        const y2 = centerY + Math.sin(angle) * (radius * 0.9);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#ffffffcc';
        ctx.lineWidth = i % 3 === 0 ? 8 : 4;
        ctx.stroke();
      }

      // Hands
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(Math.PI * 0.3) * (radius * 0.55), centerY + Math.sin(Math.PI * 0.3) * (radius * 0.55));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(Math.PI * 1.6) * (radius * 0.75), centerY + Math.sin(Math.PI * 1.6) * (radius * 0.75));
      ctx.strokeStyle = def.primaryColor;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Center cap
      ctx.beginPath();
      ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Text Header
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(def.width * 0.03)}px "Plus Jakarta Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(def.title, centerX, def.height * 0.12);

      // Relative path footer
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = `normal ${Math.round(def.width * 0.018)}px monospace`;
      ctx.fillText(`Path: ${def.relativePath}`, centerX, def.height * 0.92);

      const blob: Blob = await new Promise((res) => {
        canvas.toBlob((b) => res(b || new Blob()), def.type, 0.95);
      });

      const file = new File([blob], def.name, { type: def.type });
      results.push({
        file,
        relativePath: def.relativePath,
        folderPath: def.folderPath,
      });
    }
  }

  return results;
}
