import { swalError } from './swal';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://farm.agasthyanutromilk.com/';

const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;


// ---------------------------------------------------------------------------
// ROUTE → PERMISSION KEY REGISTRY
// Maps every protected API path prefix to the module permission key that must
// have can_view === true (or be a string match) for the call to proceed.
// Add new entries here when new backend routes are introduced.
// ---------------------------------------------------------------------------
/** @type {Record<string, string>} */
// Each route maps to ONE OR MORE allowed permission keys.
// Any match grants access — mirrors the backend withAuth() logic.
/** @type {Record<string, string | string[]>} */
const ROUTE_PERMISSION_MAP = {
  '/api/farms':                        ['FARM_MANAGEMENT', 'FARM_ADMIN'],
  '/api/roles':                        ['ROLES', 'ROLE_MANAGEMENT'],
  '/api/users':                        ['USER_MANAGEMENT', 'FARM_ADMIN'],
  '/api/departments':                  ['DEPARTMENT', 'FARM_ADMIN'],
  '/api/sheds':                        ['SHED_MANAGEMENT', 'SHED', 'FARM_ADMIN', 'INCHARGE'],
  '/api/cattle':                       ['CATTLE_MANAGEMENT', 'CATTLE', 'LIVESTOCK', 'FARM_ADMIN'],
  '/api/crossing':                     ['CROSSING_LOG', 'CROSSING', 'FARM_ADMIN'],
  '/api/health/treatments':            ['HEALTH', 'INCHARGE', 'FARM_ADMIN'],
  '/api/treatments':                   ['HEALTH', 'INCHARGE', 'FARM_ADMIN'],
  '/api/health/vaccinations':          ['HEALTH', 'INCHARGE', 'FARM_ADMIN'],
  '/api/health/vaccines':              ['HEALTH', 'INCHARGE', 'FARM_ADMIN'],
  '/api/inventory/medicines':          ['INVENTORY', 'INCHARGE', 'FARM_ADMIN'],
  '/api/inventory/feed':               ['INVENTORY', 'INCHARGE', 'FARM_ADMIN'],
  '/api/operations/grass-collection':  ['GRASS', 'INCHARGE', 'FARM_ADMIN'],
  '/api/operations/daily-feeding':     ['FEEDING', 'INCHARGE', 'FARM_ADMIN'],
  '/api/milk/collections':             ['MILK', 'INCHARGE', 'FARM_ADMIN'],
  '/api/milk/procurement':             ['MILK', 'INCHARGE', 'FARM_ADMIN'],
  '/api/milk/quality':                 ['MILK', 'INCHARGE', 'FARM_ADMIN'],
  '/api/tags':                         ['CATTLE_MANAGEMENT', 'CATTLE', 'TAG_MANAGEMENT', 'FARM_ADMIN'],
  '/api/feed-items':                   ['FEED_ITEMS', 'FARM_ADMIN'],
  '/api/medicines':                    ['HEALTH', 'FARM_ADMIN', 'INCHARGE', 'INVENTORY'],
  '/api/breeds':                       ['BREED_MANAGEMENT', 'FARM_ADMIN'],
  '/api/animals':                      ['ANIMAL_MANAGEMENT', 'FARM_ADMIN', 'CATTLE'],
  '/api/lands':                        ['LAND', 'LAND_MANAGEMENT', 'FARM_ADMIN'],
  '/api/logs/crossing':                ['CROSSING_LOG', 'CROSSING', 'FARM_ADMIN'],
  '/api/logs/sale':                    ['SALE_LOG', 'SALE', 'FARM_ADMIN'],
  '/api/logs/shed':                    ['SHED_LOG', 'SHED', 'FARM_ADMIN'],
  '/api/logs/purchase':                ['PURCHASE_LOG', 'PURCHASE', 'FARM_ADMIN'],
  '/api/bmcs':                         ['BMC', 'FARM_ADMIN', 'INCHARGE'],
  '/api/semen-straws':                 ['CROSSING_LOG', 'CROSSING', 'FARM_ADMIN'],
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
function sessionHasAccess(userObj, moduleKeyOrKeys) {
  if (!userObj) return false;

  const role = String(userObj.role || '').trim().toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'FARM_ADMIN') return true;

  const permissions = userObj.permissions;
  if (!Array.isArray(permissions)) return false;

  // Global wildcard
  const hasAll = permissions.some(
    (p) => typeof p === 'string' && p.trim().toUpperCase() === 'ALL'
  );
  if (hasAll) return true;

  // Support single key or array of keys — any match grants access
  const keys = Array.isArray(moduleKeyOrKeys) ? moduleKeyOrKeys : [moduleKeyOrKeys];

  for (const moduleKey of keys) {
    const lowerKey = moduleKey.trim().toLowerCase();

    // Also check if the user's role string itself matches any key
    if (role === lowerKey.toUpperCase()) return true;

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

    if (matched) {
      // Object form: honour can_view explicitly
      if (typeof matched === 'object') {
        if (!!matched.can_view) return true;
      } else {
        // String form: presence means access granted
        return true;
      }
    }
  }

  return false;
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

  // Allow read-only (GET) requests for essential lookup tables to all authenticated users (mirrors backend authGuard)
  const isLookupPath =
    cleanPath === '/api/farms' || cleanPath.startsWith('/api/farms/') ||
    cleanPath === '/api/sheds' || cleanPath.startsWith('/api/sheds/') ||
    cleanPath === '/api/cattle' || cleanPath.startsWith('/api/cattle/') ||
    cleanPath === '/api/breeds' || cleanPath.startsWith('/api/breeds/') ||
    cleanPath === '/api/feed-items' || cleanPath.startsWith('/api/feed-items/') ||
    cleanPath === '/api/medicines' || cleanPath.startsWith('/api/medicines/') ||
    cleanPath === '/api/animals' || cleanPath.startsWith('/api/animals/') ||
    cleanPath === '/api/bmcs' || cleanPath.startsWith('/api/bmcs/') ||
    cleanPath === '/api/tags' || cleanPath.startsWith('/api/tags/');

  if (isLookupPath) {
    return null; // permitted -> pass-through
  }

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
    const response = await fetch(`${cleanBaseUrl}/api/auth/verify`, {
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

const inflightRequests = new Map();

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

  // ── 1. CLIENT-SIDE FIREWALL & DEDUPLICATION ──────────────────────────────
  if (method === 'GET') {
    const blocked = evaluateFirewall(endpoint);
    if (blocked) return blocked;

    // Return the active in-flight promise if a request to this endpoint is already running
    if (inflightRequests.has(endpoint)) {
      return inflightRequests.get(endpoint);
    }
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
  const promise = (async () => {
    try {
      const response = await fetch(`${cleanBaseUrl}${finalEndpoint}`, config);

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
      const responseData = await response.json();
      let finalData = responseData;
      if (
        responseData &&
        typeof responseData === 'object' &&
        responseData.success === true &&
        responseData.data !== undefined
      ) {
        finalData = responseData.data;
      }

      // Filter by farmId if user has a restricted farmId OR if they are global and have selected an active farm
      const userObj = getSessionUser();
      if (userObj && method === 'GET') {
        // Bypass active farm filtering if the user is on a specific farm's dashboard page
        let isFarmDashboard = false;
        try {
          if (typeof window !== 'undefined' && window.location && window.location.pathname) {
            isFarmDashboard = window.location.pathname.startsWith('/farm/');
          }
        } catch (e) {}

        if (isFarmDashboard) {
          return finalData; // skip filtering completely
        }

        const rawFarmId = userObj.farmId && typeof userObj.farmId === 'object'
          ? (userObj.farmId._id || userObj.farmId.id)
          : userObj.farmId;

        const isGlobal =
          !rawFarmId ||
          rawFarmId === 'ALL' ||
          String(userObj.role).toUpperCase() === 'SUPER_ADMIN';

        let restrictedFarmId = null;
        let isBypassedEndpoint = false;

        const cleanPath = endpoint.split('?')[0];

        if (!isGlobal) {
          // Restricted user: locked to their assigned farm
          restrictedFarmId = rawFarmId ? String(rawFarmId).trim() : null;
          isBypassedEndpoint =
            cleanPath === '/api/users' ||
            cleanPath.startsWith('/api/users/') ||
            cleanPath === '/api/roles' ||
            cleanPath.startsWith('/api/roles/') ||
            cleanPath === '/api/departments' ||
            cleanPath.startsWith('/api/departments/') ||
            cleanPath === '/api/feed-items' ||
            cleanPath.startsWith('/api/feed-items/') ||
            cleanPath === '/api/labors' ||
            cleanPath.startsWith('/api/labors/') ||
            cleanPath === '/api/designations' ||
            cleanPath.startsWith('/api/designations/');
        } else {
          // Global user: filter by the selected active farm if set (and not 'ALL')
          let activeFarmId = 'ALL';
          try {
            if (typeof window !== 'undefined' && window.location && window.location.pathname) {
              const pageKey = '__active_farm_id_' + window.location.pathname.replace(/\//g, '_') + '__';
              activeFarmId = localStorage.getItem(pageKey) || localStorage.getItem('__active_farm_id__') || 'ALL';
            } else {
              activeFarmId = localStorage.getItem('__active_farm_id__') || 'ALL';
            }
          } catch (e) {
            activeFarmId = localStorage.getItem('__active_farm_id__') || 'ALL';
          }
          if (activeFarmId && activeFarmId !== 'ALL') {
            restrictedFarmId = String(activeFarmId).trim();
          }
          // Global user must NOT have administrative, auth, or global catalog endpoints filtered
          isBypassedEndpoint =
            cleanPath === '/api/farms' ||
            cleanPath.startsWith('/api/farms/') ||
            cleanPath.startsWith('/api/auth') ||
            cleanPath === '/api/feed-items' ||
            cleanPath.startsWith('/api/feed-items/') ||
            cleanPath === '/api/users' ||
            cleanPath.startsWith('/api/users/') ||
            cleanPath === '/api/roles' ||
            cleanPath.startsWith('/api/roles/') ||
            cleanPath === '/api/departments' ||
            cleanPath.startsWith('/api/departments/') ||
            cleanPath === '/api/breeds' ||
            cleanPath.startsWith('/api/breeds/') ||
            cleanPath === '/api/animals' ||
            cleanPath.startsWith('/api/animals/') ||
            cleanPath === '/api/medicines' ||
            cleanPath.startsWith('/api/medicines/') ||
            cleanPath === '/api/tags' ||
            cleanPath.startsWith('/api/tags/') ||
            cleanPath === '/api/labors' ||
            cleanPath.startsWith('/api/labors/') ||
            cleanPath === '/api/designations' ||
            cleanPath.startsWith('/api/designations/') ||
            cleanPath === '/api/lands' ||
            cleanPath.startsWith('/api/lands/') ||
            cleanPath === '/api/bmcs' ||
            cleanPath.startsWith('/api/bmcs/') ||
            cleanPath === '/api/semen-straws' ||
            cleanPath.startsWith('/api/semen-straws/');
        }

        if (restrictedFarmId && !isBypassedEndpoint) {
          // Helper to check if item matches the restricted farm
          const matchesRestrictedFarm = (item) => {
            if (!item) return false;

            const itemFarmId = item.farmId && typeof item.farmId === 'object'
              ? (item.farmId._id || item.farmId.id)
              : item.farmId;

            const itemFarm = item.farm && typeof item.farm === 'object'
              ? (item.farm._id || item.farm.id)
              : item.farm;

            // If the item explicitly has a farmId or farm, it must match.
            if (itemFarmId && String(itemFarmId).trim() !== restrictedFarmId) {
              return false;
            }
            if (itemFarm && String(itemFarm).trim() !== restrictedFarmId) {
              return false;
            }

            // If the item itself is a farm object (returned from /api/farms), check its own ID
            // Only apply this check if the endpoint is actually querying farms.
            const isFarm = cleanPath.startsWith('/api/farms');
            if (isFarm) {
              const farmId = item._id || item.id;
              if (String(farmId).trim() !== restrictedFarmId) {
                return false;
              }
            }

            return true;
          };

          if (Array.isArray(finalData)) {
            finalData = finalData.filter(matchesRestrictedFarm);
          } else if (finalData && typeof finalData === 'object') {
            // Single record checks
            if (!matchesRestrictedFarm(finalData)) {
              const hasFarmField = finalData.farmId || finalData.farm;
              if (hasFarmField) {
                return null;
              }
            }
          }
        }
      }

      return finalData;
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
    } finally {
      if (method === 'GET') {
        inflightRequests.delete(endpoint);
      }
    }
  })();

  if (method === 'GET') {
    inflightRequests.set(endpoint, promise);
  }

  return promise;
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
    vaccines: {
      getAll:            ()         => apiRequest('/api/health/vaccines'),
      create:            (data)     => apiRequest('/api/health/vaccines', 'POST', data),
      update:            (id, data) => apiRequest(`/api/health/vaccines/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/health/vaccines/${id}`, 'DELETE'),
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
      bulkCreate:        (data)     => apiRequest('/api/operations/daily-feeding/bulk', 'POST', data),
    },
  },

  // Milk Production Modules (Collections & Quality)
  milk: {
    collections: {
      getAll:            ()         => apiRequest('/api/milk/collections'),
      create:            (data)     => apiRequest('/api/milk/collections', 'POST', data),
      update:            (id, data) => apiRequest(`/api/milk/collections/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/milk/collections/${id}`, 'DELETE'),
      bulkCreate:        (data)     => apiRequest('/api/milk/collections/bulk', 'POST', data),
    },
    procurement: {
      getAll:            ()         => apiRequest('/api/milk/procurement'),
      create:            (data)     => apiRequest('/api/milk/procurement', 'POST', data),
      update:            (id, data) => apiRequest(`/api/milk/procurement/${id}`, 'PUT', data),
      delete:            (id)       => apiRequest(`/api/milk/procurement/${id}`, 'DELETE'),
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
    getCapacity:         (id)       => apiRequest(`/api/farms/${id}/capacity`),
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
    getAllSuffixes:      ()         => apiRequest('/api/tags/suffixes'),
    createSuffix:        (data)     => apiRequest('/api/tags/suffixes', 'POST', data),
    deleteSuffix:        (id)       => apiRequest(`/api/tags/suffixes/${id}`, 'DELETE'),
  },

  // Roles
  roles: {
    getAll:              ()         => apiRequest('/api/roles'),
    create:              (data)     => apiRequest('/api/roles', 'POST', data),
    update:              (id, data) => apiRequest(`/api/roles/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/roles/${id}`, 'DELETE'),
    getModules:          ()         => apiRequest('/api/roles/modules'),
  },



  // Operational logs (stored in database)
  shed: {
    getAll:              ()         => apiRequest('/api/logs/shed'),
    create:              (data)     => apiRequest('/api/logs/shed', 'POST', data),
    update:              (id, data) => apiRequest(`/api/logs/shed/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/logs/shed/${id}`, 'DELETE'),
  },
  purchase: {
    getAll:              ()         => apiRequest('/api/logs/purchase'),
    create:              (data)     => apiRequest('/api/logs/purchase', 'POST', data),
    update:              (id, data) => apiRequest(`/api/logs/purchase/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/logs/purchase/${id}`, 'DELETE'),
  },
  sale: {
    getAll:              ()         => apiRequest('/api/logs/sale'),
    create:              (data)     => apiRequest('/api/logs/sale', 'POST', data),
    update:              (id, data) => apiRequest(`/api/logs/sale/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/logs/sale/${id}`, 'DELETE'),
  },
  
  // Feed Items Configuration
  feedItems: {
    getAll:              ()         => apiRequest('/api/feed-items'),
    create:              (data)     => apiRequest('/api/feed-items', 'POST', data),
    update:              (id, data) => apiRequest(`/api/feed-items/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/feed-items/${id}`, 'DELETE'),
  },

  // Breed Management Configuration
  breeds: {
    getAll:              ()         => apiRequest('/api/breeds'),
    create:              (data)     => apiRequest('/api/breeds', 'POST', data),
    update:              (id, data) => apiRequest(`/api/breeds/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/breeds/${id}`, 'DELETE'),
  },

  // Animal Management Configuration
  animals: {
    getAll:              ()         => apiRequest('/api/animals'),
    create:              (data)     => apiRequest('/api/animals', 'POST', data),
    update:              (id, data) => apiRequest(`/api/animals/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/animals/${id}`, 'DELETE'),
  },

  // Medicines Configuration
  medicines: {
    getAll:              ()         => apiRequest('/api/medicines'),
    create:              (data)     => apiRequest('/api/medicines', 'POST', data),
    update:              (id, data) => apiRequest(`/api/medicines/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/medicines/${id}`, 'DELETE'),
  },

  // Treatment Management Configuration
  treatments: {
    getAll:              ()         => apiRequest('/api/treatments'),
    create:              (data)     => apiRequest('/api/treatments', 'POST', data),
    update:              (id, data) => apiRequest(`/api/treatments/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/treatments/${id}`, 'DELETE'),
  },

  // Designation Management Configuration
  designations: {
    getAll:              ()         => apiRequest('/api/designations'),
    create:              (data)     => apiRequest('/api/designations', 'POST', data),
    update:              (id, data) => apiRequest(`/api/designations/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/designations/${id}`, 'DELETE'),
  },

  // Labor Management Configuration
  labors: {
    getAll:              ()         => apiRequest('/api/labors'),
    create:              (data)     => apiRequest('/api/labors', 'POST', data),
    update:              (id, data) => apiRequest(`/api/labors/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/labors/${id}`, 'DELETE'),
  },

  // Land Management Configuration
  lands: {
    getAll:              ()         => apiRequest('/api/lands'),
    create:              (data)     => apiRequest('/api/lands', 'POST', data),
    update:              (id, data) => apiRequest(`/api/lands/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/lands/${id}`, 'DELETE'),
  },

  // Bulk Milk Cooler Configuration
  bmcs: {
    getAll:              ()         => apiRequest('/api/bmcs'),
    create:              (data)     => apiRequest('/api/bmcs', 'POST', data),
    update:              (id, data) => apiRequest(`/api/bmcs/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/bmcs/${id}`, 'DELETE'),
  },

  // Insemination Straw Configuration
  semenStraws: {
    getAll:              ()         => apiRequest('/api/semen-straws'),
    get:                 (id)       => apiRequest(`/api/semen-straws/${id}`),
    create:              (data)     => apiRequest('/api/semen-straws', 'POST', data),
    update:              (id, data) => apiRequest(`/api/semen-straws/${id}`, 'PUT', data),
    delete:              (id)       => apiRequest(`/api/semen-straws/${id}`, 'DELETE'),
  },
};
