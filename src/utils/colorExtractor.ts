import { ThemeId } from '../types/music';

/**
 * Extracts dominant color from an image URL (bypassing CORS canvas taint via Blob fetch)
 * and maps it to the matching HUD ThemeId.
 */
export async function extractThemeFromImage(imageUrl: string): Promise<ThemeId> {
  if (!imageUrl) return 'alien-green';

  try {
    let objectUrl = imageUrl;

    // If external HTTP/HTTPS URL, fetch as blob to bypass Canvas CORS security taint
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

    return await new Promise<ThemeId>((resolve) => {
      const img = new Image();
      img.src = objectUrl;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
            resolve('alien-green');
            return;
          }

          canvas.width = 40;
          canvas.height = 40;
          ctx.drawImage(img, 0, 0, 40, 40);

          const imageData = ctx.getImageData(0, 0, 40, 40);
          const data = imageData.data;

          let rSum = 0;
          let gSum = 0;
          let bSum = 0;
          let count = 0;

          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 128) continue;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            if (max - min < 15) continue; // Skip greys

            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }

          if (objectUrl.startsWith('blob:')) {
            URL.revokeObjectURL(objectUrl);
          }

          if (count === 0) {
            resolve('white-hologram');
            return;
          }

          const avgR = rSum / count;
          const avgG = gSum / count;
          const avgB = bSum / count;

          console.log(`[COLOR ENGINE] Extracted RGB (${Math.round(avgR)}, ${Math.round(avgG)}, ${Math.round(avgB)}) from cover!`);

          // Determine dominant color channel
          if (avgR > avgG * 1.15 && avgR > avgB * 1.15) {
            resolve('red-plasma');
          } else if (avgG > avgR * 1.1 && avgG > avgB * 1.1) {
            resolve('alien-green');
          } else if (avgB > avgR * 1.1 && avgB > avgG * 0.9) {
            resolve('deep-space-blue');
          } else if (avgR > 130 && avgG > 80 && avgB < 90) {
            resolve('amber-reactor');
          } else if (avgR > 170 && avgG > 170 && avgB > 170) {
            resolve('white-hologram');
          } else {
            if (avgR >= avgG && avgR >= avgB) resolve('red-plasma');
            else if (avgB >= avgR && avgB >= avgG) resolve('deep-space-blue');
            else if (avgG >= avgR && avgG >= avgB) resolve('alien-green');
            else resolve('amber-reactor');
          }
        } catch (err) {
          if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
          console.warn('Canvas color extraction notice:', err);
          resolve(fallbackColorFromUrl(imageUrl));
        }
      };

      img.onerror = () => {
        if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
        resolve(fallbackColorFromUrl(imageUrl));
      };
    });
  } catch (err) {
    return fallbackColorFromUrl(imageUrl);
  }
}

/**
 * Fallback color mapping based on URL string keywords or hash
 */
function fallbackColorFromUrl(url: string): ThemeId {
  const lower = url.toLowerCase();
  if (lower.includes('red') || lower.includes('plasma') || lower.includes('cover3')) return 'red-plasma';
  if (lower.includes('blue') || lower.includes('matrix') || lower.includes('cover2')) return 'deep-space-blue';
  if (lower.includes('amber') || lower.includes('jazz')) return 'amber-reactor';
  if (lower.includes('green') || lower.includes('cover1')) return 'alien-green';

  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
  }
  const themes: ThemeId[] = ['red-plasma', 'deep-space-blue', 'alien-green', 'amber-reactor', 'white-hologram'];
  return themes[Math.abs(hash) % themes.length];
}
