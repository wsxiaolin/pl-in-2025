/**
 * WASM Build Script / WASM 构建脚本
 *
 * Compiles AssemblyScript to WASM with JS glue code
 * 编译 AssemblyScript 为 WASM，生成 JS 胶水代码
 *
 * Usage / 用法: node scripts/build-wasm.js
 */
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const ascPath = path.join(projectRoot, "node_modules/assemblyscript/bin/asc");
const assemblyEntry = path.join(projectRoot, "assembly/index.ts");
const outWasm = path.join(projectRoot, "build/pl_image_query.wasm");

// Ensure build dir exists / 确保构建目录存在
const buildDir = path.join(projectRoot, "build");
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

console.log("Compiling AssemblyScript to WASM...");

// Compile with optimized settings + runtime export (for __new, __pin etc.)
// 使用优化设置 + 导出运行时（用于 __new、__pin 等）
const cmd = [
  `node "${ascPath}"`,
  `"${assemblyEntry}"`,
  "--outFile", `"${outWasm}"`,
  "--optimize",
  "--exportRuntime",
].join(" ");

try {
  execSync(cmd, { stdio: "inherit", cwd: projectRoot });
  console.log("WASM compiled successfully:", outWasm);
  console.log("WASM size:", (fs.statSync(outWasm).size / 1024).toFixed(1), "KB");
} catch (err) {
  console.error("Compilation failed:", err.message);
  process.exit(1);
}
