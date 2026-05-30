import { swalError } from './swal';

const BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://farm.agasthyanutromilk.com';

// ---------------------------------------------------------------------------
// ROUTE → PERMISSION KEY REGISTRY
// Maps every protected API path prefix to the module permission key that must
// have can_view === true (or be a string match) for the call to proceed.
// Add new entries here when new backend routes are introduced.
// ---------------------------------------------------------------------------
/** @type {Record<string, string>} */
const ROUTE_PERMISSION_MAP = {
  '/api/farms':                        'FARM_MANAGEMENT',
  '/api/roles':                        'ROLES',
  '/api/users':                        'USER_MANAGEMENT',
  '/api/departments':                  'DEPARTMENT',
  '/api/sheds':                        'SHED_MANAGEMENT',
  '/api/cattle':                       'CATTLE_MANAGEMENT',
  '/api/crossing':                     'CROSSING_LOG',
  '/api/health/treatments':            'HEALTH',
  '/api/health/vaccinations':          'HEALTH',
  '/api/inventory/medicines':          'INVENTORY',
  '/api/inventory/feed':               'INVENTORY',
  '/api/operations/grass-collection':  'GRASS',
  '/api/operations/daily-feeding':     'FEEDING',
  '/api/milk/collections':             'MILK',
  '/api/milk/quality':                 'MILK',
  '/api/tags':                         'CATTLE_MANAGEMENT',
};

// ---------------------------------------------------------------------------
// SESSION READER
// Reads and parses the user object from localStorage without throwing.
// Returns null if the session is absent or corrupted.
// ---------------------------------------------------------------------------
/**
 * @returns {{ role: string, permissions: Array<any> } | null}
 */
function getSessionUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// CLIENT-SIDE FIREWALL
// Evaluates whether the current session holds can_view access for a given
// module key. Returns true for SUPER_ADMIN and 'ALL' permission holders.
// Supports both object-array permissions and string-array permissions.
// ---------------------------------------------------------------------------
/**
 * @param {{ role: string, permissions: Array<any> } | null} userObj
 * @param {string} moduleKey
 * @returns {boolean}
 */
function sessionHasAccess(userObj, moduleKey) {
  if (!userObj) return false;

  const role = String(userObj.role || '').trim().toUpperCase();
  if (role === 'SUPER_ADMIN') return true;

  const permissions = userObj.permissions;
  if (!Array.isArray(permissions)) return false;

  // Global wildcard
  const hasAll = permissions.some(
    (p) => typeof p === 'string' && p.trim().toUpperCase() === 'ALL'
  );
  if (hasAll) return true;

  const lowerKey = moduleKey.trim().toLowerCase();

  const matched = permissions.find((p) => {
    if (!p) return false;

    // Object schema: { module_key: 'FARM_MANAGEMENT', can_view: true, ... }
    if (typeof p === 'object') {
      return String(p.module_key || '').trim().toLowerCase() === lowerKey;
    }

    // String schema: 'FARM_MANAGEMENT' or 'FARM_MANAGEMENT_VIEW'
    if (typeof p === 'string') {
      const lp = p.trim().toLowerCase();
      return (
        lp === lowerKey ||
        lp.startsWith(lowerKey + '_') ||
        lp.includes(lowerKey)
      );
    }

    return false;
  });

  if (!matched) return false;

  // Object form: honour can_view explicitly
  if (typeof matched === 'object') return !!matched.can_view;

  // String form: presence means access granted
  return true;
}

// ---------------------------------------------------------------------------
// FIREWALL GATE
// Resolves the route prefix from the endpoint and checks whether the current
// session is permitted to call it. Returns a silent blocked sentinel when not.
// ---------------------------------------------------------------------------
/**
 * @typedef {{ firewallBlocked: true, success: false, data: [] }} FirewallBlock
 * @param {string} endpoint  - raw path like '/api/farms' or '/api/farms/123'
 * @returns {FirewallBlock | null}  null = pass-through; object = blocked
 */
function evaluateFirewall(endpoint) {
  // Strip query string, then find the longest matching prefix in the map
  const cleanPath = endpoint.split('?')[0];

  const matchedPrefix = Object.keys(ROUTE_PERMISSION_MAP).find((prefix) =>
    cleanPath === prefix || cleanPath.startsWith(prefix + '/')
  );

  if (!matchedPrefix) {
    // No permission requirement registered → allow
    return null;
  }

  const requiredKey = ROUTE_PERMISSION_MAP[matchedPrefix];
  const userObj = getSessionUser();

  if (sessionHasAccess(userObj, requiredKey)) {
    return null; // permitted → pass-through
  }

  // Blocked — log silently, never throw, never show a modal
  console.warn(
    `[API Firewall] Blocked request to "${cleanPath}" — requires "${requiredKey}". ` +
    `Role: ${userObj?.role ?? 'unknown'}.`
  );

  return { firewallBlocked: true, success: false, data: [] };
}

