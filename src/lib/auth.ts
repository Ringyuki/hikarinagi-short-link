import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import DatabaseService from './database-service';

// 会话密钥
const SESSION_KEY = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 验证登录凭据
export async function validateCredentials(username: string, password: string): Promise<boolean> {
  const user = await DatabaseService.validateAdmin(username, password);
  return !!user;
}

// 获取管理员用户
export async function getAdminUser(username: string) {
  return await DatabaseService.getAdminUser(username);
}

// 更新管理员密码
export async function updateAdminPassword(username: string, newPassword: string): Promise<boolean> {
  try {
    await DatabaseService.changeAdminPassword(username, newPassword);
    return true;
  } catch {
    return false;
  }
}

// 创建会话
export async function createSession(username: string) {
  const cookieStore = await cookies();
  const sessionData = {
    username,
    loginTime: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };
  
  cookieStore.set(SESSION_KEY, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000
  });
}

// 验证会话
export async function validateSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_KEY);
    
    if (!sessionCookie) return false;
    
    const sessionData = JSON.parse(sessionCookie.value);
    
    // 检查是否过期
    if (Date.now() > sessionData.expiresAt) {
      await destroySession();
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// 销毁会话
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_KEY);
}

// 从请求中验证会话
export function validateSessionFromRequest(request: NextRequest): boolean {
  try {
    const sessionCookie = request.cookies.get(SESSION_KEY);
    
    if (!sessionCookie) return false;
    
    const sessionData = JSON.parse(sessionCookie.value);
    
    // 检查是否过期
    if (Date.now() > sessionData.expiresAt) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
} 