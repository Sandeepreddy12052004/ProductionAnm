import { swalError } from './swal';

const BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://farm.agasthyanutromilk.com';

/**
 * Asynchronously verify if the token itself is dead/expired.
 * Hits a lightweight root validation endpoint to make sure we don't boot out active sessions
 * due to operational module restrictions or unauthorized responses.
 */
async function verifyTokenSession(token) {
  if (!token) return false;
  try {
    const response = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    // If the authentication endpoint rejects the token (401) or is missing (404), it is dead
    if (!response.ok) {
      return false;
    }
    return true; // Token is active/valid!
  } catch (error) {
    console.error('Session verify check failed due to network connection:', error);
    return true; // network failure shouldn't trigger an aggressive logout
  }
}

/**
 * Centered network fetch wrapper that auto-injects bearer token authorization
 * and handles standard backend errors elegantly.
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token && token !== 'undefined' && token !== 'null') {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
    cache: 'no-store', // Force no caching in Next.js/Browser
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

  try {
    const response = await fetch(`${BASE_URL}${finalEndpoint}`, config);

    // Strictly handle 401 Unauthorized (Token dead/missing)
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      swalError("Session Expired", "Please login again.");
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return { success: false, error: 'Session expired.' };
    }

    // Strictly handle 403 Forbidden (Role permissions insufficient)
    if (response.status === 403) {
      const errorMsg = 'Access Forbidden: You do not have permissions to view this module.';
      swalError("Access Denied", errorMsg);
      return { success: false, error: errorMsg };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Some backend responses put the generic message in "message" and the specific detail in "error".
      const message = errorData.error || errorData.message || `Server error (${response.status})`;
      return Promise.reject(message);
    }

    // Handle empty responses
    const data = await response.json();
    
    // Auto-unwrap the backend response if it follows the { success: true, data: [...] } structure
    if (data && typeof data === 'object' && data.success && data.data !== undefined) {
      return data.data;
    }
    
    return data;
  } catch (error) {
    console.error(`API Call failed [${method} ${endpoint}]:`, error);
    // Suppress redundant error toasts if we already displayed detailed authorization toast
    if (!error.message.includes('Access Forbidden') && !error.message.includes('Module Restricted')) {
      swalError("Error", error.message || 'Network connection failed.');
    }
    throw error;
  }
}

export const api = {
  // Live Stock (Cattle)
  cattle: {
    getAll: () => apiRequest('/api/cattle'),
    create: (data) => apiRequest('/api/cattle', 'POST', data),
    update: (id, data) => apiRequest(`/api/cattle/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/api/cattle/${id}`, 'DELETE'),
  },

  // Crossing Log
  crossing: {
    getAll: () => apiRequest('/api/crossing'),
    create: (data) => apiRequest('/api/crossing', 'POST', data),
    update: (id, data) => apiRequest(`/api/crossing/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/api/crossing/${id}`, 'DELETE'),
  },

  // Health Logs (Treatments & Vaccinations)
  health: {
    treatments: {
      getAll: () => apiRequest('/api/health/treatments'),
      create: (data) => apiRequest('/api/health/treatments', 'POST', data),
      update: (id, data) => apiRequest(`/api/health/treatments/${id}`, 'PUT', data),
      delete: (id) => apiRequest(`/api/health/treatments/${id}`, 'DELETE'),
    },
    vaccinations: {
      getAll: () => apiRequest('/api/health/vaccinations'),
      create: (data) => apiRequest('/api/health/vaccinations', 'POST', data),
      update: (id, data) => apiRequest(`/api/health/vaccinations/${id}`, 'PUT', data),
      delete: (id) => apiRequest(`/api/health/vaccinations/${id}`, 'DELETE'),
    },
  },

  // Inventory Modules (Medicine & Feed)
  inventory: {
    medicines: {
      getAll: () => apiRequest('/api/inventory/medicines'),
      create: (data) => apiRequest('/api/inventory/medicines', 'POST', data),
      update: (id, data) => apiRequest(`/api/inventory/medicines/${id}`, 'PUT', data),
      delete: (id) => apiRequest(`/api/inventory/medicines/${id}`, 'DELETE'),
    },
    feed: {
      getAll: () => apiRequest('/api/inventory/feed'),
      create: (data) => apiRequest('/api/inventory/feed', 'POST', data),
      update: (id, data) => apiRequest(`/api/inventory/feed/${id}`, 'PUT', data),
      delete: (id) => apiRequest(`/api/inventory/feed/${id}`, 'DELETE'),
    },
  },

  // Operations Modules (Grass Collection & Daily Feeding)
  operations: {
    grassCollection: {
      getAll: () => apiRequest('/api/operations/grass-collection'),
      create: (data) => apiRequest('/api/operations/grass-collection', 'POST', data),
      update: (id, data) => apiRequest(`/api/operations/grass-collection/${id}`, 'PUT', data),
      delete: (id) => apiRequest(`/api/operations/grass-collection/${id}`, 'DELETE'),
    },
    dailyFeeding: {
      getAll: () => apiRequest('/api/operations/daily-feeding'),
      create: (data) => apiRequest('/api/operations/daily-feeding', 'POST', data),
      update: (id, data) => apiRequest(`/api/operations/daily-feeding/${id}`, 'PUT', data),
      delete: (id) => apiRequest(`/api/operations/daily-feeding/${id}`, 'DELETE'),
    },
  },

  // Milk Production Modules (Collections & Quality)
  milk: {
    collections: {
      getAll: () => apiRequest('/api/milk/collections'),
      create: (data) => apiRequest('/api/milk/collections', 'POST', data),
      update: (id, data) => apiRequest(`/api/milk/collections/${id}`, 'PUT', data),
      delete: (id) => apiRequest(`/api/milk/collections/${id}`, 'DELETE'),
    },
    quality: {
      getAll: () => apiRequest('/api/milk/quality'),
      create: (data) => apiRequest('/api/milk/quality', 'POST', data),
      update: (id, data) => apiRequest(`/api/milk/quality/${id}`, 'PUT', data),
      delete: (id) => apiRequest(`/api/milk/quality/${id}`, 'DELETE'),
    },
  },

  // Users, Departments, Sheds, Tags
  users: {
    getAll: () => apiRequest('/api/users'),
    create: (data) => apiRequest('/api/users', 'POST', data),
    update: (id, data) => apiRequest(`/api/users/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/api/users/${id}`, 'DELETE'),
  },
  departments: {
    getAll: () => apiRequest('/api/departments'),
    create: (data) => apiRequest('/api/departments', 'POST', data),
    update: (id, data) => apiRequest(`/api/departments/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/api/departments/${id}`, 'DELETE'),
  },
  farms: {
    getAll: () => apiRequest('/api/farms'),
    create: (data) => apiRequest('/api/farms', 'POST', data),
    update: (id, data) => apiRequest(`/api/farms/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/api/farms/${id}`, 'DELETE'),
  },
  sheds: {
    getAll: () => apiRequest('/api/sheds'),
    create: (data) => apiRequest('/api/sheds', 'POST', data),
    update: (id, data) => apiRequest(`/api/sheds/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/api/sheds/${id}`, 'DELETE'),
  },
  tags: {
    getAll: () => apiRequest('/api/tags'),
    create: (data) => apiRequest('/api/tags', 'POST', data),
    update: (id, data) => apiRequest(`/api/tags/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/api/tags/${id}`, 'DELETE'),
  },
  roles: {
    getAll: () => apiRequest('/api/roles'),
    create: (data) => apiRequest('/api/roles', 'POST', data),
    update: (id, data) => apiRequest(`/api/roles/${id}`, 'PUT', data),
    delete: (id) => apiRequest(`/api/roles/${id}`, 'DELETE'),
  },
};
