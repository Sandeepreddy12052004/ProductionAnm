import { toast } from 'react-hot-toast';

const BASE_URL = 'https://farm.agasthyanutromilk.com';

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
        'authorization': `Bearer ${token}`,
      },
    });

    // If the authentication endpoint rejects the token, it is dead
    if (response.status === 401) {
      return false;
    }
    return true; // Any other response means the token is active/valid!
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
    headers['authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // Differentiate session invalidation (401) and resource authorization (401/403)
    if (response.status === 401 || response.status === 403) {
      // 1. If we are already verifying the token, check status directly
      if (endpoint === '/api/auth/verify' || endpoint === '/api/auth/me') {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('token');
        toast.error('Session expired. Please login again.');
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
        return null;
      }

      // 2. Perform a lazy validation of the user token session
      const isSessionActive = await verifyTokenSession(token);

      if (!isSessionActive) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('token');
        toast.error('Session expired. Please login again.');
        if (window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
        return null;
      }

      // 3. Session is valid, but the user is unauthorized/forbidden for this specific operational module
      const errorMsg = response.status === 403
        ? 'Access Forbidden: You do not have permissions to view this module.'
        : 'Module Restricted: You are not authorized to view this operational section.';
      
      toast.error(errorMsg);
      throw new Error(errorMsg);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || `Server error (${response.status})`;
      throw new Error(message);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  } catch (error) {
    console.error(`API Call failed [${method} ${endpoint}]:`, error);
    // Suppress redundant error toasts if we already displayed detailed authorization toast
    if (!error.message.includes('Access Forbidden') && !error.message.includes('Module Restricted')) {
      toast.error(error.message || 'Network connection failed.');
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
};
