/**
 * Helper to determine if the currently logged-in user has permission for a specific action on a module.
 * @param {string} prefix - Module prefix (e.g., 'PROCUREMENT_MANAGEMENT')
 * @param {string} baseToken - Module fallback baseToken (e.g., 'MILK', 'CATTLE')
 * @param {'view' | 'create' | 'edit' | 'delete'} action - Granular action permission to check
 * @returns {boolean}
 */
export function hasActionPermission(prefix, baseToken, action = 'view') {
  try {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    if (!storedUser) return false;

    const user = JSON.parse(storedUser);
    const role = String(user.role || '').trim().toUpperCase();

    // SUPER_ADMIN override
    if (role === 'SUPER_ADMIN') return true;

    const permissions = user.permissions || [];
    if (!Array.isArray(permissions)) return false;

    // Wildcard 'ALL' access
    if (permissions.some(p => (typeof p === 'string' ? p.trim().toUpperCase() : String(p?.name || p?.module_key || '').toUpperCase()) === 'ALL')) {
      return true;
    }

    const actionUpper = String(action || 'view').trim().toUpperCase();
    const actionLower = actionUpper.toLowerCase();
    const prefixUpper = String(prefix || '').trim().toUpperCase();
    const baseUpper = String(baseToken || '').trim().toUpperCase();

    return permissions.some(p => {
      if (!p) return false;

      // 1. Handle object-schema permission: { module_key: 'FARM_MANAGEMENT', can_view: true, ... }
      if (typeof p === 'object') {
        const modKey = String(p.module_key || p.module || p.name || p.prefix || '').trim().toUpperCase();
        const matchesModule = (prefixUpper && modKey === prefixUpper) || (baseUpper && modKey === baseUpper);

        if (matchesModule) {
          const val = p[`can_${actionLower}`] ?? p[actionLower] ?? p[actionUpper];
          if (val !== undefined) return Boolean(val);
          // If checking 'view' and no granular field exists, having the module grants view
          if (actionLower === 'view') return true;
          return false;
        }
        return false;
      }

      // 2. Handle string-schema permission: 'FARM_MANAGEMENT_VIEW', 'FARMS_VIEW', 'FARM_MANAGEMENT', 'FARMS'
      if (typeof p === 'string') {
        const u = p.trim().toUpperCase();
        const checkToken = prefixUpper ? `${prefixUpper}_${actionUpper}` : '';
        const checkBaseAction = baseUpper ? `${baseUpper}_${actionUpper}` : '';

        // Direct action match
        if (checkToken && u === checkToken) return true;
        if (checkBaseAction && u === checkBaseAction) return true;

        // Base token or module token itself
        if (prefixUpper && u === prefixUpper) {
          if (actionLower === 'view') return true;
        }
        if (baseUpper && u === baseUpper) {
          if (actionLower === 'view') return true;
        }

        // Substring / prefix check for view
        if (actionLower === 'view') {
          if (prefixUpper && (u.startsWith(`${prefixUpper}_`) || u.includes(prefixUpper))) return true;
          if (baseUpper && (u.startsWith(`${baseUpper}_`) || u.includes(baseUpper))) return true;
        }
      }

      return false;
    });
  } catch (e) {
    console.error("Error evaluating permission:", e);
    return false;
  }
}
