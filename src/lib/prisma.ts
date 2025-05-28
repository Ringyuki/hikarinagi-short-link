import { PrismaClient } from '../generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

console.log('[Prisma] 初始化 Prisma 客户端...');
console.log('[Prisma] 环境变量 DATABASE_URL:', process.env.DATABASE_URL ? '已设置' : '未设置');
console.log('[Prisma] 当前环境:', process.env.NODE_ENV);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    {
      emit: 'stdout',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'info',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
})

// 测试数据库连接
prisma.$connect()
  .then(() => {
    console.log('[Prisma] 数据库连接成功');
  })
  .catch((error) => {
    console.error('[Prisma] 数据库连接失败:', error);
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma 