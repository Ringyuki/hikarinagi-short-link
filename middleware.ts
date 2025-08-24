import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from '@/lib/jwt';

export async function middleware(request: NextRequest) {
  // 检查是否访问管理页面
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // 检查是否有会话cookie
    const sessionCookie = request.cookies.get('admin_session');
    
    if (!sessionCookie) {
      // 没有会话，重定向到登录页面
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      // 验证 JWT 是否有效
      const payload = await verifySessionToken(sessionCookie.value);
      if (!payload) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('admin_session');
        return response;
      }
    } catch {
      // 会话数据无效，重定向到登录页面
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*']
};