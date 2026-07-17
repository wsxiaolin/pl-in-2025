// pl-in-2025 Data Sync Pipeline
// 数据同步流水线 — backend output → WASM encrypt → frontend assets

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const BACKEND_DIR = path.join(ROOT, 'backend')
const WASM_DIR = path.join(ROOT, 'wasm')
const WASM_DATA_DIR = path.join(WASM_DIR, 'data')
const WASM_BUILD_DIR = path.join(WASM_DIR, 'build')
const FRONTEND_WASM_ASSETS = path.join(ROOT, 'frontend', 'src', 'wasm', 'assets')
const FRONTEND_SRC_WASM = path.join(ROOT, 'frontend', 'src', 'wasm')

// Copy a file, creating parent directories as needed
// 复制文件，自动创建父目录
function copy(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`  ⚠  Missing: ${src}`)
    return false
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  console.log(`  ✓ ${path.relative(ROOT, src)} → ${path.relative(ROOT, dest)}`)
  return true
}

console.log('\n=== Data Sync Pipeline ===\n')

// Step 1: Copy output manifests from backend to wasm/data
// 步骤 1：将后端 output 清单复制到 wasm/data
console.log('[1/4] Backend → WASM data')
const outputFiles = ['discussions_output.txt', 'experiments_output.txt']
for (const file of outputFiles) {
  copy(path.join(BACKEND_DIR, file), path.join(WASM_DATA_DIR, file))
}

// Step 2: Run WASM preprocess to regenerate data.enc + AssemblyScript key file
// 步骤 2：运行 WASM 预处理，重新生成 data.enc 和 AssemblyScript 密钥文件
console.log('\n[2/4] Regenerating encrypted data (WASM preprocess)')
const { execSync } = await import('child_process')
try {
  execSync('npx tsx scripts/preprocess.ts data', {
    cwd: WASM_DIR,
    stdio: 'inherit',
  })
  console.log('  ✓ Preprocess completed')
} catch (e) {
  console.error('  ✗ Preprocess failed:', e.message)
  process.exit(1)
}

// Step 3: Rebuild WASM module (compiles AssemblyScript → .wasm)
// 步骤 3：重建 WASM 模块（AssemblyScript → .wasm）
console.log('\n[3/4] Rebuilding WASM module')
try {
  execSync('node scripts/build-wasm.js', {
    cwd: WASM_DIR,
    stdio: 'inherit',
  })
  console.log('  ✓ WASM build completed')
} catch (e) {
  console.error('  ✗ WASM build failed:', e.message)
  process.exit(1)
}

// Step 4: Copy build artifacts to frontend for dev / production
// 步骤 4：将构建产物复制到前端（开发 / 生产环境）
console.log('\n[4/4] WASM build → Frontend')
const artifacts = [
  ['pl_image_query.wasm', 'assets/pl_image_query.wasm'],
  ['data.enc', 'assets/data.enc'],
  ['meta.json', 'assets/meta.json'],
  ['pl_image_query.js', 'pl_image_query.js'],
]
for (const [srcName, destName] of artifacts) {
  const src = path.join(WASM_BUILD_DIR, srcName)
  const dest = path.join(FRONTEND_SRC_WASM, destName)
  copy(src, dest)
}

console.log('\n=== Sync Complete ===\n')
