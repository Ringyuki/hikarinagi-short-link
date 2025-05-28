import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 数据库路径配置
const getDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    // 生产环境：尝试使用临时目录
    const tmpDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return path.join(tmpDir, 'shortlinks.db');
  } else {
    // 开发环境
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'shortlinks.db');
  }
};

const dbPath = getDbPath();
console.log('数据库路径:', dbPath);

let db: Database.Database;

try {
  db = new Database(dbPath);
  
  // 设置数据库配置
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 1000000');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
  
} catch (error) {
  console.error('数据库初始化失败:', error);
  throw new Error('无法初始化数据库');
}

// 创建表结构
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      short_code TEXT UNIQUE NOT NULL,
      original_url TEXT NOT NULL,
      title TEXT,
      description TEXT,
      clicks INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      is_active BOOLEAN DEFAULT 1,
      user_ip TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS click_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER NOT NULL,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      user_agent TEXT,
      referer TEXT,
      country TEXT,
      city TEXT,
      FOREIGN KEY (link_id) REFERENCES links (id)
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
    CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);
    CREATE INDEX IF NOT EXISTS idx_click_analytics_link_id ON click_analytics(link_id);
    CREATE INDEX IF NOT EXISTS idx_click_analytics_clicked_at ON click_analytics(clicked_at);
    CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
  `);
} catch (error) {
  console.error('创建表结构失败:', error);
}

// 初始化默认管理员账号
try {
  const checkAdmin = db.prepare('SELECT COUNT(*) as count FROM admin_users WHERE username = ?');
  const adminExists = checkAdmin.get('admin') as { count: number };

  if (adminExists.count === 0) {
    const insertAdmin = db.prepare('INSERT INTO admin_users (username, password) VALUES (?, ?)');
    insertAdmin.run('admin', 'admin123');
    console.log('默认管理员账号已创建: admin/admin123');
  }
} catch (error) {
  console.error('初始化管理员账号失败:', error);
}

export interface Link {
  id: number;
  short_code: string;
  original_url: string;
  title?: string;
  description?: string;
  clicks: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  is_active: boolean;
  user_ip?: string;
  user_agent?: string;
}

export interface ClickAnalytics {
  id: number;
  link_id: number;
  clicked_at: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  country?: string;
  city?: string;
}

export interface AdminUser {
  id: number;
  username: string;
  password: string;
  created_at: string;
  updated_at: string;
}

export default db; 