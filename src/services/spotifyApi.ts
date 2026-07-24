import { Track, Album } from '../types/music';

const DEFAULT_CLIENT_ID = 'b977c4d20ba7494a8dea2a61285e84ce';

const SPOTIFY_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'user-library-read',
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

export class SpotifyApiService {
  private static pollingTimer: number | null = null;

  public static getRedirectUri(): string {
    return 'http://127.0.0.1:3000/';
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
    const rawId = customClientId || localStorage.getItem('spotify_client_id') || DEFAULT_CLIENT_ID || '';
    const clientId = rawId.trim().replace(/^["']|["']$/g, '');

    if (!clientId) {
      alert('Spotify Client ID required! Please paste your Spotify Client ID into Settings and click Login.');
      return null;
    }

    const verifier = this.generateCodeVerifier();
    localStorage.setItem('spotify_code_verifier', verifier);
    const challenge = await this.generateCodeChallenge(verifier);
    const redirectUri = this.getRedirectUri();

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
    const popup = window.open(authUrl, 'Spotify Authorization', 'width=500,height=700');

    return new Promise((resolve) => {
      const checkPopup = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          resolve(SpotifyApiService.getStoredAccessToken());
          return;
        }

        try {
          if (popup.location.href.includes('code=')) {
            const urlParams = new URLSearchParams(popup.location.search);
            const code = urlParams.get('code');
            popup.close();
            clearInterval(checkPopup);

            if (code) {
              const token = await SpotifyApiService.exchangeCodeForToken(clientId, code);
              resolve(token);
            } else {
              resolve(null);
            }
          }
        } catch (e) {
          // Cross-origin check before redirect
        }
      }, 500);
    });
  }

  public static async exchangeCodeForToken(clientId: string, code: string): Promise<string | null> {
    const verifier = localStorage.getItem('spotify_code_verifier');
    if (!verifier) return null;

    const redirectUri = this.getRedirectUri();
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Failed to exchange token: ${errBody}`);
      }
      const data = await response.json();

      const expiresAt = Date.now() + data.expires_in * 1000;
      localStorage.setItem('spotify_access_token', data.access_token);
      if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
      localStorage.setItem('spotify_token_expires_at', expiresAt.toString());

      return data.access_token;
    } catch (err) {
      console.error('Spotify token exchange error:', err);
      return null;
    }
  }

  public static getStoredAccessToken(): string | null {
    const token = localStorage.getItem('spotify_access_token');
    const expiresAt = Number(localStorage.getItem('spotify_token_expires_at') || 0);
    if (!token || Date.now() >= expiresAt) {
      return null;
    }
    return token;
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
    const token = this.getStoredAccessToken();
    if (!token) throw new Error('Not authenticated with Spotify');

    const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
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
    return this.fetchApi('/me/player/play', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
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

  public static async search(query: string): Promise<Track[]> {
    if (!query.trim()) return [];
    try {
      const data = await this.fetchApi(`/search?q=${encodeURIComponent(query)}&type=track&limit=15`);
      if (!data?.tracks?.items) return [];

      return data.tracks.items.map((item: any) => ({
        id: `spotify:${item.id}`,
        title: item.name,
        artist: item.artists.map((a: any) => a.name).join(', '),
        album: item.album.name,
        coverUrl: item.album.images[0]?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
        duration: Math.round(item.duration_ms / 1000),
        source: 'spotify' as const,
        spotifyUri: item.uri,
      }));
    } catch (err) {
      console.warn('Spotify search failed:', err);
      return [];
    }
  }

  public static async getUserPlaylists(): Promise<Album[]> {
    try {
      const data = await this.fetchApi('/me/playlists?limit=10');
      if (!data?.items) return [];

      return data.items.map((item: any) => ({
        id: item.id,
        title: item.name,
        artist: item.owner?.display_name || 'Spotify Playlist',
        coverUrl: item.images[0]?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500',
        tracks: [],
      }));
    } catch (err) {
      console.warn('Failed to load user playlists from Spotify:', err);
      return [];
    }
  }
}
