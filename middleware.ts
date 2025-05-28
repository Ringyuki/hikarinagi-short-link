import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 检查是否访问管理页面
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // 检查是否有会话cookie
    const sessionCookie = request.cookies.get('admin_session');
    
    if (!sessionCookie) {
      // 没有会话，重定向到登录页面
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    try {
      // 验证会话是否有效
      const sessionData = JSON.parse(sessionCookie.value);
      
      // 检查是否过期
      if (Date.now() > sessionData.expiresAt) {
        // 会话过期，重定向到登录页面
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