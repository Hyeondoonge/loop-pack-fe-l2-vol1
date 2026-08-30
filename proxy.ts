import { NextResponse, type NextRequest } from 'next/server';
import { readSessionToken } from './app/api/_data/auth';
import { SESSION_COOKIE } from './app/api/_data/auth-cookies';

export function proxy(request: NextRequest) {
  const user = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (user !== null) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.nextUrl);
  loginUrl.searchParams.set('next', request.nextUrl.href);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/orders/:path*', '/mypage']
};
