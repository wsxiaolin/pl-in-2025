// pl-in-2025 Frontend Gallery
// 前端画廊 — WASM 驱动的按日期图片查询与展示
// WASM-driven date-based image query and display

import './style.css'
import { PlImageQuery, buildOssUrl } from './wasm/pl_image_query.js'
import { consoleToConsole } from './console'

// OSS image processing — fit by width only (no crop), 3:2 aspect ratio
// OSS 图片处理 — 仅按宽度缩放（不裁剪），图片比例 3:2
const OSS_IMAGE_DOMAINS = ['aliyuncs.com']
const MAX_PX = 2880 // base image width / 底图宽度

// Check if a URL belongs to our OSS bucket
// 判断 URL 是否属于我们的 OSS 存储桶
function isOssUrl(url: string): boolean {
  try {
    const host = new URL(url, window.location.href).host
    return OSS_IMAGE_DOMAINS.some(domain => host.endsWith(domain))
  } catch {
    return false
  }
}

// Round up to nearest bucket for cache-friendly URLs
// 向上取整到缓存友好的分档值
function cacheBucket(val: number, step: number): number {
  return Math.ceil(val / step) * step
}

// Build a resized OSS URL: measure actual render width × DPR, round to cache bucket
// 构建缩放后的 OSS URL：测量实际渲染宽度 × DPR，向上取整到缓存分档
function ossImageUrl(baseUrl: string, cssWidth: number): string {
  if (!isOssUrl(baseUrl)) return baseUrl
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const rawPx = cssWidth * dpr
  // ≤256: step 32, ≤768: step 64, >768: step 128 — fine-grained where it matters
  // ≤256: 步长 32, ≤768: 步长 64, >768: 步长 128 — 精细处小步长，大尺寸大步长
  const step = rawPx <= 256 ? 32 : rawPx <= 768 ? 64 : 128
  const w = Math.min(cacheBucket(rawPx, step), MAX_PX)
  const process = `image/resize,m_lfit,w_${w}`
  const sep = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${sep}x-oss-process=${process}`
}

// --- DOM refs / DOM 引用 ---
const dateInput = document.getElementById('date-input') as HTMLInputElement
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement
const queryPanel = document.getElementById('query-panel') as HTMLElement
const filterBar = document.getElementById('filter-bar') as HTMLElement
const filterToggle = document.getElementById('filter-toggle') as HTMLButtonElement
const stage = document.getElementById('result-stage') as HTMLElement
const filmstripWrap = document.getElementById('filmstrip-wrap') as HTMLElement
const filmstrip = document.getElementById('filmstrip') as HTMLElement
const filmstripLabel = document.getElementById('filmstrip-label') as HTMLElement

const lightbox = document.getElementById('lightbox') as HTMLElement
const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement
const lightboxCaption = document.getElementById('lightbox-caption') as HTMLElement
const lightboxClose = document.getElementById('lightbox-close') as HTMLButtonElement

// Filmstrip interaction pause/resume (set up once)
let fsDrag = false, fsStartX = 0, fsStartScroll = 0
filmstrip.addEventListener('mouseenter', () => { if (typeof pauseAutoScroll === 'function') pauseAutoScroll() }, { passive: true })
filmstrip.addEventListener('mouseleave', () => { if (typeof resumeAutoScroll === 'function') resumeAutoScroll(2000) }, { passive: true })
filmstrip.addEventListener('touchstart', () => { if (typeof pauseAutoScroll === 'function') pauseAutoScroll() }, { passive: true })
filmstrip.addEventListener('touchend', () => { if (typeof resumeAutoScroll === 'function') resumeAutoScroll(2500) }, { passive: true })
filmstrip.addEventListener('wheel', () => { if (typeof pauseAutoScroll === 'function') { pauseAutoScroll(); resumeAutoScroll(2000) } }, { passive: true })
filmstrip.addEventListener('mousedown', (e) => {
  fsDrag = true; filmstrip.classList.add('dragging'); fsStartX = e.pageX; fsStartScroll = filmstrip.scrollLeft
  if (typeof pauseAutoScroll === 'function') pauseAutoScroll()
})
window.addEventListener('mousemove', (e) => { if (fsDrag) filmstrip.scrollLeft = fsStartScroll - (e.pageX - fsStartX) })
window.addEventListener('mouseup', () => {
  if (!fsDrag) return; fsDrag = false; filmstrip.classList.remove('dragging')
  if (typeof resumeAutoScroll === 'function') resumeAutoScroll(2000)
})

// Format "YYYY-MM-DD" → "2025 年 3 月 14 日"
function formatDateTitle(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y} 年 ${m} 月 ${d} 日`
}

