import { ThemeConfig, ThemeId } from '../types/music';

export interface ExtractedPalette {
  themeConfig: ThemeConfig;
  nearestPresetId: ThemeId;
  trackId?: string;
}

// In-memory cache keyed by artwork URL or trackId (Requirement 14 & 15)
const paletteCache = new Map<string, ExtractedPalette>();

// Convert RGB (0..255) to HSL (h: 0..360, s: 0..1, l: 0..1)
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), s, l];
}

// Convert HSL (h: 0..360, s: 0..1, l: 0..1) to hex string "#rrggbb"
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round((n + m) * 255))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Enhance color contrast and saturation for rich HUD atmosphere without destroying original perceptual hue
function preservePerceptualColor(h: number, s: number, l: number, minS = 0.45, targetL = 0.55): string {
  const enhancedS = Math.max(s, minS);
  const enhancedL = Math.min(0.70, Math.max(0.40, l > 0.8 ? targetL : l));
  return hslToHex(h, enhancedS, enhancedL);
}

interface ColorCluster {
  rSum: number;
  gSum: number;
  bSum: number;
  xSum: number;
  ySum: number;
  weightSum: number;
  count: number;
  hueBin: number;
}

/**
 * Perceptually-intelligent color extraction pipeline (Requirements 5 - 11).
 * Analyzes artwork pixels, extracts weighted color clusters, determines spatial positions,
 * and derives an atmospheric dark palette.
 */
