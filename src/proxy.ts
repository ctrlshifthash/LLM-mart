import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/buy', '/sell'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const token = req.cookies.get('privy-token')?.value;
  if (token) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/markets';
  url.searchParams.set('login', '1');
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/buy/:path*', '/sell/:path*'],
};
