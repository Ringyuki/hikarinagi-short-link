import DatabaseService from './database-service'

export async function initializeDatabase() {
  try {
    // 初始化默认管理员账号
    await DatabaseService.initializeDefaultAdmin()
    console.log('数据库初始化完成')
  } catch (error) {
    console.error('数据库初始化失败:', error)
    throw error
  }
}

export default initializeDatabase 