<script setup>
import { ref, computed } from 'vue'
import { useDrop, readText } from '@/lib/drop'
import { importQuiz, saveQuizMeta, clearCache, TERMS } from '@/lib/api'
import { parseQuizImport } from '@/lib/importFormat'
import { kindInfo } from '@/lib/quizzes'

const props = defineProps({ subject: Object, term: String, kind: { type: String, default: 'quiz' } })
const k = computed(() => kindInfo(props.kind))
const emit = defineEmits(['close', 'done', 'created'])

const tab = ref('file')
const text = ref('')
const busy = ref(false)
const error = ref('')
const title = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const termLabel = computed(() => TERMS.find((t) => t.key === props.term)?.label)
const parsed = computed(() => (text.value.trim() ? parseQuizImport(text.value, { subject: props.subject.slug, term: props.term, kind: props.kind }) : null))
const slugToId = computed(() => Object.fromEntries(props.subject.modules.map((m) => [m.slug, m.id])))
const unknownLessons = computed(() =>
  (parsed.value?.quizzes || []).flatMap((z) => z.lessons).filter((sl) => !slugToId.value[sl]),
)

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

async function add() {
  error.value = ''
  busy.value = true
  try {
    if (tab.value === 'file') {
      for (const z of parsed.value.quizzes) {
        await importQuiz({
          ...z,
          subject_id: props.subject.id,
          module_ids: z.lessons.map((sl) => slugToId.value[sl]).filter(Boolean),
        })
      }
      clearCache(props.subject.slug)
      emit('done')
    } else {
      const id = await saveQuizMeta({ subject_id: props.subject.id, term: props.term, kind: props.kind, title: title.value, quiz_date: props.kind === 'quiz' ? date.value : null })
      clearCache(props.subject.slug)
      emit('created', id)
    }
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
const canAdd = computed(() => (tab.value === 'file' ? parsed.value && !parsed.value.errors.length : title.value.trim()))
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" @click.self="emit('close')">
    <div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-panel p-6 transition" :class="over ? 'border-accent ring-2 ring-accent/40' : 'border-line'" v-on="dropOn">
      <div class="mb-4 flex items-start">
        <div>
          <p class="font-mono text-xs" :style="{ color: subject.color }">{{ subject.name }} · {{ termLabel }}</p>
          <h3 class="font-display text-2xl font-bold">Add {{ k.one }}</h3>
        </div>
        <button class="ml-auto grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20" @click="emit('close')">✕</button>
      </div>

      <div class="mb-4 flex gap-1 border-b border-line">
        <button
          v-for="t in [{ k: 'file', l: `${k.One} file (JSON)` }, { k: 'hand', l: 'Build by hand' }]"
          :key="t.k"
          class="-mb-px border-b-2 px-3 py-2 text-sm"
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
        <div v-if="parsed" class="space-y-1 rounded-xl border border-line bg-ink p-3 text-sm">
          <template v-if="parsed.errors.length">
            <p class="font-semibold text-red-300">Fix these first:</p>
            <ul class="list-disc pl-5 text-red-200/90"><li v-for="e in parsed.errors" :key="e">{{ e }}</li></ul>
          </template>
          <template v-else>
            <p v-for="z in parsed.quizzes" :key="z.title">
              <span class="font-semibold">{{ z.title }}</span>
              <span class="font-mono text-xs text-muted"> · {{ z.questions.length }} questions<template v-if="z.quiz_date"> · {{ z.quiz_date }}</template></span>
            </p>
            <p v-for="w in parsed.warnings" :key="w" class="text-xs text-amber-300">⚠ {{ w }}</p>
            <p v-if="unknownLessons.length" class="text-xs text-amber-300">⚠ Lesson(s) not found, will be skipped: {{ unknownLessons.join(', ') }}</p>
          </template>
        </div>
      </section>

      <section v-else class="space-y-3">
        <input v-model="title" :placeholder="kind === 'quiz' ? 'Quiz title, e.g. Quiz 1: Meaning of Art' : kind === 'mock_exam' ? 'e.g. Prelim Mock Exam' : 'e.g. Mock Quiz: Functions of Art'" class="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" />
        <label v-if="kind === 'quiz'" class="block text-xs text-muted">Date given
          <input v-model="date" type="date" class="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" />
        </label>
        <p class="text-xs text-muted">You'll add the questions on the next screen.</p>
      </section>

      <p v-if="error" class="mt-3 text-sm text-red-300">{{ error }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <button class="rounded-lg px-4 py-2 text-sm text-muted hover:text-white" @click="emit('close')">Cancel</button>
        <button class="rounded-lg bg-accent px-5 py-2 font-semibold text-ink disabled:opacity-40" :disabled="busy || !canAdd" @click="add">
          {{ busy ? 'Adding…' : tab === 'file' ? `Add to ${termLabel}` : 'Create & add questions' }}
        </button>
      </div>
    </div>
  </div>
</template>
