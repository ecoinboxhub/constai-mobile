import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const SIZES = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const RES_DIR = join(import.meta.dirname, "..", "android", "app", "src", "main", "res");

// Build an SVG icon programmatically — a modern hexagon-with-C mark
function svgIcon(size) {
  const pad = size * 0.1;
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner / 2;
  const hexPts = (cx, cy, r) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(" ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bg)"/>
  <polygon points="${hexPts(cx, cy, r * 0.85)}" fill="none" stroke="url(#accent)" stroke-width="${size * 0.04}" opacity="0.3"/>
  <polygon points="${hexPts(cx, cy, r * 0.65)}" fill="url(#accent)" opacity="0.9"/>
  <text x="${cx}" y="${cy + size * 0.08}" text-anchor="middle" dominant-baseline="central"
        font-family="system-ui, sans-serif" font-weight="800" font-size="${size * 0.42}"
        fill="#ffffff" letter-spacing="-0.02">C</text>
</svg>`;
}

async function main() {
  for (const [dir, size] of Object.entries(SIZES)) {
    const outDir = join(RES_DIR, dir);
    mkdirSync(outDir, { recursive: true });

    const svg = svgIcon(size);
    const buf = Buffer.from(svg);

    // Regular icon
    await sharp(buf).resize(size, size).png().toFile(join(outDir, "ic_launcher.png"));
    // Round icon — same for simplicity (Android rounds it automatically on supported devices)
    await sharp(buf).resize(size, size).png().toFile(join(outDir, "ic_launcher_round.png"));

    console.log(`Generated ${dir} (${size}x${size})`);
  }
  console.log("All icons generated successfully");
}

main().catch(console.error);
