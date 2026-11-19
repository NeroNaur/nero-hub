<script setup>
// Flashcard image slot: click to choose, or drop an image on it. Shows a warning if the image fails to load.
import { ref, watch } from 'vue'

const props = defineProps({ url: String, uploading: Boolean, label: String })
const emit = defineEmits(['pick'])
const over = ref(false)
const broken = ref(false)
watch(() => props.url, () => (broken.value = false))

const isFileDrag = (e) => [...(e.dataTransfer?.types || [])].includes('Files')
function onDrop(e) {
  over.value = false
  const f = e.dataTransfer.files?.[0]
  if (f) emit('pick', f)
}
function onChange(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) emit('pick', f)
}
</script>

<template>
  <label
    class="relative grid size-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed text-[10px] text-muted transition"
    :class="over ? 'border-accent bg-accent/15 scale-105' : broken ? 'border-red-400/70' : 'border-white/30 hover:border-white/60'"
    :title="url ? `Change image (${label}). Click or drop an image.` : `Add image to ${label}. Click or drop an image.`"
    @dragenter.prevent.stop="isFileDrag($event) && (over = true)"
    @dragover.prevent.stop
    @dragleave="over = false"
    @drop.prevent.stop="onDrop"
  >
    <img v-if="url && !broken" :src="url" alt="" class="absolute inset-0 size-full object-cover" @error="broken = true" />
    <span v-if="uploading" class="absolute inset-x-0 bottom-0 bg-ink/80 py-0.5 text-center">Uploading…</span>
    <span v-else-if="over" class="relative font-semibold text-accent">Drop</span>
    <span v-else-if="broken" class="relative px-1 text-center leading-tight text-red-300">⚠ didn't<br />load</span>
    <span v-else-if="!url" class="text-center leading-tight">🖼<br />Image</span>
    <input type="file" accept="image/*" class="hidden" @change="onChange" />
  </label>
</template>
