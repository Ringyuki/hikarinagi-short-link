import { NextRequest, NextResponse } from 'next/server';
import { DataService, ExportData } from '@/lib/data-service';
import { validateSessionFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const isAuthenticated = validateSessionFromRequest(request);
    if (!isAuthenticated) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const body = await request.json();
    const { data, options } = body;

    // 验证数据格式
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: '无效的数据格式' }, { status: 400 });
    }

    // 导入数据
    const result = await DataService.importData(data as ExportData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message,
        errors: result.errors
      }, { status: 400 });
    }

  } catch (error) {
    console.error('导入数据失败:', error);
    return NextResponse.json(
      { error: '导入数据失败' },
      { status: 500 }
    );
  }
} 