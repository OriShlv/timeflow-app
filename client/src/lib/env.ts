const DEFAULT_API_URL = 'http://localhost:3000';

export function getApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  if (configured !== undefined && configured.length > 0) {
    return configured;
  }
  return DEFAULT_API_URL;
}
