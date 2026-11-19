<script setup>
import { ref, inject } from 'vue'
import { canEdit } from '@/lib/editMode'
import { updateMaterial, deleteMaterial, clearCache } from '@/lib/api'
import { KINDS, kindOf, downloadUrl, fmtSize } from '@/lib/materials'
import MaterialViewer from './MaterialViewer.vue'
import AddMaterialModal from './AddMaterialModal.vue'
import { useDrop } from '@/lib/drop'

const props = defineProps({
  subject: Object,
  module: Object,
  items: Array, // defaults to module.materials (lets the Materials tab pass a filtered list)
  compact: Boolean,
})
const reloadSubject = inject('reloadSubject')
const viewing = ref(null)
const adding = ref(false)
const droppedFile = ref(null)
const { over, on: dropOn } = useDrop(
  (f) => {
    droppedFile.value = f
    adding.value = true
  },
  { enabled: () => canEdit.value && !adding.value },
)
const renaming = ref(null) // { id, title, kind }

const list = () => props.items ?? props.module.materials

function closeAdd() {
  adding.value = false
  droppedFile.value = null
}
async function refresh() {
  closeAdd()
  renaming.value = null
  clearCache(props.subject.slug)
  await reloadSubject()
}
async function run(fn) {
  try {
    await fn()
    await refresh()
  } catch (e) {
    alert(e.message)
  }
}
const saveRename = () =>
  run(() => updateMaterial(renaming.value.id, { title: renaming.value.title.trim(), kind: renaming.value.kind }))
function move(m, d) {
  const arr = props.module.materials
  const i = arr.indexOf(m)
  const other = arr[i + d]
  if (!other) return
  run(async () => {
    await updateMaterial(m.id, { sort_order: i + d + 1 })
    await updateMaterial(other.id, { sort_order: i + 1 })
  })
}
const remove = (m) => confirm(`Delete "${m.title}"?`) && run(() => deleteMaterial(m))
</script>

<template>
  <div v-on="dropOn" class="relative rounded-xl transition" :class="over && 'ring-2 ring-accent/60'">
    <div v-if="over" class="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl bg-ink/80 font-semibold text-accent">
      Drop to add to {{ module.title }}
    </div>
    <ul class="space-y-2">
      <li
        v-for="m in list()"
        :key="m.id"
        class="flex items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2.5"
      >
        <span class="shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white" :style="{ background: kindOf(m.kind).color }">
          {{ kindOf(m.kind).icon }} {{ kindOf(m.kind).label }}
        </span>

        <template v-if="renaming?.id === m.id">
          <input v-model="renaming.title" class="min-w-0 flex-1 rounded border border-line bg-ink px-2 py-1 text-sm" @keydown.enter="saveRename" />
          <select v-model="renaming.kind" class="rounded border border-line bg-ink px-1 py-1 text-xs">
            <option v-for="k in KINDS" :key="k.key" :value="k.key">{{ k.label }}</option>
          </select>
          <button class="text-xs font-semibold text-accent" @click="saveRename">Save</button>
          <button class="text-xs text-muted" @click="renaming = null">Cancel</button>
        </template>

        <template v-else>
          <button class="min-w-0 flex-1 text-left" @click="viewing = m">
            <p class="truncate text-sm font-semibold hover:underline">{{ m.title }}</p>
            <p v-if="!compact && (m.file_name || m.size_bytes)" class="truncate font-mono text-[11px] text-muted">
              {{ m.file_name }}<template v-if="m.size_bytes"> · {{ fmtSize(m.size_bytes) }}</template>
            </p>
          </button>
          <button class="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs hover:border-white/40" @click="viewing = m">View</button>
          <a v-if="downloadUrl(m)" :href="downloadUrl(m)" class="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs hover:border-white/40" title="Download">⬇</a>
          <template v-if="canEdit">
            <button class="shrink-0 px-1 text-xs text-muted hover:text-white" title="Move up" @click="move(m, -1)">↑</button>
            <button class="shrink-0 px-1 text-xs text-muted hover:text-white" title="Move down" @click="move(m, 1)">↓</button>
            <button class="shrink-0 px-1 text-xs text-accent" title="Rename / change label" @click="renaming = { id: m.id, title: m.title, kind: m.kind }">✏️</button>
            <button class="shrink-0 px-1 text-xs text-red-300" title="Delete" @click="remove(m)">🗑</button>
          </template>
        </template>
      </li>
    </ul>

    <button
      v-if="canEdit"
      class="mt-2 w-full rounded-xl border-2 border-dashed border-accent/50 py-2 text-sm font-semibold text-accent hover:bg-accent/5"
      @click="adding = true"
    >+ Add material <span class="font-normal opacity-70">(or drop a file here)</span></button>

    <MaterialViewer v-if="viewing" :material="viewing" :lesson="module.title" @close="viewing = null" />
    <AddMaterialModal v-if="adding" :module="module" :initial-file="droppedFile" @close="closeAdd" @done="refresh" />
  </div>
</template>
