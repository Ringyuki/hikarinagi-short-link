import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromRequest } from '@/lib/auth';
import DatabaseService from '@/lib/database-service';

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 验证会话
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { id } = await params;
    const linkId = parseInt(id);

    if (isNaN(linkId)) {
      return NextResponse.json({
        success: false,
        error: '无效的链接ID'
      }, { status: 400 });
    }

    const link = await DatabaseService.getLinkById(linkId);

    if (!link) {
      return NextResponse.json({
        success: false,
        error: '链接不存在'
      }, { status: 404 });
    }

    const transformedLink = {
      id: link.id,
      short_code: link.shortCode,
      original_url: link.originalUrl,
      title: link.title,
      description: link.description,
      clicks: link.clicks,
      created_at: link.createdAt.toISOString(),
      updated_at: link.updatedAt.toISOString(),
      expires_at: link.expiresAt?.toISOString() || null,
      is_active: link.isActive,
      user_ip: link.userIp,
      user_agent: link.userAgent,
      click_analytics: link.clickAnalytics?.map(click => ({
        id: click.id,
        link_id: click.linkId,
        clicked_at: click.clickedAt.toISOString(),
        ip_address: click.ipAddress,
        user_agent: click.userAgent,
        referer: click.referer,
        country: click.country,
        city: click.city
      })) || []
    };

    return NextResponse.json({
      success: true,
      data: transformedLink
    });

  } catch (error) {
    console.error('获取链接详情失败:', error);
    return NextResponse.json({
      success: false,
      error: '获取链接详情失败'
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
  { params }: RouteParams
) {
  try {
    // 验证会话
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { id } = await params;
    const linkId = parseInt(id);

    if (isNaN(linkId)) {
      return NextResponse.json({
        success: false,
        error: '无效的链接ID'
      }, { status: 400 });
    }

    // 检查是否为硬删除
    const { searchParams } = new URL(request.url);
    const hard = searchParams.get('hard') === 'true';

    if (hard) {
      // 硬删除（物理删除）
      await DatabaseService.hardDeleteLink(linkId);
      return NextResponse.json({
        success: true,
        message: '链接已永久删除'
      });
    } else {
      // 软删除
      await DatabaseService.deleteLink(linkId);
      return NextResponse.json({
        success: true,
        message: '链接已删除'
      });
    }

  } catch (error) {
    console.error('删除链接失败:', error);
    return NextResponse.json({
      success: false,
      error: '删除链接失败'
    }, { status: 500 });
  }
} 