// Format "2025-03-14 12:44:49" → "25.03.14  12:44:49" (film stamp style)
// 格式化日期为胶片烧录样式
function stampText(ts: string): string {
  const [datePart, timePart] = ts.split(' ')
  const [y, m, d] = datePart.split('-')
  return `${y.slice(2)}.${m}.${d}  ${timePart}`
}

// --- Lightbox / 灯箱 ---
let lightboxZoomed = false

const lightboxImgWrap = document.createElement('div')
lightboxImgWrap.className = 'lightbox-img-wrap'
lightboxImg.parentNode!.insertBefore(lightboxImgWrap, lightboxImg)
lightboxImgWrap.appendChild(lightboxImg)

function openLightbox(url: string, caption: string): void {
  lightboxZoomed = false
  lightboxImgWrap.classList.remove('zoomed')
  lightboxImg.style.transform = ''
  lightboxImg.style.cursor = 'zoom-in'
  lightboxImg.crossOrigin = 'anonymous'
  lightboxImg.src = url
  lightboxCaption.textContent = caption
  lightbox.classList.add('open')
  document.body.style.overflow = 'hidden'
}

function closeLightbox(): void {
  lightbox.classList.remove('open')
  document.body.style.overflow = ''
  lightboxImg.src = ''
  lightboxImg.style.transform = ''
}

function toggleLightboxZoom(e: MouseEvent): void {
  e.stopPropagation()
  lightboxZoomed = !lightboxZoomed
  lightboxImgWrap.classList.toggle('zoomed', lightboxZoomed)
  lightboxImg.style.cursor = lightboxZoomed ? 'grab' : 'zoom-in'
  if (!lightboxZoomed) {
    lightboxImg.style.transform = ''
  } else {
    // Zoom in around click point
    const rect = lightboxImg.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    lightboxImg.style.transformOrigin = `${x * 100}% ${y * 100}%`
    lightboxImg.style.transform = 'scale(2)'
  }
}

lightboxImg.addEventListener('click', toggleLightboxZoom)

lightboxClose.addEventListener('click', closeLightbox)
lightbox.addEventListener('click', (e) => { if (e.target === lightbox || e.target === lightboxImgWrap) closeLightbox() })
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox() })

// Wheel zoom in lightbox
// 灯箱滚轮缩放
lightboxImgWrap.addEventListener('wheel', (e) => {
  if (!lightbox.classList.contains('open')) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.06 : 0.06
  // Get current scale or default to 1
  const cur = parseFloat(lightboxImg.style.transform.replace('scale(', '').replace(')', '') || '1')
  const next = Math.max(1, Math.min(8, cur + delta))
  lightboxZoomed = next > 1
  lightboxImgWrap.classList.toggle('zoomed', lightboxZoomed)
  lightboxImg.style.cursor = lightboxZoomed ? 'grab' : 'zoom-in'
  if (next <= 1) {
    lightboxImg.style.transform = ''
  } else {
    lightboxImg.style.transformOrigin = '50% 50%'
    lightboxImg.style.transform = `scale(${next})`
  }
}, { passive: false })

// Highlight the active thumbnail
// 高亮当前选中的缩略图
function setActiveThumb(idx: number): void {
  filmstrip.querySelectorAll('.thumb').forEach((el) => {
    el.classList.toggle('active', Number((el as HTMLElement).dataset.idx) === idx)
  })
}

