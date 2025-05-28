import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkService } from '@/lib/shortlink-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  try {
    const { shortCode } = await params;
    
    // 避免处理特殊路径
    if (shortCode === 'api' || shortCode === '_next' || shortCode === 'favicon.ico') {
      return new Response('Not Found', { status: 404 });
    }
    
    const link = await ShortLinkService.getLinkByShortCode(shortCode);

    if (!link) {
      return NextResponse.redirect(new URL('/not-found', request.url));
    }

    // 检查链接是否过期
    if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
      return NextResponse.redirect(new URL('/expired', request.url));
    }

    // 记录点击统计
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referer = request.headers.get('referer') || '';

    await ShortLinkService.recordClick(link.id, {
      ip_address: clientIP,
      user_agent: userAgent,
      referer: referer
    });

    // 重定向到原始链接
    return NextResponse.redirect(link.originalUrl);
  } catch {
    return NextResponse.redirect(new URL('/error', request.url));
  }
} 