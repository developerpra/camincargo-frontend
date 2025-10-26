export function getApiBaseUrl() {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (isDev) return '/api';
  return 'https://localhost:7092/api';
}

export const API_ROOT = getApiBaseUrl();


