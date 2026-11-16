<script setup>
// Draws a PDF with PDF.js so it stays on the site and works on phones.
// Pages render when they scroll near the screen and are freed when far away (saves memory).
import { ref, onMounted, onBeforeUnmount, nextTick, markRaw } from 'vue'

const props = defineProps({ url: String })
const emit = defineEmits(['fallback'])

const scroller = ref(null)
const pageEls = ref([])
const total = ref(0)
const current = ref(1)
const jump = ref('')
const zoom = ref(1) // 1 = fit width
const loading = ref(true)
const progress = ref(0)
const error = ref('')
const aspect = ref(9 / 16) // height / width, from page 1 (updated per page when rendered)
const aspects = ref({})

let doc = null
let observer = null
const tasks = new Map() // page -> render task
const renderedAt = new Map() // page -> css width it was drawn at

const boxWidth = ref(800) // reactive copy of the scroller's width
const measure = () => scroller.value && (boxWidth.value = scroller.value.clientWidth)
const baseWidth = () => Math.min(boxWidth.value - 32, 1100)
const cssWidth = () => Math.round(baseWidth() * zoom.value)

async function renderPage(n) {
  const el = pageEls.value[n - 1]
  if (!el || !doc) return
  const w = cssWidth()
  if (renderedAt.get(n) === w) return
  tasks.get(n)?.cancel()
  const page = await doc.getPage(n)
  const base = page.getViewport({ scale: 1 })
  aspects.value[n] = base.height / base.width
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const vp = page.getViewport({ scale: (w / base.width) * dpr })
  const canvas = el.querySelector('canvas')
  canvas.width = Math.floor(vp.width)
  canvas.height = Math.floor(vp.height)
  const task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport: vp })
  tasks.set(n, task)
  try {
    await task.promise
    renderedAt.set(n, w)
  } catch {
    /* cancelled */
  }
}
function freePage(n) {
  tasks.get(n)?.cancel()
  const c = pageEls.value[n - 1]?.querySelector('canvas')
  if (c) c.width = c.height = 0
  renderedAt.delete(n)
}

function observe() {
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const n = Number(e.target.dataset.page)
        e.isIntersecting ? renderPage(n) : freePage(n)
      }
    },
    { root: scroller.value, rootMargin: '1200px 0px' },
  )
  pageEls.value.forEach((el) => el && observer.observe(el))
}

function onScroll() {
  const top = scroller.value.scrollTop + scroller.value.clientHeight / 3
  let n = 1
  for (const el of pageEls.value) if (el && el.offsetTop <= top) n = Number(el.dataset.page)
  current.value = n
}

function goTo(n) {
  n = Math.min(Math.max(1, Number(n) || 1), total.value)
  pageEls.value[n - 1]?.scrollIntoView({ block: 'start' })
  jump.value = ''
}

async function setZoom(z) {
  const keep = current.value
  zoom.value = Math.min(3, Math.max(0.5, Math.round(z * 100) / 100))
  renderedAt.clear()
  await nextTick()
  goTo(keep)
  observe()
}

let resizeTimer
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    measure()
    renderedAt.clear()
    observe()
  }, 200)
}

onMounted(async () => {
  try {
    const pdfjs = await import('pdfjs-dist')
    const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
    pdfjs.GlobalWorkerOptions.workerSrc = worker
    const task = pdfjs.getDocument({ url: props.url, disableAutoFetch: true, rangeChunkSize: 1 << 20 })
    task.onProgress = ({ loaded, total: t }) => t && (progress.value = Math.min(1, loaded / t))
    doc = markRaw(await task.promise)
    total.value = doc.numPages
    const first = (await doc.getPage(1)).getViewport({ scale: 1 })
    aspect.value = first.height / first.width
    loading.value = false
    await nextTick()
    measure()
    await nextTick()
    observe()
    window.addEventListener('resize', onResize)
  } catch (e) {
    error.value = e?.message || String(e)
    emit('fallback')
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  tasks.forEach((t) => t.cancel())
  window.removeEventListener('resize', onResize)
  doc?.destroy()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col bg-[#1d1d24]">
    <!-- toolbar -->
    <div class="flex flex-wrap items-center gap-2 border-b border-line bg-panel/80 px-3 py-2 text-sm">
      <span class="font-mono">
        <template v-if="total">{{ current }} / {{ total }}</template>
        <template v-else>…</template>
      </span>
      <form class="flex items-center gap-1" @submit.prevent="goTo(jump)">
        <input v-model="jump" inputmode="numeric" placeholder="Page" class="w-16 rounded border border-line bg-ink px-2 py-1 text-xs" />
        <button class="rounded border border-line px-2 py-1 text-xs hover:border-white/40">Go</button>
      </form>
      <div class="ml-auto flex items-center gap-1">
        <button class="grid size-8 place-items-center rounded hover:bg-white/10" title="Zoom out" @click="setZoom(zoom - 0.25)">−</button>
        <span class="w-12 text-center font-mono text-xs">{{ Math.round(zoom * 100) }}%</span>
        <button class="grid size-8 place-items-center rounded hover:bg-white/10" title="Zoom in" @click="setZoom(zoom + 0.25)">+</button>
        <button class="rounded border border-line px-2 py-1 text-xs hover:border-white/40" @click="setZoom(1)">Fit width</button>
      </div>
    </div>

    <!-- pages -->
    <div ref="scroller" class="min-h-0 flex-1 overflow-auto" @scroll.passive="onScroll">
      <div v-if="loading && !error" class="grid h-full place-items-center p-6 text-center">
        <div>
          <p class="text-sm text-muted">Loading PDF…</p>
          <div class="mx-auto mt-3 h-1.5 w-56 overflow-hidden rounded bg-line">
            <div class="h-full bg-accent transition-all" :style="{ width: Math.max(5, progress * 100) + '%' }" />
          </div>
        </div>
      </div>
      <div v-else-if="!error" class="flex flex-col items-center gap-3 p-4" :style="{ minWidth: cssWidth() + 32 + 'px' }">
        <div
          v-for="n in total"
          :key="n"
          :ref="(el) => (pageEls[n - 1] = el)"
          :data-page="n"
          class="relative bg-white shadow-lg"
          :style="{ width: cssWidth() + 'px', height: Math.round(cssWidth() * (aspects[n] || aspect)) + 'px' }"
        >
          <canvas class="block h-full w-full" />
          <span class="absolute bottom-1 right-2 font-mono text-[10px] text-black/40">{{ n }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
