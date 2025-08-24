import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import DatabaseService, { type ExportData } from '../src/lib/database-service'
import prisma from '../src/lib/prisma'

function printUsage() {
  console.log(`用法:\n  pnpm import:data <backup.json> [--overwrite|-o] [--batchSize=<n>|-b <n>]\n\n示例:\n  pnpm import:data ./backup.json\n  pnpm import:data ./backup.json --overwrite\n  pnpm import:data ./backup.json --batchSize=2000\n`)
}

function parseArgs(argv: string[]) {
  const args = argv.slice(2)
  let file: string | undefined
  let overwriteExisting = false
  let batchSize: number | undefined

  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--overwrite' || a === '-o') {
      overwriteExisting = true
    } else if (a.startsWith('--batchSize=')) {
      const v = Number(a.split('=')[1])
      if (!Number.isFinite(v) || v <= 0) throw new Error('batchSize 必须为正整数')
      batchSize = Math.floor(v)
    } else if (a === '--batchSize' || a === '-b') {
      const next = args[++i]
      if (!next) throw new Error('缺少 batchSize 的值')
      const v = Number(next)
      if (!Number.isFinite(v) || v <= 0) throw new Error('batchSize 必须为正整数')
      batchSize = Math.floor(v)
    } else if (a === '--help' || a === '-h') {
      printUsage()
      process.exit(0)
    } else if (a.startsWith('-')) {
      throw new Error(`未知参数: ${a}`)
    } else if (!file) {
      file = a
    } else {
      throw new Error(`多余的位置参数: ${a}`)
    }
  }

  if (!file) throw new Error('缺少备份文件路径')
  return { file, overwriteExisting, batchSize }
}

async function main() {
  try {
    const { file, overwriteExisting, batchSize } = parseArgs(process.argv)
    const full = path.resolve(process.cwd(), file)
    const buf = await fs.readFile(full)
    const json = JSON.parse(buf.toString())

    if (!json || typeof json !== 'object' || !json.data || !Array.isArray(json.data.links)) {
      throw new Error('备份文件格式不正确：缺少 data.links')
    }

    console.log(`[Import] 开始导入：${full}`)
    if (overwriteExisting) console.log('[Import] 覆盖模式：将先清空现有数据')
    if (batchSize) console.log(`[Import] 批大小：${batchSize}`)

    const res = await DatabaseService.importData(json as ExportData, { overwriteExisting, batchSize })
    console.log('[Import] 导入完成：')
    console.log(`- 链接 导入:${(res as any).imported.links} 跳过:${(res as any).skipped.links}`)
    console.log(`- 点击 导入:${(res as any).imported.clickAnalytics} 跳过:${(res as any).skipped.clickAnalytics}`)
  } catch (err) {
    console.error('[Import] 导入失败：', err instanceof Error ? err.message : err)
    printUsage()
    process.exitCode = 1
  } finally {
    try { await prisma.$disconnect() } catch {}
  }
}

main()