// Scroll the date picker into view on mobile
// 移动端日期选择器获得焦点时滚动到可视区域
function scrollFieldIntoView(): void {
  window.setTimeout(() => {
    queryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 250)
}

dateInput.addEventListener('focus', scrollFieldIntoView)
dateInput.addEventListener('click', scrollFieldIntoView)

// A single image entry from WASM query result
// WASM 查询结果中的单条图片条目
interface Entry { time: string; path: string }

// Show empty-state when no images found for a date
// 当天无图片时显示空状态
function renderEmpty(dateStr: string): void {
  stage.innerHTML = `
    <div class="empty-state">
      <div class="glyph">·</div>
      <h3>本卷这一天没有曝光</h3>
      <p>${formatDateTitle(dateStr)} 未记录到任何底片，换一天试试，或选择列表里已显影的日期。</p>
    </div>
  `
  stopFilmstripAutoScroll()
  filmstripWrap.hidden = true
  filmstrip.innerHTML = ''
}

// Get the active filter value / 获取当前选中的过滤类型
function getActiveFilter(): string {
  return filterToggle.dataset.filter ?? 'experiments'
}

// Render the main stage + filmstrip for a given date
// 渲染某日的主图展示区 + 胶片条
function renderDay(dateStr: string, list: Entry[]): void {
  if (list.length === 0) {
    renderEmpty(dateStr)
    return
  }

  const first = list[0]
  stage.innerHTML = `
    <div class="stage-frame">
      <div class="print">
        <div class="photo">
          <img id="stage-img" src="${ossImageUrl(buildOssUrl(first.path), 640)}" alt="${dateStr} 拍摄的照片" crossorigin="anonymous">
          <span class="stamp" id="stage-stamp">${stampText(dateStr + ' ' + first.time)}</span>
        </div>
        <div class="cap">
          <span>${formatDateTitle(dateStr)}</span>
          <span class="frame-no">${first.time}</span>
        </div>
        <p class="hint">点击照片查看大图</p>
      </div>
      <div class="stage-meta">
        <p class="date-title">${formatDateTitle(dateStr)}</p>
        <p class="count">共显影 ${list.length} 帧</p>
      </div>
    </div>
  `

  const stageImg = document.getElementById('stage-img') as HTMLImageElement
  const stageStamp = document.getElementById('stage-stamp') as HTMLElement
  let currentRec = first

  // Click main photo → open lightbox
  // 点击主图 → 打开灯箱
  stageImg.addEventListener('click', () => {
    openLightbox(ossImageUrl(buildOssUrl(currentRec.path), MAX_PX), `${dateStr} · ${currentRec.time}`)
  })

  filmstripLabel.textContent = `当日所有底片 · ${list.length} 帧`
  filmstrip.innerHTML = ''
  filmstrip.scrollLeft = 0

  // Build a single thumbnail button
  // 构建单个缩略图按钮
  function makeThumb(rec: Entry, i: number): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'thumb' + (i === 0 ? ' active' : '')
    btn.type = 'button'
    btn.dataset.idx = String(i)
    const typeLabel = rec.path.startsWith('discussions') ? '讨论' : '实验'
    btn.innerHTML = `
      <img src="${ossImageUrl(buildOssUrl(rec.path), 128)}" alt="${dateStr} ${rec.time} ${typeLabel}" loading="lazy" crossorigin="anonymous">
      <span class="t-time">${rec.time}</span>
    `
    btn.addEventListener('click', () => {
      currentRec = rec
      const photoEl = stage.querySelector('.photo') as HTMLElement
      stageImg.src = ossImageUrl(buildOssUrl(rec.path), photoEl?.clientWidth || 640)
      stageStamp.textContent = stampText(dateStr + ' ' + rec.time)
      stage.querySelector('.print .cap')!.innerHTML =
        `<span>${formatDateTitle(dateStr)}</span><span class="frame-no">${rec.time}</span>`
      setActiveThumb(i)
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    })
    return btn
  }

  list.forEach((rec, i) => filmstrip.appendChild(makeThumb(rec, i)))
  filmstripWrap.hidden = false
  startFilmstripAutoScroll()
}

