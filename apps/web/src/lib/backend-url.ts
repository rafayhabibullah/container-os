const DEFAULT_API_URL = 'http://localhost:3000/api';

export function backendApiUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function backendApi(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendApiUrl()}${normalizedPath.startsWith('/api/') ? normalizedPath.slice(4) : normalizedPath}`;
}
