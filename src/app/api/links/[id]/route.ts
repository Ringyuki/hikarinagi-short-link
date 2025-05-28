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
    user_agent: link.userAgent,
    clickAnalytics: link.clickAnalytics ? link.clickAnalytics.map((click: any) => ({
      id: click.id,
      linkId: click.linkId,
      clickedAt: click.clickedAt.toISOString(),
      ipAddress: click.ipAddress,
      userAgent: click.userAgent,
      referer: click.referer,
      country: click.country,
      city: click.city
    })) : undefined
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { id } = await params;
    const link = await ShortLinkService.getLinkById(parseInt(id));

    if (!link) {
      return NextResponse.json({
        success: false,
        error: '链接不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: transformLinkData(link)
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: '获取链接失败'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // 暂时返回错误，因为 updateLink 方法还未实现
    return NextResponse.json({
      success: false,
      error: '更新功能暂未实现'
    }, { status: 501 });
  } catch {
    return NextResponse.json({
      success: false,
      error: '更新链接失败'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证管理员权限
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { id } = await params;
    const success = await ShortLinkService.deleteLink(parseInt(id));

    if (!success) {
      return NextResponse.json({
        success: false,
        error: '链接不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '链接已删除'
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: '删除链接失败'
    }, { status: 500 });
  }
} 