<script setup>
import { ref, computed } from 'vue'
import { useDrop, readText } from '@/lib/drop'
import { importModule, clearCache, TERMS } from '@/lib/api'
import { parseImport, slugify } from '@/lib/importFormat'

const props = defineProps({ subject: Object, term: String })
const emit = defineEmits(['close', 'done'])

const tab = ref('file') // file | notes
const busy = ref(false)
const error = ref('')
const termLabel = computed(() => TERMS.find((t) => t.key === props.term)?.label)
const inTerm = computed(() => props.subject.modules.filter((m) => m.term === props.term))

// ---- lesson file ----
const text = ref('')
const parsed = computed(() => (text.value.trim() ? parseImport(text.value, { subject: props.subject.slug, term: props.term }) : null))
const existingSlugs = computed(() => new Set(props.subject.modules.map((m) => m.slug)))
function onFile(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) takeJson(f)
}
async function takeJson(f) {
  error.value = ''
  if (!/\.(json|txt)$/i.test(f.name) && f.type !== 'application/json')
    return (error.value = `"${f.name}" isn't a .json file.`)
  tab.value = 'file'
  text.value = await readText(f)
}
const { over, on: dropOn } = useDrop(takeJson, { enabled: () => !busy.value })

// ---- notes only ----
const nTitle = ref('')
const nText = ref('')

async function add() {
  error.value = ''
  busy.value = true
  try {
    if (tab.value === 'file') {
      for (const m of parsed.value.modules) await importModule(props.subject.id, m, { replace: true })
    } else {
      await importModule(
        props.subject.id,
        {
          slug: slugify(nTitle.value),
          title: nTitle.value.trim(),
          summary: null,
          order: inTerm.value.length + 1,
          term: props.term,
          notes: [{ title: null, content: nText.value }],
          questions: [],
        },
        { replace: true },
      )
    }
    clearCache(props.subject.slug)
    emit('done')
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
const canAdd = computed(() =>
  tab.value === 'file'
    ? parsed.value && !parsed.value.errors.length
    : nTitle.value.trim() && nText.value.trim(),
)
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" @click.self="emit('close')">
    <div class="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border bg-panel p-6 transition" :class="over ? 'border-accent ring-2 ring-accent/40' : 'border-line'" v-on="dropOn">
      <div class="flex items-start mb-4">
        <div>
          <p class="font-mono text-xs" :style="{ color: subject.color }">{{ subject.name }} · {{ termLabel }}</p>
          <h3 class="font-display text-2xl font-bold">Add lesson</h3>
        </div>
        <button class="ml-auto grid place-items-center size-8 rounded-full bg-white/10 hover:bg-white/20" @click="emit('close')">✕</button>
      </div>

      <div class="flex gap-1 border-b border-line mb-4">
        <button
          v-for="t in [{ k: 'file', l: 'Lesson file (JSON)' }, { k: 'notes', l: 'Notes only' }]"
          :key="t.k"
          class="px-3 py-2 -mb-px border-b-2 text-sm"
          :class="tab === t.k ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'"
          @click="tab = t.k"
        >{{ t.l }}</button>
      </div>

      <section v-if="tab === 'file'" class="space-y-3">
        <label class="inline-block cursor-pointer rounded-lg border border-line px-4 py-2 text-sm hover:border-white/40">
          Choose .json file…
          <input type="file" accept=".json,application/json" class="hidden" @change="onFile" />
        </label>
        <textarea v-model="text" rows="9" spellcheck="false" :placeholder="over ? 'Drop the .json file here' : '…or drop the .json file here, or paste the JSON'" class="w-full rounded-xl border border-line bg-ink p-3 font-mono text-xs" />
        <div v-if="parsed" class="rounded-xl border border-line bg-ink p-3 text-sm space-y-1">
          <template v-if="parsed.errors.length">
            <p class="font-semibold text-red-300">Fix these first:</p>
            <ul class="list-disc pl-5 text-red-200/90"><li v-for="e in parsed.errors" :key="e">{{ e }}</li></ul>
          </template>
          <template v-else>
            <p v-for="m in parsed.modules" :key="m.slug">
              <span class="font-semibold">{{ m.title }}</span>
              <span class="font-mono text-xs text-muted"> · {{ m.notes.length }} note sections · {{ m.questions.length }} questions</span>
              <span v-if="existingSlugs.has(m.slug)" class="font-mono text-xs text-amber-300"> · replaces the existing lesson</span>
            </p>
            <p v-for="w in parsed.warnings" :key="w" class="text-xs text-amber-300">⚠ {{ w }}</p>
          </template>
        </div>
      </section>

      <section v-else class="space-y-3">
        <input v-model="nTitle" placeholder="Lesson title, e.g. Lesson Two" class="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" />
        <textarea v-model="nText" rows="12" placeholder="Paste notes… (shows under Study as-is; no questions)" class="w-full rounded-xl border border-line bg-ink p-3 text-sm" />
      </section>

      <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg px-4 py-2 text-sm text-muted hover:text-white" @click="emit('close')">Cancel</button>
        <button class="rounded-lg bg-accent px-5 py-2 font-semibold text-ink disabled:opacity-40" :disabled="busy || !canAdd" @click="add">
          {{ busy ? 'Adding…' : `Add to ${termLabel}` }}
        </button>
      </div>
    </div>
  </div>
</template>
