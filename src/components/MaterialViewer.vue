<script setup>
import { computed, ref, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { kindOf, embedUrl, downloadUrl, fmtSize, fileType, usePdfViewer } from '@/lib/materials'

// Loaded only when a PDF is opened (keeps the rest of the site light).
const PdfViewer = defineAsyncComponent(() => import('./PdfViewer.vue'))

const props = defineProps({ material: Object, lesson: String })
const emit = defineEmits(['close'])
const k = computed(() => kindOf(props.material.kind))
const src = computed(() => embedUrl(props.material))
const dl = computed(() => downloadUrl(props.material))
const officeNote = computed(() => props.material.storage_path && ['docs', 'slides'].includes(fileType(props.material)))
const pdfFailed = ref(false)
const showPdf = computed(() => usePdfViewer(props.material) && !pdfFailed.value)

const onKey = (e) => e.key === 'Escape' && emit('close')
onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="fixed inset-0 z-[60] flex flex-col bg-black/90">
    <div class="flex flex-wrap items-center gap-3 border-b border-line bg-panel px-4 py-3">
      <span class="rounded px-2 py-0.5 font-mono text-xs font-semibold text-white" :style="{ background: k.color }">{{ k.icon }} {{ k.label }}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold">{{ material.title }}</p>
        <p class="truncate font-mono text-xs text-muted">{{ lesson }}<template v-if="material.size_bytes"> · {{ fmtSize(material.size_bytes) }}</template></p>
      </div>
      <a v-if="dl" :href="dl" class="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-ink">⬇ Download</a>
      <a :href="material.url" target="_blank" rel="noopener" class="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/40">Open in new tab ↗</a>
      <button class="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20" title="Close (Esc)" @click="emit('close')">✕</button>
    </div>

    <PdfViewer v-if="showPdf" :url="material.url" @fallback="pdfFailed = true" />
    <iframe
      v-else-if="src"
      :src="src"
      class="w-full flex-1 bg-white"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
    />
    <div v-else class="grid flex-1 place-items-center p-6 text-center">
      <div>
        <p class="font-display text-xl font-bold">This link opens on its own site</p>
        <p class="mt-1 break-all text-sm text-muted">{{ material.url }}</p>
        <a :href="material.url" target="_blank" rel="noopener" class="mt-4 inline-block rounded-lg bg-accent px-5 py-2 font-semibold text-ink">Open link ↗</a>
      </div>
    </div>
    <p v-if="officeNote" class="bg-panel px-4 py-1.5 text-center font-mono text-[11px] text-muted">
      Shown with Microsoft's free online viewer. If it doesn't load, use Download.
    </p>
  </div>
</template>