export async function extractDynamicThemeFromImage(imageUrl: string, trackId?: string): Promise<ExtractedPalette> {
  const cacheKey = `${trackId || ''}::${imageUrl}`;
  if (paletteCache.has(cacheKey)) {
    console.log(`[ALBUM THEME CACHE HIT] trackId: ${trackId}`);
    return paletteCache.get(cacheKey)!;
  }

  const defaultFallback: ExtractedPalette = {
    themeConfig: {
      id: 'dynamic-rgb',
      name: 'Dynamic Album RGB',
      primary: '#00ffaa',
      secondary: '#00e5ff',
      accent: '#b026ff',
      bgHex: '#040d12',
      surfaceHex: '#0a1a24',
      glowHex: 'rgba(0, 255, 170, 0.35)',
      primaryWeight: 0.70,
      secondaryWeight: 0.30,
      primaryPos: { x: 25, y: 25 },
      secondaryPos: { x: 75, y: 75 },
    },
    nearestPresetId: 'alien-green',
    trackId,
  };

  if (!imageUrl) return defaultFallback;

  const startTime = performance.now();

  try {
    let objectUrl = imageUrl;

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const response = await fetch(imageUrl);
        if (response.ok) {
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
        }
      } catch (e) {
        console.warn('Fetch image blob notice:', e);
      }
    }

    return await new Promise<ExtractedPalette>((resolve) => {
      const img = new Image();
      img.src = objectUrl;

      img.onload = () => {
        try {
          const CANVAS_SIZE = 64; // 64x64 sample canvas (4096 pixels)
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
            resolve(defaultFallback);
            return;
          }

          canvas.width = CANVAS_SIZE;
          canvas.height = CANVAS_SIZE;
          ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

          const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          const data = imageData.data;

          // 24 Hue bins (15 deg each) for perceptual clustering
          const clusters: ColorCluster[] = Array.from({ length: 24 }, (_, i) => ({
            rSum: 0,
            gSum: 0,
            bSum: 0,
            xSum: 0,
            ySum: 0,
            weightSum: 0,
            count: 0,
            hueBin: i * 15,
          }));

          let totalWeight = 0;
          let totalPixels = 0;
          let whitePixels = 0;
          let darkPixels = 0;
          let chromaticPixels = 0;

          for (let y = 0; y < CANVAS_SIZE; y++) {
            for (let x = 0; x < CANVAS_SIZE; x++) {
              const idx = (y * CANVAS_SIZE + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              if (a < 128) continue; // Ignore transparent pixels
              totalPixels++;

              const [h, s, l] = rgbToHsl(r, g, b);

              if (l > 0.88) whitePixels++;
              if (l < 0.10) darkPixels++;

              // Skip extremely dark or extremely bright background pixels for chromatic clustering
              if (l < 0.08 || l > 0.92) continue;

              if (s >= 0.08) {
                chromaticPixels++;
              }

              // Red unification: 345°-360° maps into 0° bin
              let normalizedHue = h;
              if (h >= 345) normalizedHue = 0;

              // Weight formula: favors vibrant colors while respecting pixel density
              const weight = Math.pow(s, 1.3) * (1 - Math.abs(l - 0.5) * 0.7);
              const binIdx = Math.floor(normalizedHue / 15) % 24;

              const xPct = (x / (CANVAS_SIZE - 1)) * 100;
              const yPct = (y / (CANVAS_SIZE - 1)) * 100;

              clusters[binIdx].rSum += r * weight;
              clusters[binIdx].gSum += g * weight;
              clusters[binIdx].bSum += b * weight;
              clusters[binIdx].xSum += xPct;
              clusters[binIdx].ySum += yPct;
              clusters[binIdx].weightSum += weight;
              clusters[binIdx].count++;
              totalWeight += weight;
            }
          }

          if (objectUrl.startsWith('blob:')) {
            URL.revokeObjectURL(objectUrl);
          }

          // Sort clusters by weight & chromatic score
          const validClusters = clusters
            .filter((c) => c.weightSum > 0 && c.count > 0)
            .map((c) => {
              const meanR = c.rSum / c.weightSum;
              const meanG = c.gSum / c.weightSum;
              const meanB = c.bSum / c.weightSum;
              const [h, s, l] = rgbToHsl(meanR, meanG, meanB);
              const meanX = Math.round(c.xSum / c.count);
              const meanY = Math.round(c.ySum / c.count);
              const areaWeight = totalWeight > 0 ? c.weightSum / totalWeight : 0;
              return {
                r: meanR,
                g: meanG,
                b: meanB,
                h,
                s,
                l,
                x: meanX,
                y: meanY,
                weight: areaWeight,
                rawWeight: c.weightSum,
              };
            })
            .sort((a, b) => b.rawWeight - a.rawWeight);

          // CASE 1: CHROMATIC ARTWORK PRESENT
          if (validClusters.length > 0 && totalWeight > 0.2) {
            const primaryCluster = validClusters[0];
            const primaryHex = preservePerceptualColor(primaryCluster.h, primaryCluster.s, primaryCluster.l);

            // Find secondary cluster with distinct hue (> 35 deg apart) and meaningful area weight
            let secondaryCluster = validClusters.find(
              (c) => Math.abs(c.h - primaryCluster.h) > 35 && Math.abs(c.h - primaryCluster.h) < 325
            );

            let secondaryHex: string;
            let secondaryWeight = 0.3;
            let secondaryPos = { x: 75, y: 75 };

            if (secondaryCluster) {
              secondaryHex = preservePerceptualColor(secondaryCluster.h, secondaryCluster.s, secondaryCluster.l);
              secondaryWeight = Math.max(0.15, Math.min(0.45, secondaryCluster.weight));
              secondaryPos = { x: secondaryCluster.x, y: secondaryCluster.y };
            } else {
              // Derive complementary secondary accent if artwork is monochromatic single-hue
              const derivedH = (primaryCluster.h + 40) % 360;
              secondaryHex = preservePerceptualColor(derivedH, Math.min(1, primaryCluster.s * 1.1), 0.50);
              secondaryPos = { x: (primaryCluster.x + 50) % 100, y: (primaryCluster.y + 50) % 100 };
            }

            const primaryWeight = Math.max(0.55, 1 - secondaryWeight);
            const primaryPos = { x: primaryCluster.x, y: primaryCluster.y };

            // Derive atmospheric background & surface colors
            const bgHex = hslToHex(primaryCluster.h, Math.min(0.40, primaryCluster.s * 0.6), 0.05);
            const surfaceHex = hslToHex(primaryCluster.h, Math.min(0.35, primaryCluster.s * 0.5), 0.09);
            const accentHex = preservePerceptualColor((primaryCluster.h + 160) % 360, Math.min(1, primaryCluster.s * 1.2), 0.60);

            // Preset mapping for legacy HUD themes
            let nearestPresetId: ThemeId = 'alien-green';
            const pH = primaryCluster.h;
            if (pH >= 345 || pH < 15) nearestPresetId = 'red-plasma';
            else if (pH >= 15 && pH < 45) nearestPresetId = 'amber-reactor';
            else if (pH >= 45 && pH < 70) nearestPresetId = 'solar-gold';
            else if (pH >= 70 && pH < 110) nearestPresetId = 'emerald-abyss';
            else if (pH >= 110 && pH < 150) nearestPresetId = 'alien-green';
            else if (pH >= 150 && pH < 200) nearestPresetId = 'electric-cyan';
            else if (pH >= 200 && pH < 250) nearestPresetId = 'deep-space-blue';
            else if (pH >= 250 && pH < 290) nearestPresetId = 'cyber-purple';
            else if (pH >= 290 && pH < 345) nearestPresetId = 'neon-pink';

            const endTime = performance.now();
            console.log(`[ALBUM THEME] trackId: ${trackId || 'unknown'} | primary: ${primaryHex} (weight: ${Math.round(primaryWeight * 100)}%, pos: ${primaryPos.x}%,${primaryPos.y}%) | secondary: ${secondaryHex} (weight: ${Math.round(secondaryWeight * 100)}%, pos: ${secondaryPos.x}%,${secondaryPos.y}%) | extraction: ${Math.round(endTime - startTime)}ms`);

            const result: ExtractedPalette = {
              themeConfig: {
                id: 'dynamic-rgb',
                name: 'Dynamic Album RGB',
                primary: primaryHex,
                secondary: secondaryHex,
                accent: accentHex,
                bgHex,
                surfaceHex,
                glowHex: `${primaryHex}66`,
                primaryWeight,
                secondaryWeight,
                primaryPos,
                secondaryPos,
              },
              nearestPresetId,
              trackId,
            };

            paletteCache.set(cacheKey, result);
            resolve(result);
            return;
          }

          // CASE 2: MONOCHROME WHITE COVER (Requirement 13)
          const whiteRatio = totalPixels > 0 ? whitePixels / totalPixels : 0;
          if (whiteRatio > 0.45) {
            console.log(`[ALBUM THEME] White Monochrome Artwork detected for trackId: ${trackId}`);
            const result: ExtractedPalette = {
              themeConfig: {
                id: 'dynamic-rgb',
                name: 'Pure White Hologram',
                primary: '#ffffff',
                secondary: '#cbd5e1',
                accent: '#94a3b8',
                bgHex: '#080d14',
                surfaceHex: '#0f172a',
                glowHex: 'rgba(255, 255, 255, 0.4)',
                primaryWeight: 0.70,
                secondaryWeight: 0.30,
                primaryPos: { x: 30, y: 30 },
                secondaryPos: { x: 70, y: 70 },
              },
              nearestPresetId: 'white-hologram',
              trackId,
            };
            paletteCache.set(cacheKey, result);
            resolve(result);
            return;
          }

          // CASE 3: MONOCHROME DARK / OBSIDIAN COVER (Requirement 13)
          console.log(`[ALBUM THEME] Dark Monochrome Artwork detected for trackId: ${trackId}`);
          const result: ExtractedPalette = {
            themeConfig: {
              id: 'dynamic-rgb',
              name: 'Obsidian Silver',
              primary: '#ffffff',
              secondary: '#94a3b8',
              accent: '#64748b',
              bgHex: '#030712',
              surfaceHex: '#0b1120',
              glowHex: 'rgba(203, 213, 225, 0.35)',
              primaryWeight: 0.75,
              secondaryWeight: 0.25,
              primaryPos: { x: 50, y: 30 },
              secondaryPos: { x: 50, y: 80 },
            },
            nearestPresetId: 'obsidian-dark',
            trackId,
          };
          paletteCache.set(cacheKey, result);
          resolve(result);
        } catch (err) {
          if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
          console.warn('Canvas color extraction notice:', err);
          resolve(defaultFallback);
        }
      };

      img.onerror = () => {
        if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
        resolve(defaultFallback);
      };
    });
  } catch (err) {
    return defaultFallback;
  }
}

/**
 * Legacy extraction method returning closest ThemeId preset
 */
export async function extractThemeFromImage(imageUrl: string): Promise<ThemeId> {
  const result = await extractDynamicThemeFromImage(imageUrl);
  return result.nearestPresetId;
}
