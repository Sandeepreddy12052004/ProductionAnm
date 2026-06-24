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
    // If no permission array exists, redirect to profile
    if (pathname !== '/profile') {
      return NextResponse.redirect(new URL('/profile', request.url));
    }
    return NextResponse.next();
  }

  const hasAllAccess = permissions.some(p => typeof p === 'string' && p.trim().toUpperCase() === 'ALL');
  if (hasAllAccess) {
    return NextResponse.next();
  }

  // Helper function to check granular access
  const hasAccess = (moduleKey) => {
    const permission = permissions.find((p) => {
      if (!p) return false;
      if (typeof p === 'object') {
        return String(p.module_key || '').trim().toLowerCase() === moduleKey.trim().toLowerCase();
      }
      if (typeof p === 'string') {
        const lowerP = p.trim().toLowerCase();
        const lowerModKey = moduleKey.trim().toLowerCase();
        return lowerP === lowerModKey || lowerP.startsWith(lowerModKey + '_') || lowerP.includes(lowerModKey);
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
    { key: 'SHED_MANAGEMENT', match: pathname === '/shed-management' || pathname === '/line-management' },
    { key: 'CATTLE_MANAGEMENT', match: pathname === '/cattle-management' },
    { key: 'HEALTH_MANAGEMENT', match: pathname === '/health-management' },
    { key: 'FEED_ITEMS', match: pathname === '/feed-items' },
    { key: 'TAG_MANAGEMENT', match: pathname === '/tag-management' },
    { key: 'BREED_MANAGEMENT', match: pathname === '/breed-management' },
    { key: 'ANIMAL_MANAGEMENT', match: pathname === '/animal-management' },
    { key: 'LIVESTOCK', match: pathname === '/animals' },
    { key: 'SHED_LOG', match: pathname === '/shed' || pathname === '/shedlog' },
    { key: 'CROSSING_LOG', match: pathname === '/crossing' },
    { key: 'PURCHASE_LOG', match: pathname === '/purchase' },
    { key: 'SALE_LOG', match: pathname === '/sale' },
    { key: 'HEALTH', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'health' },
    { key: 'HEALTH', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'vaccine' },
    { key: 'INVENTORY', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'feed_inv' },
    { key: 'INVENTORY', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'med_inv' },
    { key: 'GRASS', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'grass' },
    { key: 'FEEDING', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'feeding' },
    { key: 'MILK', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'milk_prod' },
    { key: 'MILK', match: pathname.startsWith('/farm') && request.nextUrl.searchParams.get('tab') === 'components' }
  ];

  // Check if current route is matched and if user does not have access
  const matchedRoute = routesConfig.find(r => r.match);
  if (matchedRoute && !hasAccess(matchedRoute.key)) {
    // Intercept and dynamically redirect to their first accessible page
    const routeMappings = [
      { key: 'USER_MANAGEMENT', path: '/users' },
      { key: 'DEPARTMENT', path: '/department' },
      { key: 'ROLES', path: '/roles' },
      { key: 'FARM_MANAGEMENT', path: '/farms' },
      { key: 'SHED_MANAGEMENT', path: '/shed-management' },
      { key: 'CATTLE_MANAGEMENT', path: '/cattle-management' },
      { key: 'HEALTH_MANAGEMENT', path: '/health-management' },
      { key: 'FEED_ITEMS', path: '/feed-items' },
      { key: 'TAG_MANAGEMENT', path: '/tag-management' },
      { key: 'BREED_MANAGEMENT', path: '/breed-management' },
      { key: 'ANIMAL_MANAGEMENT', path: '/animal-management' },
      { key: 'LIVESTOCK', path: '/animals' },
      { key: 'SHED_LOG', path: '/shed' },
      { key: 'CROSSING_LOG', path: '/crossing' },
      { key: 'PURCHASE_LOG', path: '/purchase' },
      { key: 'SALE_LOG', path: '/sale' },
      { key: 'HEALTH', path: '/farm/tkp?tab=health' },
      { key: 'INVENTORY', path: '/farm/tkp?tab=feed_inv' },
      { key: 'GRASS', path: '/farm/tkp?tab=grass' },
      { key: 'FEEDING', path: '/farm/tkp?tab=feeding' },
      { key: 'MILK', path: '/farm/tkp?tab=milk_prod' }
    ];

    const firstAllowed = routeMappings.find(r => hasAccess(r.key));
    const targetPath = firstAllowed ? firstAllowed.path : '/profile';

    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|LOGO.png).*)'],
};
