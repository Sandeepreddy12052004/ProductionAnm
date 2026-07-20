import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Exclude public assets, static resources, API paths, and login page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/LOGO.png') ||
    pathname === '/login' ||
    pathname === '/404'
  ) {
    return NextResponse.next();
  }

  // 2. Read cookies
  const token = request.cookies.get('token')?.value;
  const userCookie = request.cookies.get('user')?.value;

  // 3. Redirect to login if token is missing
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  let userObj = null;
  if (userCookie) {
    try {
      userObj = JSON.parse(decodeURIComponent(userCookie));
    } catch (e) {
      console.error("[Middleware] User cookie parse error:", e);
    }
  }

  // If user object is missing, allow the request or redirect to login
  if (!userObj) {
    return NextResponse.next();
  }

  const role = String(userObj.role || '').trim().toUpperCase();
  if (role === 'SUPER_ADMIN') {
    return NextResponse.next();
  }

  const permissions = userObj.permissions;
  if (!Array.isArray(permissions)) {
    // If no permission array exists, redirect to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const hasAllAccess = permissions.some(p => typeof p === 'string' && p.trim().toUpperCase() === 'ALL');
  if (hasAllAccess) {
    return NextResponse.next();
  }

  // Helper function to check granular access
  const hasAccess = (moduleKey, exact = false) => {
    const permission = permissions.find((p) => {
      if (!p) return false;
      if (typeof p === 'object') {
        return String(p.module_key || '').trim().toLowerCase() === moduleKey.trim().toLowerCase();
      }
      if (typeof p === 'string') {
        const upperP = p.trim().toUpperCase();
        const upperModKey = moduleKey.trim().toUpperCase();
        
        if (exact) {
          return upperP === upperModKey;
        }

        const getBaseModule = (perm) => {
          const upper = perm.toUpperCase();
          const suffixes = ['_VIEW', '_CREATE', '_EDIT', '_DELETE'];
          for (const s of suffixes) {
            if (upper.endsWith(s)) {
              return upper.substring(0, upper.length - s.length);
            }
          }
          return upper;
        };

        const userModule = getBaseModule(upperP);
        return userModule === upperModKey;
      }
      return false;
    });

    if (!permission) return false;
    if (typeof permission === 'object') return !!permission.can_view;
    return true;
  };

  // Define route mapping key check based on the requested pathname
  const routesConfig = [
    { key: 'DASHBOARD', match: pathname === '/dashboard' || pathname === '/' },
    { key: 'USER_MANAGEMENT', match: pathname === '/users' },
    { key: 'DEPARTMENT', match: pathname === '/department' },
    { key: 'ROLES', match: pathname === '/roles' },
    { key: 'FARM_MANAGEMENT', match: pathname === '/farms' || pathname.startsWith('/farm-management') },
    { key: 'SHED_MANAGEMENT', baseKey: 'SHEDS', match: pathname === '/shed-management' },
    { key: 'LINE_MANAGEMENT', baseKey: 'SHEDS', match: pathname === '/line-management' },
    { key: 'CATTLE_MANAGEMENT', baseKey: 'CATTLE', match: pathname === '/cattle-management' },
    { key: 'HEALTH_MANAGEMENT', baseKey: 'HEALTH', match: pathname === '/health-management' },
    { key: 'FEED_ITEMS', baseKey: 'INVENTORY', match: pathname === '/feed-items' },
    { key: 'TAG_MANAGEMENT', baseKey: 'CATTLE', match: pathname === '/tag-management' },
    { key: 'BREED_MANAGEMENT', baseKey: 'CATTLE', match: pathname === '/breed-management' },
    { key: 'ANIMAL_MANAGEMENT', baseKey: 'CATTLE', match: pathname === '/animal-management' },
    { key: 'LIVESTOCK', baseKey: 'CATTLE', match: pathname === '/animals' },
    { key: 'SHED_LOG', match: pathname === '/shed' || pathname === '/shedlog' },
    { key: 'CROSSING_LOG', match: pathname === '/crossing' },
    { key: 'PURCHASE_LOG', match: pathname === '/purchase' },
    { key: 'SALE_LOG', match: pathname === '/sale' },
    { key: 'TREATMENT_LOG', baseKey: 'HEALTH', match: pathname === '/treatment' || (pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'health') },
    { key: 'VACCINATION_LOG', baseKey: 'HEALTH', match: pathname === '/vaccination' || (pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'vaccine') },
    { key: 'FEED_INVENTORY', baseKey: 'INVENTORY', match: pathname === '/feed-inventory' || (pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'feed_inv') },
    { key: 'MEDICINE_INVENTORY', baseKey: 'INVENTORY', match: pathname === '/medicine-inventory' || (pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'med_inv') },
    { key: 'GRASS', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'grass' },
    { key: 'FEEDING', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'feeding' },
    { key: 'MILK_COLLECTION', baseKey: 'MILK', match: pathname === '/milk' || (pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'milk_prod') },
    { key: 'MILK_QA', baseKey: 'MILK', match: pathname === '/milk-quality' || (pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'components') },
    { key: 'MILK_PROCUREMENT', baseKey: 'MILK', match: pathname === '/milk-procurement' },
    { key: 'MILK_PERFORMANCE', baseKey: 'MILK_PRODUCTION', match: pathname === '/milking-performance' },
    { key: 'CROSSING_LOG', match: pathname === '/insemination' },
    { key: 'LAND_MANAGEMENT', match: pathname === '/land-management' || pathname.startsWith('/land-management') },
    { key: 'BMC_MANAGEMENT', match: pathname === '/bmc-management' || pathname.startsWith('/bmc-management') }
  ];

  const checkAccess = (r) => hasAccess(r.key) || (r.baseKey && hasAccess(r.baseKey, true));

  // Check if current route is matched and if user does not have access
  const matchedRoute = routesConfig.find(r => r.match);
  if (matchedRoute && !checkAccess(matchedRoute)) {
    // Intercept and dynamically redirect to their first accessible page
    const routeMappings = [
      { key: 'USER_MANAGEMENT', path: '/users' },
      { key: 'DEPARTMENT', path: '/department' },
      { key: 'ROLES', path: '/roles' },
      { key: 'FARM_MANAGEMENT', path: '/farms' },
      { key: 'SHED_MANAGEMENT', baseKey: 'SHEDS', path: '/shed-management' },
      { key: 'LINE_MANAGEMENT', baseKey: 'SHEDS', path: '/line-management' },
      { key: 'CATTLE_MANAGEMENT', baseKey: 'CATTLE', path: '/cattle-management' },
      { key: 'HEALTH_MANAGEMENT', baseKey: 'HEALTH', path: '/health-management' },
      { key: 'FEED_ITEMS', baseKey: 'INVENTORY', path: '/feed-items' },
      { key: 'TAG_MANAGEMENT', baseKey: 'CATTLE', path: '/tag-management' },
      { key: 'BREED_MANAGEMENT', baseKey: 'CATTLE', path: '/breed-management' },
      { key: 'ANIMAL_MANAGEMENT', baseKey: 'CATTLE', path: '/animal-management' },
      { key: 'LIVESTOCK', baseKey: 'CATTLE', path: '/animals' },
      { key: 'SHED_LOG', path: '/shed' },
      { key: 'CROSSING_LOG', path: '/crossing' },
      { key: 'PURCHASE_LOG', path: '/purchase' },
      { key: 'SALE_LOG', path: '/sale' },
      { key: 'TREATMENT_LOG', baseKey: 'HEALTH', path: '/treatment' },
      { key: 'VACCINATION_LOG', baseKey: 'HEALTH', path: '/vaccination' },
      { key: 'FEED_INVENTORY', baseKey: 'INVENTORY', path: '/feed-inventory' },
      { key: 'MEDICINE_INVENTORY', baseKey: 'INVENTORY', path: '/farm/tkp?tab=med_inv' },
      { key: 'GRASS', path: '/grass' },
      { key: 'FEEDING', path: '/farm/tkp?tab=feeding' },
      { key: 'MILK_COLLECTION', baseKey: 'MILK', path: '/farm/tkp?tab=milk_prod' },
      { key: 'MILK_QA', baseKey: 'MILK', path: '/farm/tkp?tab=components' },
      { key: 'MILK_PROCUREMENT', baseKey: 'MILK', path: '/milk-procurement' },
      { key: 'MILK_PERFORMANCE', baseKey: 'MILK_PRODUCTION', path: '/milking-performance' },
      { key: 'CROSSING_LOG', path: '/insemination' },
      { key: 'LAND_MANAGEMENT', path: '/land-management' },
      { key: 'BMC_MANAGEMENT', path: '/bmc-management' }
    ];

    const firstAllowed = routeMappings.find(r => checkAccess(r));
    const targetPath = firstAllowed ? firstAllowed.path : '/login';

    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|LOGO.png).*)'],
};