// --- Filmstrip auto-scroll / 胶片条自动滚动 ---
let autoScrollRaf: number | null = null
let autoScrollPaused = false
let autoScrollResumeTimer: ReturnType<typeof setTimeout> | null = null

function stopFilmstripAutoScroll(): void {
  if (autoScrollRaf != null) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = null }
  if (autoScrollResumeTimer != null) { clearTimeout(autoScrollResumeTimer); autoScrollResumeTimer = null }
}

function pauseAutoScroll(): void {
  autoScrollPaused = true
  if (autoScrollResumeTimer != null) { clearTimeout(autoScrollResumeTimer); autoScrollResumeTimer = null }
}

function resumeAutoScroll(delay: number): void {
  if (autoScrollResumeTimer != null) clearTimeout(autoScrollResumeTimer)
  autoScrollResumeTimer = setTimeout(() => {
    autoScrollPaused = false
    autoScrollResumeTimer = null
  }, delay)
}

function startFilmstripAutoScroll(): void {
  stopFilmstripAutoScroll()
  const speed = 0.4
  autoScrollPaused = false
  function step(): void {
    if (!autoScrollPaused && filmstrip.children.length > 0) {
      filmstrip.scrollLeft += speed
      if (filmstrip.scrollLeft + filmstrip.clientWidth >= filmstrip.scrollWidth - 1) {
        filmstrip.scrollLeft = 0
      }
    }
    autoScrollRaf = requestAnimationFrame(step)
  }
  autoScrollRaf = requestAnimationFrame(step)
}

// --- WASM Initialization / WASM 初始化 ---
let queryInstance: PlImageQuery | null = null

// Cache raw WASM results for the current date to avoid re-querying on filter toggle
// 缓存当前日期的 WASM 原始结果，切换过滤时无需重新查询
let cachedEntries: Entry[] = []
let cachedDate: string = ''

async function initWasm(): Promise<void> {
  stage.innerHTML = '<div class="loading-state">加载 WASM 模块中...</div>'
  try {
    // Load encrypted data + WASM, decrypt in WASM linear memory
    // 加载加密数据和 WASM，在线性内存中解密
    const dataUrl = new URL('./wasm/assets/data.enc', import.meta.url).href
    const wasmUrl = new URL('./wasm/assets/pl_image_query.wasm', import.meta.url).href
    queryInstance = await PlImageQuery.create(dataUrl, wasmUrl)
    searchBtn.disabled = false
    searchBtn.textContent = `显影`
    filterBar.hidden = false
    runSearch()
  } catch (e) {
    stage.innerHTML = `<div class="empty-state"><h3>WASM 加载失败</h3><p>${e instanceof Error ? e.message : String(e)}</p></div>`
  }
}

// Filter cached entries by the currently active type
// 根据当前选中的类型过滤缓存的条目
function applyFilter(): Entry[] {
  const filter = getActiveFilter()
  return cachedEntries.filter(e => e.path.startsWith(filter))
}

// --- Search handler / 搜索处理 ---
function runSearch(): void {
  const val = dateInput.value
  if (!val || !queryInstance) return

  cachedEntries = queryInstance.queryByDate(val).map((r: { time: string; path: string }) => ({
    time: r.time,
    path: r.path
  }))
  cachedDate = val
  renderDay(val, applyFilter())
}

// Apply current filter to cached results (no re-query)
// 将当前过滤应用到缓存结果（不重新查询）
function applyAndRender(): void {
  if (!cachedDate) return
  renderDay(cachedDate, applyFilter())
}

// Filter toggle / 过滤切换
filterToggle.addEventListener('click', () => {
  const isExperiments = filterToggle.dataset.filter === 'experiments'
  filterToggle.dataset.filter = isExperiments ? 'discussions' : 'experiments'
  filterToggle.textContent = isExperiments ? '讨论↻' : '实验↻'
  applyAndRender()
})

searchBtn.addEventListener('click', runSearch)
dateInput.addEventListener('change', runSearch)
dateInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runSearch() })

// Boot
initWasm()
consoleToConsole()
