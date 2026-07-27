export interface SyncedLyricLine {
  timeMs: number;
  text: string;
}

export interface LyricsResponse {
  id: number | null;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: SyncedLyricLine[] | null;
}

export interface FetchLyricsResult {
  data: LyricsResponse | null;
  status: 'synced' | 'plain' | 'instrumental' | 'not_found' | 'loading' | 'error' | 'rate_limited';
  retryAfterSeconds?: number;
}

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const CLIENT_HEADER = 'Aetheris-OS/2.6.0 (https://github.com/aetheris-os)';
const MAX_CACHE_SIZE = 50;

// Bounded in-memory lyrics cache
const lyricsCache = new Map<string, LyricsResponse | null>();

function getCacheKey(trackName: string, artistName: string, duration: number): string {
  return `${artistName.toLowerCase().trim()}::${trackName.toLowerCase().trim()}::${Math.round(duration)}`;
}

/**
 * Parses LRC synchronized timestamp string into structured line objects.
 * Format: [mm:ss.xx] line text
 */
export function parseLrc(lrcText: string): SyncedLyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split(/\r?\n/);
  const parsed: SyncedLyricLine[] = [];

  for (const line of lines) {
    const match = line.match(/^\[(\d{2,}):(\d{2}(?:\.\d+)?)\](.*)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const text = match[3].trim();
      const timeMs = Math.round((minutes * 60 + seconds) * 1000);
      parsed.push({ timeMs, text });
    }
  }

  const sorted = parsed.sort((a, b) => a.timeMs - b.timeMs);
  const deduplicated: SyncedLyricLine[] = [];
  let lastTimeMs = -1;

  for (const item of sorted) {
    if (item.timeMs !== lastTimeMs) {
      deduplicated.push(item);
      lastTimeMs = item.timeMs;
    }
  }

  return deduplicated;
}

/**
 * Dedicated LRCLIB API Service for fetching synchronized & plain lyrics.
 */
export class LyricsService {
  public static getCachedLyrics(trackName: string, artistName: string, duration: number): LyricsResponse | null | undefined {
    const key = getCacheKey(trackName, artistName, duration);
    return lyricsCache.get(key);
  }

  public static async fetchLyrics(
    trackName: string,
    artistName: string,
    albumName: string = '',
    duration: number = 0,
    signal?: AbortSignal
  ): Promise<FetchLyricsResult> {
    if (!trackName || !artistName) {
      return { data: null, status: 'not_found' };
    }

    const durationSecs = Math.round(duration);
    const cacheKey = getCacheKey(trackName, artistName, durationSecs);

    // Check in-memory cache
    if (lyricsCache.has(cacheKey)) {
      const cached = lyricsCache.get(cacheKey);
      if (!cached) return { data: null, status: 'not_found' };
      if (cached.instrumental) return { data: cached, status: 'instrumental' };
      if (cached.syncedLyrics && cached.syncedLyrics.length > 0) return { data: cached, status: 'synced' };
      if (cached.plainLyrics) return { data: cached, status: 'plain' };
      return { data: null, status: 'not_found' };
    }

    const queryParams = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });

    if (albumName) {
      queryParams.append('album_name', albumName);
    }
    if (durationSecs > 0) {
      queryParams.append('duration', durationSecs.toString());
    }

    try {
      const response = await fetch(`${LRCLIB_BASE_URL}/get?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Lrclib-Client': CLIENT_HEADER,
        },
        signal,
      });

      if (response.status === 404) {
        // Cache negative result
        this.cacheLyrics(cacheKey, null);
        return { data: null, status: 'not_found' };
      }

      if (response.status === 429) {
        const retryHeader = response.headers.get('Retry-After');
        const retryAfter = retryHeader ? parseInt(retryHeader, 10) : 5;
        console.warn(`[LYRICS SERVICE] LRCLIB Rate Limited (429). Respecting backoff: ${retryAfter}s`);
        return { data: null, status: 'rate_limited', retryAfterSeconds: retryAfter };
      }

      if (!response.ok) {
        return { data: null, status: 'error' };
      }

      const raw = await response.json();

      const parsedSynced = raw.syncedLyrics ? parseLrc(raw.syncedLyrics) : null;
      const lyricsData: LyricsResponse = {
        id: raw.id || null,
        trackName: raw.trackName || trackName,
        artistName: raw.artistName || artistName,
        albumName: raw.albumName || albumName,
        duration: raw.duration || durationSecs,
        instrumental: !!raw.instrumental,
        plainLyrics: raw.plainLyrics || null,
        syncedLyrics: parsedSynced && parsedSynced.length > 0 ? parsedSynced : null,
      };

      // Store in bounded cache
      this.cacheLyrics(cacheKey, lyricsData);

      if (lyricsData.instrumental) return { data: lyricsData, status: 'instrumental' };
      if (lyricsData.syncedLyrics && lyricsData.syncedLyrics.length > 0) return { data: lyricsData, status: 'synced' };
      if (lyricsData.plainLyrics) return { data: lyricsData, status: 'plain' };
      return { data: lyricsData, status: 'not_found' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[LYRICS SERVICE] Request aborted due to track change.');
        return { data: null, status: 'loading' };
      }
      console.warn('[LYRICS SERVICE] Failed to fetch lyrics:', err);
      return { data: null, status: 'error' };
    }
  }

  private static cacheLyrics(key: string, data: LyricsResponse | null) {
    if (lyricsCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = lyricsCache.keys().next().value;
      if (oldestKey) lyricsCache.delete(oldestKey);
    }
    lyricsCache.set(key, data);
  }
}
