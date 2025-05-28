import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import db, { AdminUser } from './database';

// 会话密钥
const SESSION_KEY = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时

// 验证登录凭据
export function validateCredentials(username: string, password: string): boolean {
  const stmt = db.prepare('SELECT * FROM admin_users WHERE username = ? AND password = ?');
  const user = stmt.get(username, password) as AdminUser | undefined;
  return !!user;
}

// 获取管理员用户
export function getAdminUser(username: string): AdminUser | null {
  const stmt = db.prepare('SELECT * FROM admin_users WHERE username = ?');
  return stmt.get(username) as AdminUser | null;
}

// 更新管理员密码
export function updateAdminPassword(username: string, newPassword: string): boolean {
  try {
    const stmt = db.prepare('UPDATE admin_users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?');
    const result = stmt.run(newPassword, username);
    return result.changes > 0;
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