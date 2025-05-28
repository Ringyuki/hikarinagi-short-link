import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkService } from '@/lib/shortlink-service';
import { validateSessionFromRequest } from '@/lib/auth';

// 数据转换函数：将 Prisma 数据转换为前端期望的格式
function transformLinkData(link: any) {
  return {
    id: link.id,
    short_code: link.shortCode,
    original_url: link.originalUrl,
    title: link.title,
    description: link.description,
    clicks: link.clicks,
    created_at: link.createdAt.toISOString(),
    updated_at: link.updatedAt.toISOString(),
    expires_at: link.expiresAt ? link.expiresAt.toISOString() : null,
    is_active: link.isActive,
    user_ip: link.userIp,
    user_agent: link.userAgent
  };
}

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

    const result = await ShortLinkService.getAllLinks(page, limit);
    
    // 转换数据格式
    const transformedResult = {
      ...result,
      links: result.links.map(transformLinkData)
    };
    
    return NextResponse.json({
      success: true,
      data: transformedResult
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

    const link = await ShortLinkService.createShortLink({
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
      data: transformLinkData(link)
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '创建短链接失败';
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 400 });
  }
} 