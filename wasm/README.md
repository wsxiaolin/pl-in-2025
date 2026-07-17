# PL-in-2025 WASM Image Path Query

[English](#english) | [中文](#chinese)

---

<a id="english"></a>

## English

An AssemblyScript WASM module for querying PL-in-2025 OSS image paths by date. Runs entirely in the browser with lightweight anti-cracking protections.

### Quick Start

#### Browser

```html
<script type="module">
  import { PlImageQuery, buildOssUrl } from "./build/pl_image_query.js";

  // Initialize — loads WASM + encrypted data
  // 初始化 — 加载 WASM 和加密数据
  const query = await PlImageQuery.create(
    "./build/data.enc",
    "./build/pl_image_query.wasm"
  );

  // Query by date
  // 按日期查询
  const results = query.queryByDate("2024-06-09");
  console.log(results);
  // [
  //   { time: "11:47:28", path: "discussions/data_2024-06-09_11-47-28.json.jpg" },
  //   { time: "11:47:28", path: "experiments/data_2024-06-09_11-47-28.json.jpg" },
  //   ...
  // ]

  // Build full OSS URL
  // 构造完整 OSS URL
  const url = buildOssUrl(results[0].path);
  // → https://pl-in-2025.oss-cn-chengdu.aliyuncs.com/discussions/data_2024-06-09_11-47-28.json.jpg
</script>
```

#### Node.js

```javascript
import { PlImageQuery } from "./build/pl_image_query.js";
const query = await PlImageQuery.create("./build/data.enc", "./build/pl_image_query.wasm");
const results = query.queryByDate("2024-06-09");
```

### API

| Method                                 | Description                               |
|----------------------------------------|-------------------------------------------|
| `PlImageQuery.create(encDataPath, wasmPath)` | Create instance, load WASM & encrypted data |
| `query.queryByDate(date)`              | Query by "YYYY-MM-DD", returns `{time, path}[]` |
| `query.getRemainingQueries()`          | Remaining queries (max 200 per session)   |
| `query.getEntryCount()`                | Total entry count                         |
| `buildOssUrl(path)`                    | Convert OSS path to full URL              |

### Data Source

- `discussions_output.txt` / `experiments_output.txt`
- Format: `date$filename`, e.g. `2024-06-09$data_2024-06-09_12-44-49.json`
- OSS Bucket: `pl-in-2025`, Region: `oss-cn-chengdu`
- Image path: `{type}/{filename}.jpg`

### Technology

| Option          | Decision                                                 |
|-----------------|----------------------------------------------------------|
| Rust + wasm-pack| Most mature, but no Rust toolchain in environment         |
| **AssemblyScript** | **Adopted**. TypeScript syntax, npm-only setup, produces .wasm + JS glue |
| Hand-written WAT| Too costly to develop and maintain                       |

### Data Strategy

- **49,722 entries** (discussions 24,862 + experiments 24,860)
- Binary format: 19 bytes each (1 type + 10 date + 8 time), ~922KB total
- **Data separated from WASM**: encrypted `data.enc` is standalone; WASM only contains decryption logic + key
- Benefit: small WASM (5.7KB), fast loading; data/logic separation increases reverse-engineering cost

### Anti-Cracking Measures

1. **XOR encryption** — 16-byte key XOR, key inlined in WASM code (not stored as array, prevents memory dump)
2. **Key obfuscation** — Key stored as 16 independent constants, assembled at runtime
3. **Rate limiting** — 200 queries max per instance, prevents bulk date traversal
4. **Format validation** — Strict YYYY-MM-DD + range check, rejects invalid input
5. **Memory isolation** — Decrypted data lives only in WASM linear memory, JS cannot read raw data
6. **On-demand decryption** — Returns only the queried date's results, no bulk data API

### Memory Management

- Uses `__pin` to pin decrypted data, preventing AssemblyScript GC from moving it
- Results written to a pre-allocated 128KB static buffer, avoiding heap allocation during queries

### Project Structure

```
pl-wasm-date-lookup/
├── README.md
├── package.json
├── assembly/
│   ├── index.ts             ← AssemblyScript source (WASM logic)
│   └── data.ts              ← Auto-generated key + constants
├── build/
│   ├── pl_image_query.wasm  ← Compiled WASM (5.7KB)
│   ├── pl_image_query.js    ← JS glue code (ESM)
│   ├── data.enc             ← Encrypted data (922KB)
│   ├── meta.json            ← Metadata
│   └── sample_expected.json ← Test expectations
├── scripts/
│   ├── preprocess.ts        ← Data preprocessing
│   └── build-wasm.js        ← WASM build script
├── src/
│   └── index.ts             ← TypeScript type definitions
├── test/
│   └── test.js              ← Test script
└── data/                    ← Raw data
    ├── discussions_output.txt
    ├── experiments_output.txt
    ├── backend_index.ts
    └── backend_upload.ts
```

### Build

```bash
# Install dependencies / 安装依赖
npm install

# Preprocess data → build/data.enc
# 数据预处理 → build/data.enc
npx tsx scripts/preprocess.ts data

# Compile WASM / 编译 WASM
node scripts/build-wasm.js

# One-shot build / 一键构建
npm run build

# Test / 测试
npm test
```

### Test Results

```
=== PL Image Query WASM Test ===
WASM size: 5.7 KB
Data size: 922.6 KB

--- Initializing WASM module ---
PASS: Module initialized
Total entries: 49722

--- Testing date queries ---
PASS: 2024-06-09 — 42 entries
PASS: 2024-06-10 — 102 entries
PASS: 2024-06-11 — 100 entries
PASS: 2024-06-12 — 102 entries
PASS: 2024-06-13 — 102 entries

--- Testing invalid input ---
PASS: Invalid date rejected
PASS: Out-of-range date rejected
PASS: Empty date rejected
PASS: Non-existent date returns empty

--- Testing rate limiting ---
Remaining queries: 194

--- Testing OSS URL construction ---
PASS: OSS URL format correct

=== Test Summary ===
ALL TESTS PASSED ✓
```

### License

[MIT](../LICENSE)

---

<a id="chinese"></a>

## 中文

一个 AssemblyScript WASM 模块，用于按日期查询 PL-in-2025 的 OSS 图片路径。纯浏览器端运行，带轻量防破解保护。

### 快速使用

#### 浏览器

```html
<script type="module">
  import { PlImageQuery, buildOssUrl } from "./build/pl_image_query.js";

  // 初始化 — 加载 WASM 和加密数据
  const query = await PlImageQuery.create(
    "./build/data.enc",
    "./build/pl_image_query.wasm"
  );

  // 按日期查询
  const results = query.queryByDate("2024-06-09");
  console.log(results);
  // [
  //   { time: "11:47:28", path: "discussions/data_2024-06-09_11-47-28.json.jpg" },
  //   { time: "11:47:28", path: "experiments/data_2024-06-09_11-47-28.json.jpg" },
  //   ...
  // ]

  // 构造完整 OSS URL
  const url = buildOssUrl(results[0].path);
  // → https://pl-in-2025.oss-cn-chengdu.aliyuncs.com/discussions/data_2024-06-09_11-47-28.json.jpg
</script>
```

#### Node.js

```javascript
import { PlImageQuery } from "./build/pl_image_query.js";
const query = await PlImageQuery.create("./build/data.enc", "./build/pl_image_query.wasm");
const results = query.queryByDate("2024-06-09");
```

### API

| 方法                                    | 说明                               |
|----------------------------------------|-----------------------------------|
| `PlImageQuery.create(encDataPath, wasmPath)` | 创建实例，加载 WASM 和加密数据     |
| `query.queryByDate(date)`              | 传入 "YYYY-MM-DD"，返回 `{time, path}[]` |
| `query.getRemainingQueries()`          | 剩余查询次数（上限 200）           |
| `query.getEntryCount()`                | 总条目数                           |
| `buildOssUrl(path)`                    | 将 OSS path 转为完整 URL           |

### 数据来源

- `discussions_output.txt` / `experiments_output.txt`
- 格式：`date$filename`，例如 `2024-06-09$data_2024-06-09_12-44-49.json`
- OSS Bucket: `pl-in-2025`，Region: `oss-cn-chengdu`
- 图片路径：`{type}/{filename}.jpg`

### 技术选型

| 选项              | 结论                                                         |
|------------------|------------------------------------------------------------|
| Rust + wasm-pack | 成熟度最高，但环境无 Rust 工具链                               |
| **AssemblyScript** | **采用**。TypeScript 语法，npm 安装即用，编译产物含 .wasm + JS 胶水代码 |
| 手写 WAT         | 开发成本高，不可维护                                           |

### 数据策略

- **49,722 条**（discussions 24,862 + experiments 24,860）
- 二进制格式：每条 19 字节（1 type + 10 date + 8 time），总计 ~922KB
- **数据与 WASM 分离**：加密数据为独立 `data.enc` 文件，WASM 仅含解密逻辑和密钥
- 好处：WASM 体积小（5.7KB），加载快；数据和逻辑分离，增加逆向成本

### 防破解措施

1. **XOR 加密** — 16 字节密钥 XOR，密钥内联在 WASM 代码中（非数组存储，防内存 dump）
2. **密钥混淆** — 密钥以 16 个独立常量存储，运行时拼接
3. **速率限制** — 单实例最多 200 次查询，防止批量遍历所有日期
4. **格式校验** — 严格校验日期格式（YYYY-MM-DD + 范围检查）
5. **内存隔离** — 解密数据仅存在于 WASM 线性内存，JS 无法直接读取
6. **按需解密** — 只返回查询日期的结果，不暴露全量数据

### 内存管理

- 使用 `__pin` 固定解密数据，防止 AssemblyScript GC 移动导致指针失效
- 结果写入预分配的 128KB 静态缓冲区，避免查询时堆分配

### 项目结构

```
pl-wasm-date-lookup/
├── README.md
├── package.json
├── assembly/
│   ├── index.ts             ← AssemblyScript 源码（WASM 逻辑）
│   └── data.ts              ← 自动生成的密钥和常量
├── build/
│   ├── pl_image_query.wasm  ← 编译后的 WASM（5.7KB）
│   ├── pl_image_query.js    ← JS 胶水代码（ESM）
│   ├── data.enc             ← 加密数据（922KB）
│   ├── meta.json            ← 元数据
│   └── sample_expected.json ← 测试期望数据
├── scripts/
│   ├── preprocess.ts        ← 数据预处理脚本
│   └── build-wasm.js        ← WASM 编译脚本
├── src/
│   └── index.ts             ← TypeScript 类型定义
├── test/
│   └── test.js              ← 测试脚本
└── data/                    ← 原始数据
    ├── discussions_output.txt
    ├── experiments_output.txt
    ├── backend_index.ts
    └── backend_upload.ts
```

### 构建

```bash
# 安装依赖
npm install

# 数据预处理 → build/data.enc
npx tsx scripts/preprocess.ts data

# 编译 WASM
node scripts/build-wasm.js

# 一键构建
npm run build

# 测试
npm test
```

### 测试结果

```
=== PL Image Query WASM Test ===
WASM size: 5.7 KB
Data size: 922.6 KB

--- Initializing WASM module ---
PASS: Module initialized
Total entries: 49722

--- Testing date queries ---
PASS: 2024-06-09 — 42 entries
PASS: 2024-06-10 — 102 entries
PASS: 2024-06-11 — 100 entries
PASS: 2024-06-12 — 102 entries
PASS: 2024-06-13 — 102 entries

--- Testing invalid input ---
PASS: Invalid date rejected
PASS: Out-of-range date rejected
PASS: Empty date rejected
PASS: Non-existent date returns empty

--- Testing rate limiting ---
Remaining queries: 194

--- Testing OSS URL construction ---
PASS: OSS URL format correct

=== Test Summary ===
ALL TESTS PASSED ✓
```

### 许可证

[MIT](../LICENSE)
