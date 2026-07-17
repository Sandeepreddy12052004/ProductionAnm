/**
 * Helper to determine if the currently logged-in user has permission for a specific action on a module.
 * @param {string} prefix - Module prefix (e.g., 'PROCUREMENT_MANAGEMENT')
 * @param {string} baseToken - Module fallback baseToken (e.g., 'MILK', 'CATTLE')
 * @param {'view' | 'create' | 'edit' | 'delete'} action - Granular action permission to check
 * @returns {boolean}
 */
export function hasActionPermission(prefix, baseToken, action) {
  try {
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem("user") : null;
    if (!storedUser) return false;

    const user = JSON.parse(storedUser);
    const role = String(user.role || '').trim().toUpperCase();

    // SUPER_ADMIN override
    if (role === 'SUPER_ADMIN') return true;

    const permissions = user.permissions || [];
    if (permissions.some(p => String(p).trim().toUpperCase() === 'ALL')) return true;

    const actionUpper = action.toUpperCase();

    // Suffix checks (e.g., PROCUREMENT_MANAGEMENT_VIEW, PROCUREMENT_MANAGEMENT_CREATE)
    const checkToken = `${String(prefix || '').toUpperCase()}_${actionUpper}`;
    const checkBaseToken = String(baseToken || '').toUpperCase();

    return permissions.some(p => {
      const u = String(p).trim().toUpperCase();
      // Match direct granular token, baseToken, or baseToken + suffix
      return (
        u === checkToken ||
        u === checkBaseToken ||
        u === `${checkBaseToken}_${actionUpper}`
      );
    });
  } catch (e) {
    console.error("Error evaluating permission:", e);
    return false;
  }
}
