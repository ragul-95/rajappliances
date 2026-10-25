import { ApiError } from './apiError';
import { mockRequest } from './mockApi';

export { ApiError };

const MOCK = import.meta.env.VITE_API_MODE === 'mock';
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// CSRF protection: the server hands out a token (and a matching cookie).
// We send the token back in a header on every request that changes data.
let csrfToken = null;

async function getCsrfToken(force = false) {
  if (csrfToken && !force) return csrfToken;
  const res = await fetch(`${BASE}/csrf-token`, { credentials: 'include' });
  if (!res.ok) throw new ApiError('Could not start a secure session.', res.status);
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

function withQuery(path, params) {
  if (!params) return path;
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.append(key, value);
  });
  const text = qs.toString();
  return text ? `${path}?${text}` : path;
}

async function request(method, path, { body, form, params } = {}, retried = false) {
  if (MOCK) return mockRequest(method, path, { body, params, form });

  const headers = {};
  const options = { method, credentials: 'include', headers };

  if (method !== 'GET') headers['X-CSRF-Token'] = await getCsrfToken();

  if (form) {
    options.body = form; // FormData: the browser sets the multipart header itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(BASE + withQuery(path, params), options);
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    // An expired CSRF token: fetch a fresh one and retry once.
    if (res.status === 403 && data?.code === 'CSRF_INVALID' && !retried) {
      await getCsrfToken(true);
      return request(method, path, { body, form, params }, true);
    }
    throw new ApiError(data?.message || 'Something went wrong. Please try again.', res.status, data?.errors || null);
  }
  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts),
  postForm: (path, form) => request('POST', path, { form }),
  putForm: (path, form) => request('PUT', path, { form }),
};
