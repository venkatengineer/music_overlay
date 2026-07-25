import { Track, Album } from '../types/music';

const DEFAULT_CLIENT_ID = 'b977c4d20ba7494a8dea2a61285e84ce';

const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'user-library-read',
  'user-read-private',
].join(' ');

export interface SpotifyPlayerState {
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  item: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    uri: string;
  } | null;
}

export interface SpotifySearchTrackItem extends Track {
  explicit: boolean;
  externalUrl?: string;
}

export interface SpotifySearchAlbumItem {
  id: string;
  name: string;
  artist: string;
  coverUrl: string;
  releaseYear: string;
  externalUrl?: string;
  uri: string;
}

export interface SpotifySearchArtistItem {
  id: string;
  name: string;
  imageUrl: string;
  externalUrl?: string;
  uri: string;
}

export interface OfficialSpotifySearchResult {
  tracks: SpotifySearchTrackItem[];
  albums: SpotifySearchAlbumItem[];
  artists: SpotifySearchArtistItem[];
}

export class SpotifyApiService {
  private static pollingTimer: number | null = null;
  private static searchCache = new Map<string, OfficialSpotifySearchResult>();

  public static getRedirectUri(): string {
    const saved = localStorage.getItem('spotify_redirect_uri');
    if (saved) return saved.trim();

    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      const origin = window.location.origin;
      return origin.endsWith('/') ? origin : `${origin}/`;
    }
    return 'http://127.0.0.1:3000/';
  }

  public static setRedirectUri(uri: string) {
    localStorage.setItem('spotify_redirect_uri', uri.trim());
  }

  public static generateCodeVerifier(length = 64): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const values = new Uint8Array(length);
    crypto.getRandomValues(values);
    return Array.from(values).map(x => possible[x % possible.length]).join('');
  }

  public static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  // Interactive Popup Authorization Flow
  public static async loginWithPopup(customClientId?: string): Promise<string | null> {
    console.log('[SPOTIFY AUTH TRACE] LOGIN START');
    const rawId = customClientId || localStorage.getItem('spotify_client_id') || DEFAULT_CLIENT_ID || '';
    const clientId = rawId.trim().replace(/^["']|["']$/g, '');

    if (!clientId) {
      alert('Spotify Client ID required! Please paste your Spotify Client ID into Settings and click Login.');
      return null;
    }

    const verifier = this.generateCodeVerifier();
    console.log('[SPOTIFY AUTH TRACE] Generated verifier:', verifier);

    localStorage.setItem('spotify_code_verifier', verifier);
    const storedVerifierAfterSave = localStorage.getItem('spotify_code_verifier');
    console.log('[SPOTIFY AUTH TRACE] Saved verifier:', verifier);
    console.log('[SPOTIFY AUTH TRACE] Verifier after save:', storedVerifierAfterSave);

    const challenge = await this.generateCodeChallenge(verifier);
    const redirectUri = this.getRedirectUri();

    console.log('[SPOTIFY AUTH TRACE] Verifier before redirect:', localStorage.getItem('spotify_code_verifier'));

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: SPOTIFY_SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });

    const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
    console.log('[SPOTIFY AUTH] Launching authorization popup:', authUrl);
    console.log('[SPOTIFY AUTH] Using Redirect URI:', redirectUri);

    const popup = window.open(authUrl, 'Spotify Authorization', 'width=500,height=700');

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (token: string | null) => {
        if (resolved) return;
        resolved = true;
        window.removeEventListener('message', messageHandler);
        if (checkPopup) clearInterval(checkPopup);
        resolve(token);
      };

      const messageHandler = async (event: MessageEvent) => {
        if (event.data && event.data.type === 'SPOTIFY_AUTH_CODE' && event.data.code) {
          console.log('[SPOTIFY AUTH TRACE] Verifier after redirect:', localStorage.getItem('spotify_code_verifier'));
          console.log('[SPOTIFY AUTH] Received postMessage code from popup window!');
          if (popup && !popup.closed) {
            try { popup.close(); } catch (e) {}
          }
          const token = await SpotifyApiService.exchangeCodeForToken(clientId, event.data.code);
          finish(token);
        }
      };

      window.addEventListener('message', messageHandler);

      const checkPopup = setInterval(async () => {
        if (resolved) return;

        // Check if token was set by Electron IPC or another handler in background
        const existingToken = SpotifyApiService.getStoredAccessToken();
        if (existingToken) {
          if (popup && !popup.closed) {
            try { popup.close(); } catch (e) {}
          }
          finish(existingToken);
          return;
        }

        if (!popup || popup.closed) {
          setTimeout(() => {
            finish(SpotifyApiService.getStoredAccessToken());
          }, 600);
          return;
        }

        try {
          if (popup.location.href.includes('code=')) {
            const urlParams = new URLSearchParams(popup.location.search);
            const code = urlParams.get('code');
            popup.close();

            if (code) {
              const token = await SpotifyApiService.exchangeCodeForToken(clientId, code);
              finish(token);
            } else {
              finish(null);
            }
          }
        } catch (e) {
          // Cross-origin check
        }
      }, 500);
    });
  }

  public static async exchangeCodeForToken(clientId: string, code: string): Promise<string | null> {
    console.log('[SPOTIFY AUTH TRACE] Verifier before exchange:', localStorage.getItem('spotify_code_verifier'));
    const verifier = localStorage.getItem('spotify_code_verifier');
    if (!verifier) {
      console.error('Spotify token exchange failed: No PKCE code_verifier found in localStorage.');
      alert('Spotify authentication error: Code verifier missing. Please try clicking "Authorize Spotify Login" again.');
      return null;
    }

    const redirectUri = this.getRedirectUri();
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });

    console.log('[SPOTIFY AUTH] Exchanging code for token with Redirect URI:', redirectUri);

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error(`Spotify API token exchange error [${response.status}]:`, errBody);

        let parsedMessage = errBody;
        try {
          const parsed = JSON.parse(errBody);
          parsedMessage = parsed.error_description || parsed.error || errBody;
        } catch (e) {}

        alert(`Spotify Login Failed (${response.status}): ${parsedMessage}\n\nMake sure your Spotify Developer Dashboard contains this EXACT Redirect URI:\n${redirectUri}`);
        return null;
      }

      const data = await response.json();
      const expiresAt = Date.now() + data.expires_in * 1000;
      localStorage.setItem('spotify_access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
      localStorage.setItem('spotify_token_expires_at', expiresAt.toString());

      console.log('POST https://accounts.spotify.com/api/token');
      console.log('HTTP Status:', response.status);
      console.log('HTTP Response Body:', data);
      console.log('Access Token:', data.access_token);
      console.log('Stored access token:', localStorage.getItem('spotify_access_token'));
      console.log('[SPOTIFY AUTH TRACE] Verifier after exchange:', localStorage.getItem('spotify_code_verifier'));

      console.log('[SPOTIFY AUTH] Access Token stored successfully!');
      return data.access_token;
    } catch (err) {
      console.error('Spotify token exchange error:', err);
      alert('Failed to connect to Spotify token endpoint. Please check your internet connection.');
      return null;
    }
  }

  public static checkAndHandleCallback(): boolean {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.warn('[SPOTIFY AUTH] Authorization error from query params:', error);
      if (window.opener && window.opener !== window) {
        try { window.close(); } catch (e) {}
      }
      return false;
    }

    if (code) {
      console.log('[SPOTIFY AUTH] Detected OAuth code in URL params!');
      if (window.opener && window.opener !== window) {
        // Send code back to parent window
        try {
          window.opener.postMessage({ type: 'SPOTIFY_AUTH_CODE', code }, '*');
          console.log('[SPOTIFY AUTH] Posted code to window.opener, closing popup window.');
          setTimeout(() => {
            try { window.close(); } catch (e) {}
          }, 200);
          return true;
        } catch (e) {
          console.error('Failed to postMessage to opener:', e);
        }
      } else {
        // Direct redirect in main window
        const clientId = localStorage.getItem('spotify_client_id') || DEFAULT_CLIENT_ID;
        SpotifyApiService.exchangeCodeForToken(clientId, code).then((token) => {
          if (token) {
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.reload();
          }
        });
        return true;
      }
    }
    return false;
  }

  public static getStoredAccessToken(): string | null {
    const token = localStorage.getItem('spotify_access_token');
    const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || 0);
    if (!token || Date.now() >= expiresAt) {
      return null;
    }
    return token;
  }

  public static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    const rawId = localStorage.getItem('spotify_client_id') || DEFAULT_CLIENT_ID || '';
    const clientId = rawId.trim().replace(/^["']|["']$/g, '');

    if (!refreshToken || !clientId) return null;

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    try {
      console.log('[SPOTIFY AUTH] Refreshing expired access token...');
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) return null;
      const data = await response.json();
      const expiresAt = Date.now() + data.expires_in * 1000;

      localStorage.setItem('spotify_access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
      localStorage.setItem('spotify_token_expires_at', expiresAt.toString());

      console.log('[SPOTIFY AUTH] Access token refreshed successfully!');
      return data.access_token;
    } catch (e) {
      console.warn('[SPOTIFY AUTH] Failed to refresh token:', e);
      return null;
    }
  }

  public static async getValidAccessToken(): Promise<string | null> {
    const token = localStorage.getItem('spotify_access_token');
    const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || 0);

    if (token && (expiresAt === 0 || Date.now() < expiresAt - 30000)) {
      return token;
    }

    const refreshed = await this.refreshAccessToken();
    return refreshed || token;
  }

  public static logout() {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires_at');
    localStorage.removeItem('spotify_code_verifier');
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private static async fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = await this.getValidAccessToken();
    if (!token) throw new Error('Not authenticated with Spotify');

    const url = `https://api.spotify.com/v1${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 204) return null;
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Spotify API error [${res.status}]: ${errText}`);
    }

    return res.json();
  }

  public static async getUserProfile() {
    try {
      return await this.fetchApi('/me');
    } catch (e) {
      return null;
    }
  }

  public static async getPlaybackState(): Promise<SpotifyPlayerState | null> {
    try {
      const data = await this.fetchApi('/me/player');
      if (!data) return null;
      return {
        isPlaying: data.is_playing,
        progressMs: data.progress_ms || 0,
        durationMs: data.item?.duration_ms || 0,
        item: data.item,
      };
    } catch (e) {
      return null;
    }
  }

  public static startPlayerPolling(callback: (state: SpotifyPlayerState | null) => void, intervalMs = 1500) {
    if (this.pollingTimer) clearInterval(this.pollingTimer);

    const poll = async () => {
      if (this.getStoredAccessToken()) {
        const state = await this.getPlaybackState();
        callback(state);
      }
    };

    poll();
    this.pollingTimer = window.setInterval(poll, intervalMs);
  }

  public static stopPlayerPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  public static async play(spotifyUri?: string) {
    const body: Record<string, unknown> = {};
    if (spotifyUri) {
      if (spotifyUri.includes(':track:')) {
        body.uris = [spotifyUri];
      } else {
        body.context_uri = spotifyUri;
      }
    }
    try {
      return await this.fetchApi('/me/player/play', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      console.warn('Spotify play request notice:', err);
      if (err.message?.includes('404')) {
        alert('Spotify Remote Notice:\nNo active Spotify device detected. Please open the Spotify App on your computer or phone and start playing a track to connect playback.');
      } else if (err.message?.includes('403')) {
        alert('Spotify Remote Notice:\nRemote playback control requires an active Spotify player or Spotify Premium account.');
      }
      throw err;
    }
  }

  public static async pause() {
    return this.fetchApi('/me/player/pause', { method: 'PUT' });
  }

  public static async next() {
    return this.fetchApi('/me/player/next', { method: 'POST' });
  }

  public static async previous() {
    return this.fetchApi('/me/player/previous', { method: 'POST' });
  }

  public static async seek(positionMs: number) {
    return this.fetchApi(`/me/player/seek?position_ms=${Math.floor(positionMs)}`, { method: 'PUT' });
  }

  public static async setVolume(volumePercent: number) {
    return this.fetchApi(`/me/player/volume?volume_percent=${Math.round(volumePercent)}`, { method: 'PUT' });
  }

  public static async searchOfficial(query: string, signal?: AbortSignal): Promise<OfficialSpotifySearchResult> {
    const q = query.trim();
    if (!q) return { tracks: [], albums: [], artists: [] };

    const cacheKey = q.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const data = await this.fetchApi(
      `/search?q=${encodeURIComponent(q)}&type=track,album,artist&limit=10`,
      { signal }
    );

    if (!data) return { tracks: [], albums: [], artists: [] };

    const tracks: SpotifySearchTrackItem[] = (data.tracks?.items || []).map((item: any) => ({
      id: `spotify:${item.id}`,
      title: item.name,
      artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      album: item.album?.name || 'Single',
      coverUrl: item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || '/cover1.png',
      duration: Math.round((item.duration_ms || 0) / 1000),
      source: 'spotify' as const,
      spotifyUri: item.uri,
      explicit: Boolean(item.explicit),
      externalUrl: item.external_urls?.spotify,
    }));

    const albums: SpotifySearchAlbumItem[] = (data.albums?.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      artist: item.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
      coverUrl: item.images?.[0]?.url || item.images?.[1]?.url || '/cover1.png',
      releaseYear: item.release_date ? item.release_date.substring(0, 4) : '',
      externalUrl: item.external_urls?.spotify,
      uri: item.uri,
    }));

    const artists: SpotifySearchArtistItem[] = (data.artists?.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      imageUrl: item.images?.[0]?.url || item.images?.[1]?.url || '/cover1.png',
      externalUrl: item.external_urls?.spotify,
      uri: item.uri,
    }));

    const result: OfficialSpotifySearchResult = { tracks, albums, artists };

    if (this.searchCache.size >= 50) {
      const firstKey = this.searchCache.keys().next().value;
      if (firstKey) this.searchCache.delete(firstKey);
    }
    this.searchCache.set(cacheKey, result);

    return result;
  }

  public static async search(query: string): Promise<Track[]> {
    const res = await this.searchOfficial(query);
    return res.tracks;
  }

  public static async getUserSavedTracks(limit = 25): Promise<Track[]> {
    try {
      const data = await this.fetchApi(`/me/tracks?limit=${limit}`);
      if (!data?.items) return [];

      return data.items
        .filter((item: any) => item.track)
        .map((item: any) => ({
          id: `spotify:${item.track.id}`,
          title: item.track.name,
          artist: item.track.artists.map((a: any) => a.name).join(', '),
          album: item.track.album?.name || 'Spotify Liked Songs',
          coverUrl: item.track.album?.images[0]?.url || '/cover1.png',
          duration: Math.round(item.track.duration_ms / 1000),
          source: 'spotify' as const,
          spotifyUri: item.track.uri,
        }));
    } catch (err) {
      console.warn('Failed to load user saved tracks from Spotify:', err);
      return [];
    }
  }

  public static async getPlaylistTracks(playlistId: string, limit = 25): Promise<Track[]> {
    try {
      const data = await this.fetchApi(`/playlists/${playlistId}/tracks?limit=${limit}`);
      if (!data?.items) return [];

      return data.items
        .filter((item: any) => item.track)
        .map((item: any) => ({
          id: `spotify:${item.track.id}`,
          title: item.track.name,
          artist: item.track.artists.map((a: any) => a.name).join(', '),
          album: item.track.album?.name || 'Spotify Album',
          coverUrl: item.track.album?.images[0]?.url || '/cover1.png',
          duration: Math.round(item.track.duration_ms / 1000),
          source: 'spotify' as const,
          spotifyUri: item.track.uri,
        }));
    } catch (err) {
      console.warn(`Failed to load tracks for playlist ${playlistId}:`, err);
      return [];
    }
  }

  public static async getUserPlaylistsWithTracks(): Promise<Album[]> {
    try {
      const playlistsData = await this.fetchApi('/me/playlists?limit=8');
      if (!playlistsData?.items) return [];

      const albumsWithTracks: Album[] = [];
      for (const pl of playlistsData.items) {
        const tracks = await this.getPlaylistTracks(pl.id, 20);
        if (tracks.length > 0) {
          albumsWithTracks.push({
            id: `spotify-pl-${pl.id}`,
            title: pl.name,
            artist: pl.owner?.display_name || 'Spotify Playlist',
            coverUrl: pl.images[0]?.url || '/cover1.png',
            tracks,
          });
        }
      }
      return albumsWithTracks;
    } catch (err) {
      console.warn('Failed to load user playlists with tracks from Spotify:', err);
      return [];
    }
  }

  public static async getAvailableDevices(): Promise<any[]> {
    try {
      const data = await this.fetchApi('/me/player/devices');
      return data?.devices || [];
    } catch (e) {
      return [];
    }
  }
}
