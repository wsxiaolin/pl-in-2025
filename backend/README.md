# pl-in-2025 Backend

[English](#english) | [中文](#chinese)

---

<a id="english"></a>

## English

Playwright-based screenshot pipeline that captures Physics Lab community posts and uploads them to Alibaba Cloud OSS for the pl-in-2025 gallery.

### How It Works

1. Reads a GitHub API tree JSON file (`discussions.json` / `experiments.json`) listing all post data files
2. For each file, launches a headless Chromium browser via Playwright
3. Navigates to the corresponding plweb2 post page (`http://localhost:5173`)
4. Takes a JPEG screenshot (1440×900 @ 2x DPR)
5. Uploads the image to OSS bucket `pl-in-2025` at `{type}/{filename}.jpg`
6. Appends a record to both the log file (for resumability) and the output manifest (for WASM preprocessing)

### Files

| File                  | Description                                      |
|-----------------------|--------------------------------------------------|
| `index.ts`            | Main pipeline: orchestrates screenshots & upload |
| `upload.ts`           | OSS upload helper (ali-oss)                      |
| `discussions.json`    | GitHub tree listing for discussion posts         |
| `experiments.json`    | GitHub tree listing for experiment posts         |
| `discussions_logs.txt`| Already-processed log (resumability)             |
| `experiments_logs.txt`| Already-processed log (resumability)             |
| `discussions_output.txt` | Output manifest for WASM preprocessing        |
| `experiments_output.txt` | Output manifest for WASM preprocessing        |
| `.env`                | OSS credentials (OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET) |

### Setup

```bash
cd backend
npm install
# Configure OSS credentials in .env
npm run dev    # watch mode
npm start      # one-shot run
```

### Requirements

- plweb2 dev server running at `http://localhost:5173`
- OSS bucket `pl-in-2025` in region `oss-cn-chengdu`

### License

[MIT](../LICENSE)

---

<a id="chinese"></a>

## 中文

基于 Playwright 的截图流水线，截取物理实验室社区的帖子页面并上传到阿里云 OSS，用于 pl-in-2025 画廊。

### 工作流程

1. 读取 GitHub API tree JSON 文件（`discussions.json` / `experiments.json`），获取所有帖子数据文件列表
2. 对每个文件，通过 Playwright 启动无头 Chromium 浏览器
3. 导航到对应的 plweb2 帖子页面（`http://localhost:5173`）
4. 截取 JPEG 截图（1440×900 @ 2x DPR）
5. 将图片上传到 OSS 存储桶 `pl-in-2025`，路径为 `{type}/{filename}.jpg`
6. 将记录追加到日志文件（支持断点续传）和 output 清单（供 WASM 预处理使用）

### 文件

| 文件                     | 说明                                   |
|------------------------|----------------------------------------|
| `index.ts`             | 主流水线：协调截图和上传                 |
| `upload.ts`            | OSS 上传工具（ali-oss）                 |
| `discussions.json`     | 讨论帖子的 GitHub tree 列表             |
| `experiments.json`     | 实验帖子的 GitHub tree 列表             |
| `discussions_logs.txt` | 已处理记录日志（断点续传）               |
| `experiments_logs.txt` | 已处理记录日志（断点续传）               |
| `discussions_output.txt` | 供 WASM 预处理的 output 清单          |
| `experiments_output.txt` | 供 WASM 预处理的 output 清单          |
| `.env`                 | OSS 凭据（OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET） |

### 启动

```bash
cd backend
npm install
# 在 环境变量中配置 OSS 凭据
npm run dev    # 监听模式
npm start      # 单次运行
```

### 依赖

- plweb2 开发服务器运行在 `http://localhost:5173`
- OSS 存储桶 `pl-in-2025`，区域 `oss-cn-chengdu`

### 许可证

[MIT](../LICENSE)
