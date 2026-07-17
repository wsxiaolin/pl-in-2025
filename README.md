# pl · in 2025

[English](#english) | [中文](#chinese)

## Scripts
```JSON
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "frontend:dev": "npm run dev --prefix frontend",
    "frontend:build": "npm run build --prefix frontend",
    "wasm:build": "npm run build --prefix wasm",
    "wasm:test": "npm run test --prefix wasm",
    "backend:start": "npm run start --prefix backend",
    "sync:data": "node scripts/sync-data.mjs",
    "pipeline": "npm run sync:data && npm run wasm:build && npm run frontend:build"
  },
```
---

<a id="english"></a>

## English

This is an activity for physics-lab.

**pl · in 2025** is a photography gallery processing projects to render the json data to images. This repo also contains backend scripts & CI to render and upload images to Aliyun OSS, a WASM module to query the images by date in the browser, and a frontend gallery page to display the images in polaroid style.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     plweb2 (Vue App)                        │
│            Physics Lab community web application            │
└──────────────┬──────────────────────────────────────────────┘
               │ Playwright screenshot
               ▼
┌─────────────────────────────────────────────────────────────┐
│                     backend (Processing)                    │
│   Reads GitHub JSON tree → takes screenshots → uploads to   │
│   Alibaba Cloud OSS, then writes output manifests           │
│   Output: discussions_output.txt, experiments_output.txt    │
└──────────────┬──────────────────────────────────────────────┘
               │ data sync
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   wasm (Query Engine)                       │
│   Preprocess: encodes manifests → XOR-encrypted binary      │
│   AssemblyScript WASM: decrypts & queries by date in-browser│
│   Output: data.enc, pl_image_query.wasm, pl_image_query.js  │
└──────────────┬──────────────────────────────────────────────┘
               │ asset copy
               ▼
┌─────────────────────────────────────────────────────────────┐
│                frontend (Vite + TypeScript)                  │
│   Gallery page: date picker → WASM query → OSS image URLs   │
│   Renders polaroid-style prints & auto-scrolling filmstrip  │
└─────────────────────────────────────────────────────────────┘
```

### Repositories

| Directory  | Description                                                |
|------------|------------------------------------------------------------|
| `plweb2/`  | Physics Lab community app (Vue 3 + TypeScript + Vite)      |
| `backend/` | Playwright-based screenshot pipeline, uploads to OSS       |
| `wasm/`    | AssemblyScript WASM module for encrypted date-based lookup |
| `frontend/`| Vite + TypeScript gallery page consuming the WASM module   |


### License

[MIT](./LICENSE)

---

<a id="chinese"></a>

## 中文

这是物理实验室社区的一个活动

**pl · in 2025** 是一个自动化的摄影画廊处理项目，用于处理json格式的帖子快照。该仓库还包含后端脚本和 CI 流水线，用于渲染并上传图片至阿里云 OSS；一个 WASM 模块，用于在浏览器端按日期查询图片；以及一个前端画廊页面，以拍立得风格展示图片。

### 架构

```
┌─────────────────────────────────────────────────────────────┐
│                     plweb2 (Vue 应用)                       │
│            物理实验室社区 Web 应用                           │
└──────────────┬──────────────────────────────────────────────┘
               │ Playwright 截图
               ▼
┌─────────────────────────────────────────────────────────────┐
│                   backend (处理流水线)                      │
│   读取 GitHub JSON tree → Playwright 截图 → 上传至阿里云    │
│   OSS，最后写入 output 清单文件                             │
│   输出: discussions_output.txt, experiments_output.txt     │
└──────────────┬──────────────────────────────────────────────┘
               │ 数据同步
               ▼
┌─────────────────────────────────────────────────────────────┐
│                  wasm (查询引擎)                             │
│   预处理: 清单文件 → XOR 加密二进制                          │
│   AssemblyScript WASM: 浏览器端解密并按日期查询              │
│   输出: data.enc, pl_image_query.wasm, pl_image_query.js   │
└──────────────┬──────────────────────────────────────────────┘
               │ 资源复制
               ▼
┌─────────────────────────────────────────────────────────────┐
│              frontend (Vite + TypeScript)                   │
│   画廊页面: 日期选择 → WASM 查询 → OSS 图片 URL            │
│   渲染拍立得风格主图 & 自动滚动的胶片条                     │
└─────────────────────────────────────────────────────────────┘
```

### 仓库目录

| 目录       | 说明                                                   |
|-----------|--------------------------------------------------------|
| `plweb2/` | 物理实验室社区应用 (Vue 3 + TypeScript + Vite)         |
| `backend/`| 基于 Playwright 的截图流水线，上传至 OSS                |
| `wasm/`   | AssemblyScript WASM 模块，用于加密日期查询              |
| `frontend/`| Vite + TypeScript 画廊页面，消费 WASM 模块             |
