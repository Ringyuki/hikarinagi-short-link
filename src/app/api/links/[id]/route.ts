import { NextRequest, NextResponse } from 'next/server';
import { validateSessionFromRequestAsync } from '@/lib/auth';
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
    if (!(await validateSessionFromRequestAsync(request))) {
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
    if (!(await validateSessionFromRequestAsync(request))) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const linkId = parseInt(id);
    if (isNaN(linkId)) {
      return NextResponse.json({
        success: false,
        error: '无效的链接ID'
      }, { status: 400 });
    }

    const { original_url, title, description, expires_at, is_active } = body || {};

    if (original_url) {
      try { new URL(original_url); } catch {
        return NextResponse.json({ success: false, error: '请输入有效的 URL' }, { status: 400 });
      }
    }

    const updated = await DatabaseService.updateLink(linkId, {
      originalUrl: original_url,
      title,
      description,
      expiresAt: typeof expires_at === 'string' ? new Date(expires_at) : expires_at === null ? null : undefined,
      isActive: typeof is_active === 'boolean' ? is_active : undefined,
    });

    const transformed = {
      id: updated.id,
      short_code: updated.shortCode,
      original_url: updated.originalUrl,
      title: updated.title,
      description: updated.description,
      clicks: updated.clicks,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString(),
      expires_at: updated.expiresAt?.toISOString() || null,
      is_active: updated.isActive,
      user_ip: updated.userIp,
      user_agent: updated.userAgent,
    };

    return NextResponse.json({ success: true, data: transformed });
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
    if (!(await validateSessionFromRequestAsync(request))) {
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