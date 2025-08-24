import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';
import { validateSessionFromRequestAsync } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const isAuthenticated = await validateSessionFromRequestAsync(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    // 导出数据
    const exportData = await DataService.exportData();

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `shortlink-backup-${timestamp}.json`;

    // 返回JSON文件
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('导出数据失败:', error);
    return NextResponse.json(
      { error: '导出数据失败' },
      { status: 500 }
    );
  }
} 