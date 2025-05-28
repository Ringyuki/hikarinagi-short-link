import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkService } from '@/lib/shortlink-service';
import { validateSessionFromRequest } from '@/lib/auth';

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
    const link = ShortLinkService.getLinkById(parseInt(id));

    if (!link) {
      return NextResponse.json({
        success: false,
        error: '链接不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: link
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

    const link = ShortLinkService.updateLink(parseInt(id), body);

    if (!link) {
      return NextResponse.json({
        success: false,
        error: '链接不存在'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: link
    });
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
    const success = ShortLinkService.deleteLink(parseInt(id));

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