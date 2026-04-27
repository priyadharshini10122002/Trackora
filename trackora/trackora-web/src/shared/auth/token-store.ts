const REFRESH_TOKEN_KEY = 'trackora_refresh_token';

let accessToken: string | null = null;

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string): void {
    accessToken = token;
  },
  clear(): void {
    accessToken = null;
  },
};

export const refreshStore = {
  get(): string | null {
    try {
      return sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
    } catch {
      // sessionStorage unavailable (SSR / privacy mode)
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // sessionStorage unavailable
    }
  },
};
