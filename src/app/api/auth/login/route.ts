import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, createSession } from '@/lib/auth';
import { initializeAdmin } from '@/lib/init-admin';

export async function POST(request: NextRequest) {  
  try {
    await initializeAdmin();
    
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '用户名和密码不能为空'
      }, { status: 400 });
    }

    const isValidCredentials = await validateCredentials(username, password);
    
    if (isValidCredentials) {
      await createSession(username);
      
      return NextResponse.json({
        success: true,
        message: '登录成功'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('[API] 登录过程中发生错误:', error);
    console.error('[API] 错误堆栈:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 });
  }
} 