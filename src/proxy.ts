import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Лише UX-редирект за наявністю cookie. Справжня перевірка сесії — у layout і кожній Server Action.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/invoices/:path*', '/clients/:path*', '/settings/:path*'],
};
