// Minimal auth client with flexible response unwrapping

function getApiBaseUrl() {
  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (isDev) return '/api';
  return 'https://localhost:7092/api';
}

const API_ROOT = getApiBaseUrl();

// Adjust these if your backend uses different routes
// Using Customer API for registration
const LOGIN_URL = `${API_ROOT}/Auth/login`; // not used when passwordless
const SIGNUP_URL = `${API_ROOT}/Customer/manage`;
const DISPLAY_NAME_KEY = 'displayName';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('authToken');
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem('authToken', token);
  window.dispatchEvent(new CustomEvent('authChanged'));
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('authToken');
  window.localStorage.removeItem(DISPLAY_NAME_KEY);
  window.dispatchEvent(new CustomEvent('authChanged'));
}

export function isAuthenticated() {
  return !!(getToken() || getDisplayName());
}

function unwrapToken(json) {
  // supports: {token}, {data:{token}}, {data:{Token}}, {Token}
  const token = json?.token || json?.Token || json?.data?.token || json?.data?.Token || null;
  return token;
}

export async function login(credentials) {
  // Passwordless/local login: just record a display name; no backend call
  const derived = credentials?.name
    || (credentials?.email ? String(credentials.email).split('@')[0] : '')
    || credentials?.phoneNumber
    || (credentials?.identifier ? String(credentials.identifier) : '')
    || 'Guest';
  setDisplayName(derived);
  return { guest: true, displayName: derived };
}

export async function signup(payload) {
  // payload expected: { customerName, email, phoneNumber, address }
  // Map to CustomerAddUpdateRequest shape
  const toSend = {
    ID: null,
    CustomerName: payload.customerName,
    Email: payload.email || null,
    PhoneNumber: payload.phoneNumber,
    Address: payload.address,
    UpdatedBy: 'admin'
  };
  const res = await fetch(SIGNUP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toSend)
  });
  if (!res.ok) throw new Error(`Signup failed (${res.status})`);
  // No token needed; store display name for header
  if (payload?.customerName) setDisplayName(payload.customerName);
  return { success: true };
}

export function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getDisplayName() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(DISPLAY_NAME_KEY) || '';
}

export function setDisplayName(name) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DISPLAY_NAME_KEY, String(name || ''));
  window.dispatchEvent(new CustomEvent('authChanged'));
}


