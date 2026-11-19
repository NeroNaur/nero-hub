<script setup>
import { ref, inject } from 'vue'
import { canEdit } from '@/lib/editMode'
import { updateMaterial, deleteMaterial, addMaterial, clearCache, MAX_FILE_MB } from '@/lib/api'
import { KINDS, kindOf, downloadUrl, fmtSize, kindFromFile } from '@/lib/materials'
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
  (f, all) => {
    if (all.length > 1) return uploadMany(all)
    droppedFile.value = f
    adding.value = true
  },
  { enabled: () => canEdit.value && !adding.value && !batchBusy.value },
)

// ---- several files dropped at once: upload them one after another ----
const batch = ref([]) // { name, state: 'waiting' | 'uploading' | 'done' | 'error', msg }
const batchBusy = ref(false)
async function uploadMany(files) {
  batchBusy.value = true
  batch.value = files.map((f) => ({ name: f.name, state: 'waiting', msg: '' }))
  let order = props.module.materials.length
  for (const [i, f] of files.entries()) {
    const row = batch.value[i]
    const kind = kindFromFile(f)
    if (!kind) Object.assign(row, { state: 'error', msg: 'not a PDF, Word or PowerPoint file' })
    else if (f.size > MAX_FILE_MB * 1048576) Object.assign(row, { state: 'error', msg: `over ${MAX_FILE_MB} MB` })
    else {
      row.state = 'uploading'
      try {
        await addMaterial({
          module_id: props.module.id,
          kind,
          title: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
          file: f,
          sort_order: ++order,
        })
        row.state = 'done'
      } catch (e) {
        Object.assign(row, { state: 'error', msg: e.message })
      }
    }
  }
  batchBusy.value = false
  await refresh()
  if (batch.value.every((r) => r.state === 'done')) setTimeout(() => (batch.value = []), 3000)
}
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

    <div v-if="batch.length" class="mt-2 space-y-1 rounded-xl border border-line bg-ink p-3 font-mono text-xs">
      <p class="mb-1 text-muted">Uploading {{ batch.length }} files to {{ module.title }}</p>
      <p v-for="b in batch" :key="b.name" :class="{ 'text-green-300': b.state === 'done', 'text-red-300': b.state === 'error', 'text-accent': b.state === 'uploading', 'text-muted': b.state === 'waiting' }">
        {{ b.state === 'done' ? '✓' : b.state === 'error' ? '✗' : b.state === 'uploading' ? '…' : '·' }} {{ b.name }}<template v-if="b.msg"> ({{ b.msg }})</template>
      </p>
      <button v-if="!batchBusy" class="mt-1 text-muted underline hover:text-white" @click="batch = []">Close</button>
    </div>

    <button
      v-if="canEdit"
      class="mt-2 w-full rounded-xl border-2 border-dashed border-accent/50 py-2 text-sm font-semibold text-accent hover:bg-accent/5"
      @click="adding = true"
    >+ Add material <span class="font-normal opacity-70">(or drop files here)</span></button>

    <MaterialViewer v-if="viewing" :material="viewing" :lesson="module.title" @close="viewing = null" />
    <AddMaterialModal v-if="adding" :module="module" :initial-file="droppedFile" @close="closeAdd" @done="refresh" />
  </div>
</template>
