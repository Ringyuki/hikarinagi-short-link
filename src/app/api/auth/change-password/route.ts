import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, updateAdminPassword, validateSessionFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 验证会话
    if (!validateSessionFromRequest(request)) {
      return NextResponse.json({
        success: false,
        error: '未授权访问'
      }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        success: false,
        error: '当前密码和新密码不能为空'
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({
        success: false,
        error: '新密码长度至少6位'
      }, { status: 400 });
    }

    // 验证当前密码
    const isCurrentPasswordValid = await validateCredentials('admin', currentPassword);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({
        success: false,
        error: '当前密码错误'
      }, { status: 400 });
    }

    // 更新密码
    const success = await updateAdminPassword('admin', newPassword);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '密码修改成功'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '密码修改失败'
      }, { status: 500 });
    }
  } catch {
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 });
  }
} 