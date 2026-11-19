<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useDrop } from '@/lib/drop'
import { addMaterial, MAX_FILE_MB } from '@/lib/api'
import { KINDS, kindFromFile, kindFromUrl, fmtSize } from '@/lib/materials'

const props = defineProps({ module: Object, initialFile: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])

const tab = ref('file')
const file = ref(null)
const url = ref('')
const title = ref('')
const kind = ref('pdf')
const busy = ref('')
const error = ref('')

function onFile(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) takeFile(f)
}
function takeFile(f) {
  tab.value = 'file'
  const k = kindFromFile(f)
  if (!k) return (error.value = 'Only PDF, Word and PowerPoint files can be uploaded. For anything else, use a link.')
  error.value = ''
  file.value = f
  kind.value = k
  if (!title.value) title.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
}
const { over, on: dropOn } = useDrop(takeFile, { enabled: () => !busy.value })
onMounted(() => props.initialFile && takeFile(props.initialFile))

watch(url, (u) => {
  if (tab.value === 'link' && u.trim()) kind.value = kindFromUrl(u.trim())
})
const tooBig = computed(() => file.value && file.value.size > MAX_FILE_MB * 1048576)
const ready = computed(() =>
  title.value.trim() && (tab.value === 'file' ? file.value && !tooBig.value : /^https?:\/\//i.test(url.value.trim())),
)

async function save() {
  error.value = ''
  try {
    await addMaterial(
      {
        module_id: props.module.id,
        kind: kind.value,
        title: title.value,
        url: tab.value === 'link' ? url.value.trim() : null,
        file: tab.value === 'file' ? file.value : null,
        sort_order: (props.module.materials?.length || 0) + 1,
      },
      (stage) => (busy.value = stage),
    )
    emit('done')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" @click.self="!busy && emit('close')">
    <div class="w-full max-w-lg rounded-2xl border bg-panel p-6 transition" :class="over ? 'border-accent ring-2 ring-accent/40' : 'border-line'" v-on="dropOn">
      <div class="mb-4 flex items-start">
        <div>
          <p class="font-mono text-xs text-muted">{{ module.title }}</p>
          <h3 class="font-display text-2xl font-bold">Add material</h3>
        </div>
        <button class="ml-auto grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20" @click="emit('close')">✕</button>
      </div>

      <div class="mb-4 flex gap-1 border-b border-line">
        <button
          v-for="t in [{ k: 'file', l: 'Upload file' }, { k: 'link', l: 'Paste link' }]"
          :key="t.k"
          class="-mb-px border-b-2 px-3 py-2 text-sm"
          :class="tab === t.k ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'"
          @click="tab = t.k; error = ''; kind = t.k === 'file' ? (file ? kind : 'pdf') : (url ? kind : 'link')"
        >{{ t.l }}</button>
      </div>

      <div class="space-y-3">
        <template v-if="tab === 'file'">
          <label
            class="block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition"
            :class="over ? 'border-accent bg-accent/10' : 'border-line hover:border-white/40'"
          >
            <template v-if="over">
              <p class="font-semibold text-accent">Drop it here</p>
              <p class="text-xs text-muted">PDF, Word or PowerPoint</p>
            </template>
            <template v-else-if="file">
              <p class="font-semibold">{{ file.name }}</p>
              <p class="font-mono text-xs" :class="tooBig ? 'text-red-300' : 'text-muted'">{{ fmtSize(file.size) }}<template v-if="tooBig"> · over the {{ MAX_FILE_MB }} MB limit</template></p>
              <p class="mt-1 text-xs text-muted">Click to choose a different file</p>
            </template>
            <template v-else>
              <p class="font-semibold">Drop a file here, or click to choose</p>
              <p class="text-xs text-muted">PDF, Word or PowerPoint · up to {{ MAX_FILE_MB }} MB</p>
            </template>
            <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" class="hidden" @change="onFile" />
          </label>
          <p v-if="tooBig" class="text-xs text-amber-300">Too big for the free plan. Ask Claude to compress it, or upload it to Google Drive and use "Paste link".</p>
        </template>
        <input v-else v-model="url" placeholder="https://… (YouTube, Google Drive, any website)" class="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" />

        <input v-model="title" placeholder="Title, e.g. Meaning of Art (prof's slides)" class="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" />
        <div class="flex flex-wrap gap-1.5">
          <span class="mr-1 self-center text-xs text-muted">Label</span>
          <button
            v-for="k in KINDS"
            :key="k.key"
            class="rounded-full border px-3 py-1 text-xs font-semibold transition"
            :class="kind === k.key ? 'border-transparent text-white' : 'border-line text-muted hover:text-white'"
            :style="kind === k.key ? { background: k.color } : {}"
            @click="kind = k.key"
          >{{ k.icon }} {{ k.label }}</button>
        </div>
      </div>

      <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button class="rounded-lg px-4 py-2 text-sm text-muted hover:text-white" :disabled="!!busy" @click="emit('close')">Cancel</button>
        <button class="rounded-lg bg-accent px-5 py-2 font-semibold text-ink disabled:opacity-40" :disabled="!ready || !!busy" @click="save">
          {{ busy || 'Add material' }}
        </button>
      </div>
    </div>
  </div>
</template>
