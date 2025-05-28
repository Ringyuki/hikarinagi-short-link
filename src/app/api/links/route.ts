import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkService } from '@/lib/shortlink-service';
import { validateSessionFromRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = ShortLinkService.getAllLinks(page, limit);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: '获取链接列表失败'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { original_url, title, description, expires_at, custom_code } = body;

    if (!original_url) {
      return NextResponse.json({
        success: false,
        error: '原始链接不能为空'
      }, { status: 400 });
    }

    // 验证 URL 格式
    try {
      new URL(original_url);
    } catch {
      return NextResponse.json({
        success: false,
        error: '请输入有效的 URL'
      }, { status: 400 });
    }

    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const link = ShortLinkService.createShortLink({
      original_url,
      title,
      description,
      expires_at,
      custom_code,
      user_ip: clientIP,
      user_agent: userAgent
    });

    return NextResponse.json({
      success: true,
      data: link
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建短链接失败';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 400 });
  }
} 