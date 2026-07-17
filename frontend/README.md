# pl-in-2025 Frontend

[English](#english) | [中文](#chinese)

---

<a id="english"></a>

## English

A Vite + TypeScript gallery page that displays a film-roll-style timeline of Physics Lab community posts. It uses a WASM module to query encrypted image path data by date, then constructs OSS URLs for display.

### Features

- **Date picker** — Select a date to view that day's images
- **Polaroid-style main print** — Displays the first image of the day with a timestamp stamp
- **Auto-scrolling filmstrip** — Horizontal filmstrip with all images for the day, automatically scrolls with grab-to-drag support
- **Lightbox** — Click any image to view full-size with overlay
- **OSS image processing** — Automatic `x-oss-process` parameter injection for responsive thumbnails/stage/lightbox images

### Setup

```bash
cd frontend
npm install
npm run dev        # development server
npm run build      # production build
```

### WASM Assets

WASM build artifacts live under `src/wasm/` (not `public/`) so Vite can add content hashes for long-term caching in production.

| File                            | Source                         |
|---------------------------------|--------------------------------|
| `src/wasm/assets/data.enc`      | `wasm/build/data.enc`          |
| `src/wasm/assets/pl_image_query.wasm` | `wasm/build/pl_image_query.wasm` |
| `src/wasm/assets/meta.json`     | `wasm/build/meta.json`         |
| `src/wasm/pl_image_query.js`    | `wasm/build/pl_image_query.js` |

Run `npm run sync:data` from the root to copy files automatically.

### How It Works

1. WASM module loads encrypted binary data (`data.enc`)
2. User picks a date → `PlImageQuery.queryByDate("YYYY-MM-DD")`
3. WASM decrypts data in linear memory, returns matching `{time, path}[]`
4. `buildOssUrl(path)` constructs the full OSS URL
5. `ossImageUrl()` adds `x-oss-process` for responsive image sizing
6. Gallery renders the main print + filmstrip with auto-scroll

### License

[MIT](../LICENSE)

---

<a id="chinese"></a>

## 中文

一个 Vite + TypeScript 画廊页面，以胶片卷风格展示物理实验室社区的帖子时间线。通过 WASM 模块按日期查询加密的图片路径数据，然后构造 OSS URL 进行展示。

### 功能

- **日期选择器** — 选择日期查看当天图片
- **拍立得风格主图** — 显示当日首张图片，附烧录时间戳
- **自动滚动胶片条** — 显示当日所有图片缩略图，自动滚动，支持拖拽
- **灯箱** — 点击任意图片查看大图
- **OSS 图片处理** — 自动注入 `x-oss-process` 参数，实现响应式缩略图/主图/灯箱

### 启动

```bash
cd frontend
npm install
npm run dev        # 开发服务器
npm run build      # 生产构建
```

### WASM 资源

前端将 WASM 构建产物放在 `src/wasm/` 下（而非 `public/`），以便 Vite 在生产构建时添加内容哈希，实现长效缓存。

| 文件                          | 来源                           |
|------------------------------|-------------------------------|
| `src/wasm/assets/data.enc`           | `wasm/build/data.enc`          |
| `src/wasm/assets/pl_image_query.wasm`| `wasm/build/pl_image_query.wasm` |
| `src/wasm/assets/meta.json`          | `wasm/build/meta.json`         |
| `src/wasm/pl_image_query.js`         | `wasm/build/pl_image_query.js` |

在根目录运行 `npm run sync:data` 可自动复制这些文件。

### 工作原理

1. WASM 模块加载加密二进制数据 (`data.enc`)
2. 用户选择日期 → `PlImageQuery.queryByDate("YYYY-MM-DD")`
3. WASM 在线性内存中解密数据，返回匹配的 `{time, path}[]`
4. `buildOssUrl(path)` 构造完整 OSS URL
5. `ossImageUrl()` 添加 `x-oss-process` 参数实现响应式图片尺寸
6. 画廊渲染主图 + 自动滚动胶片条

### 许可证

[MIT](../LICENSE)