// ---------------------------------------------------------------------------
// TOKEN VERIFIER (unchanged)
// ---------------------------------------------------------------------------
/**
 * Asynchronously verify if the token itself is dead/expired.
 * Hits a lightweight root validation endpoint to make sure we don't boot out
 * active sessions due to operational module restrictions.
 * @param {string | null} token
 * @returns {Promise<boolean>}
 */
async function verifyTokenSession(token) {
  if (!token) return false;
  try {
    const response = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return false;
    return true;
  } catch (error) {
    console.error('Session verify check failed due to network connection:', error);
    return true; // network failure shouldn't trigger an aggressive logout
  }
}

// ---------------------------------------------------------------------------
// CENTRAL API REQUEST FUNCTION
// This is the only function that touches the network. All firewall, 401, 403,
// and error handling lives here so nothing else needs to duplicate it.
// ---------------------------------------------------------------------------
/**
 * Central network fetch wrapper with integrated client-side permission firewall.
 * @param {string} endpoint
 * @param {'GET'|'POST'|'PUT'|'DELETE'} [method]
 * @param {Record<string, unknown> | null} [body]
 * @returns {Promise<any>}
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
  if (typeof window === 'undefined') return null;

  // ── 1. CLIENT-SIDE FIREWALL ──────────────────────────────────────────────
  // Only gate GET requests (read visibility checks).
  // Mutations (POST/PUT/DELETE) bypass the firewall so form saves still work
  // even in edge permission states — the backend enforces those separately.
  if (method === 'GET') {
    const blocked = evaluateFirewall(endpoint);
    if (blocked) return blocked; // ← silent return, zero network traffic
  }

  // ── 2. PREPARE HEADERS ───────────────────────────────────────────────────
  const token = localStorage.getItem('token');
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };

  if (token && token !== 'undefined' && token !== 'null') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  /** @type {RequestInit} */
  const config = {
    method,
    headers,
    cache: 'no-store',
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(body);
  }

  // Add cache-busting timestamp to GET requests
  let finalEndpoint = endpoint;
  if (method === 'GET') {
    const separator = finalEndpoint.includes('?') ? '&' : '?';
    finalEndpoint += `${separator}t=${Date.now()}`;
  }

  // ── 3. NETWORK CALL ───────────────────────────────────────────────────────
  try {
    const response = await fetch(`${BASE_URL}${finalEndpoint}`, config);

    // ── 401 Unauthorized: token dead/missing → force re-login ──────────────
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      swalError('Session Expired', 'Please login again.');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return { success: false, error: 'Session expired.' };
    }

    // ── 403 Forbidden: silently absorb — the firewall should have caught it,
    //    but if a 403 slips through (e.g. server-side policy change), we swallow
    //    it cleanly without triggering any popup or throwing to the caller. ──
    if (response.status === 403) {
      console.warn(
        `[API] Silent 403 on ${method} ${endpoint} — ` +
        'firewall did not pre-block; absorbing without modal.'
      );
      return { success: false, forbidden: true, data: [] };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.error ||
        errorData.message ||
        `Server error (${response.status})`;
      return Promise.reject(message);
    }

    // Auto-unwrap { success: true, data: [...] } envelope
    const data = await response.json();
    if (
      data &&
      typeof data === 'object' &&
      data.success === true &&
      data.data !== undefined
    ) {
      return data.data;
    }

    return data;
  } catch (error) {
    const errMsg =
      error instanceof Error ? error.message : String(error);

    console.error(`API Call failed [${method} ${endpoint}]:`, errMsg);

    // Do NOT show a popup for firewall-originated or forbidden responses that
    // were already returned as structured objects above.
    if (
      !errMsg.includes('Access Forbidden') &&
      !errMsg.includes('Module Restricted') &&
      !errMsg.includes('firewallBlocked') &&
      !errMsg.includes('forbidden')
    ) {
      swalError('Error', errMsg || 'Network connection failed.');
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// PUBLIC API SURFACE
// ---------------------------------------------------------------------------
export const api = {
  // Live Stock (Cattle)
  cattle: {
    getAll:              ()         => apiRequest('/api/cattle'),
    create:              (data)     => apiRequest('/api/cattle', 'POST', data),
    update:              (id, data) => apiRequest(`/api/cattle/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/cattle/${id}`, 'DELETE'),
  },

  // Crossing Log
  crossing: {
    getAll:              ()         => apiRequest('/api/crossing'),
    create:              (data)     => apiRequest('/api/crossing', 'POST', data),
    update:              (id, data) => apiRequest(`/api/crossing/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/crossing/${id}`, 'DELETE'),
  },

  // Health Logs (Treatments & Vaccinations)
  health: {
    treatments: {
      getAll:            ()         => apiRequest('/api/health/treatments'),
      create:            (data)     => apiRequest('/api/health/treatments', 'POST', data),
      update:            (id, data) => apiRequest(`/api/health/treatments/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/health/treatments/${id}`, 'DELETE'),
    },
    vaccinations: {
      getAll:            ()         => apiRequest('/api/health/vaccinations'),
      create:            (data)     => apiRequest('/api/health/vaccinations', 'POST', data),
      update:            (id, data) => apiRequest(`/api/health/vaccinations/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/health/vaccinations/${id}`, 'DELETE'),
    },
  },

  // Inventory Modules (Medicine & Feed)
  inventory: {
    medicines: {
      getAll:            ()         => apiRequest('/api/inventory/medicines'),
      create:            (data)     => apiRequest('/api/inventory/medicines', 'POST', data),
      update:            (id, data) => apiRequest(`/api/inventory/medicines/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/inventory/medicines/${id}`, 'DELETE'),
    },
    feed: {
      getAll:            ()         => apiRequest('/api/inventory/feed'),
      create:            (data)     => apiRequest('/api/inventory/feed', 'POST', data),
      update:            (id, data) => apiRequest(`/api/inventory/feed/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/inventory/feed/${id}`, 'DELETE'),
    },
  },

  // Operations Modules (Grass Collection & Daily Feeding)
  operations: {
    grassCollection: {
      getAll:            ()         => apiRequest('/api/operations/grass-collection'),
      create:            (data)     => apiRequest('/api/operations/grass-collection', 'POST', data),
      update:            (id, data) => apiRequest(`/api/operations/grass-collection/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/operations/grass-collection/${id}`, 'DELETE'),
    },
    dailyFeeding: {
      getAll:            ()         => apiRequest('/api/operations/daily-feeding'),
      create:            (data)     => apiRequest('/api/operations/daily-feeding', 'POST', data),
      update:            (id, data) => apiRequest(`/api/operations/daily-feeding/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/operations/daily-feeding/${id}`, 'DELETE'),
    },
  },

  // Milk Production Modules (Collections & Quality)
  milk: {
    collections: {
      getAll:            ()         => apiRequest('/api/milk/collections'),
      create:            (data)     => apiRequest('/api/milk/collections', 'POST', data),
      update:            (id, data) => apiRequest(`/api/milk/collections/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/milk/collections/${id}`, 'DELETE'),
    },
    quality: {
      getAll:            ()         => apiRequest('/api/milk/quality'),
      create:            (data)     => apiRequest('/api/milk/quality', 'POST', data),
      update:            (id, data) => apiRequest(`/api/milk/quality/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/milk/quality/${id}`, 'DELETE'),
    },
  },

  // Users
  users: {
    getAll:              ()         => apiRequest('/api/users'),
    create:              (data)     => apiRequest('/api/users', 'POST', data),
    update:              (id, data) => apiRequest(`/api/users/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/users/${id}`, 'DELETE'),
  },

  // Departments
  departments: {
    getAll:              ()         => apiRequest('/api/departments'),
    create:              (data)     => apiRequest('/api/departments', 'POST', data),
    update:              (id, data) => apiRequest(`/api/departments/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/departments/${id}`, 'DELETE'),
  },

  // Farms
  farms: {
    getAll:              ()         => apiRequest('/api/farms'),
    create:              (data)     => apiRequest('/api/farms', 'POST', data),
    update:              (id, data) => apiRequest(`/api/farms/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/farms/${id}`, 'DELETE'),
  },

  // Sheds
  sheds: {
    getAll:              ()         => apiRequest('/api/sheds'),
    create:              (data)     => apiRequest('/api/sheds', 'POST', data),
    update:              (id, data) => apiRequest(`/api/sheds/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/sheds/${id}`, 'DELETE'),
  },

  // Tags
  tags: {
    getAll:              ()         => apiRequest('/api/tags'),
    create:              (data)     => apiRequest('/api/tags', 'POST', data),
    update:              (id, data) => apiRequest(`/api/tags/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/tags/${id}`, 'DELETE'),
  },

  // Roles
  roles: {
    getAll:              ()         => apiRequest('/api/roles'),
    create:              (data)     => apiRequest('/api/roles', 'POST', data),
    update:              (id, data) => apiRequest(`/api/roles/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/roles/${id}`, 'DELETE'),
  },
};
