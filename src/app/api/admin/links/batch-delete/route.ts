import { NextRequest, NextResponse } from 'next/server';
import { ShortLinkService } from '@/lib/shortlink-service';
import { validateSessionFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const isAuthenticated = validateSessionFromRequest(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const { ids, hard } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '请选择要删除的链接' }, { status: 400 });
    }

    // 验证所有ID都是数字
    const linkIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (linkIds.length !== ids.length) {
      return NextResponse.json({ error: '无效的链接ID' }, { status: 400 });
    }

    let result;
    if (hard) {
      // 硬删除（物理删除）
      result = await ShortLinkService.hardDeleteLinks(linkIds);
      return NextResponse.json({
        success: true,
        message: `成功永久删除 ${result.deletedCount} 条链接`,
        deletedCount: result.deletedCount
      });
    } else {
      // 软删除
      let deletedCount = 0;
      for (const id of linkIds) {
        const success = await ShortLinkService.deleteLink(id);
        if (success) deletedCount++;
      }
      return NextResponse.json({
        success: true,
        message: `成功删除 ${deletedCount} 条链接`,
        deletedCount
      });
    }

  } catch (error) {
    console.error('批量删除链接失败:', error);
    return NextResponse.json(
      { error: '批量删除链接失败' },
      { status: 500 }
    );
  }
} 