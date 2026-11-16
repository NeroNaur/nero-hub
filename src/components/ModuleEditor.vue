<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getModuleAdmin, updateRow, insertRow, deleteRow, clearCache } from '@/lib/api'
import { toForm, fromForm, choiceLines } from '@/lib/questionForm'

const props = defineProps({ moduleId: String, subject: Object })
const emit = defineEmits(['back'])

const loading = ref(true)
const error = ref('')
const flash = ref('')
const meta = reactive({ title: '', summary: '', sort_order: 0 })
const notes = ref([]) // { id, title, content, _dirty }
const questions = ref([]) // { id, form, _dirty, _err }
const cards = ref([]) // { id, front, back, _dirty }
const section = ref('questions')

const typeLabel = { mcq: 'Multiple choice', true_false: 'True/False', identification: 'Identification', enumeration: 'Enumeration' }

async function load() {
  loading.value = true
  try {
    const m = await getModuleAdmin(props.moduleId)
    Object.assign(meta, { title: m.title, summary: m.summary || '', sort_order: m.sort_order ?? 0 })
    notes.value = m.reviews.map((r) => ({ id: r.id, title: r.title || '', content: r.content, sort_order: r.sort_order }))
    questions.value = m.questions.map((q) => ({ id: q.id, form: toForm(q) }))
    cards.value = m.flashcards.map((c) => ({ id: c.id, front: c.front, back: c.back, sort_order: c.sort_order }))
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
onMounted(load)

function done(msg) {
  clearCache(props.subject.slug)
  flash.value = msg
  setTimeout(() => (flash.value = ''), 2000)
}
async function run(fn, msg) {
  error.value = ''
  try {
    await fn()
    done(msg)
  } catch (e) {
    error.value = e.message
  }
}

// ---- module ----
const saveMeta = () =>
  run(() => updateRow('modules', props.moduleId, { title: meta.title.trim(), summary: meta.summary.trim() || null, sort_order: Number(meta.sort_order) || 0 }), 'Module saved')

// ---- notes ----
function addNote() {
  notes.value.push({ id: null, title: '', content: '', sort_order: notes.value.length + 1, _dirty: true })
}
const saveNote = (n) =>
  run(async () => {
    const row = { title: n.title.trim() || null, content: n.content, sort_order: n.sort_order }
    if (n.id) await updateRow('reviews', n.id, row)
    else n.id = (await insertRow('reviews', { ...row, module_id: props.moduleId })).id
    n._dirty = false
  }, 'Note saved')
async function removeNote(n, i) {
  if (!confirm('Delete this note section?')) return
  if (n.id) await run(() => deleteRow('reviews', n.id), 'Note deleted')
  notes.value.splice(i, 1)
}

// ---- questions ----
function addQuestion(type = 'mcq') {
  questions.value.unshift({ id: null, form: toForm({ type, prompt: '', answer: type === 'true_false' ? true : '' }), _dirty: true })
}
function onType(q) {
  const keep = { prompt: q.form.prompt, explanation: q.form.explanation }
  q.form = { ...toForm({ type: q.form.type, answer: q.form.type === 'true_false' ? true : '' }), ...keep }
  q._dirty = true
}
const saveQuestion = (q) => {
  const { q: row, errors } = fromForm(q.form)
  q._err = errors.join(' ')
  if (errors.length) return
  return run(async () => {
    if (q.id) await updateRow('questions', q.id, row)
    else q.id = (await insertRow('questions', { ...row, module_id: props.moduleId })).id
    q._dirty = false
  }, 'Question saved')
}
async function removeQuestion(q, i) {
  if (!confirm('Delete this question?')) return
  if (q.id) await run(() => deleteRow('questions', q.id), 'Question deleted')
  questions.value.splice(i, 1)
}

// ---- flashcards ----
function addCard() {
  cards.value.push({ id: null, front: '', back: '', sort_order: cards.value.length + 1, _dirty: true })
}
const saveCard = (c) => {
  if (!c.front.trim() || !c.back.trim()) return (error.value = 'A flashcard needs a front and a back.')
  return run(async () => {
    const row = { front: c.front.trim(), back: c.back.trim(), sort_order: c.sort_order }
    if (c.id) await updateRow('flashcards', c.id, row)
    else c.id = (await insertRow('flashcards', { ...row, module_id: props.moduleId })).id
    c._dirty = false
  }, 'Card saved')
}
async function removeCard(c, i) {
  if (!confirm('Delete this flashcard?')) return
  if (c.id) await run(() => deleteRow('flashcards', c.id), 'Card deleted')
  cards.value.splice(i, 1)
}

const input = 'w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm focus:border-white/40 focus:outline-none'
const btn = 'rounded-lg px-3 py-1.5 text-xs font-semibold'
</script>

<template>
  <div>
    <button class="text-sm text-muted hover:text-white mb-4" @click="emit('back')">← Back to modules</button>
    <p v-if="loading" class="text-muted text-sm">Loading…</p>

    <template v-else>
      <!-- Module details -->
      <div class="rounded-xl border border-line bg-panel p-4 space-y-3 mb-6">
        <p class="font-mono text-xs text-muted">{{ subject.name }} · MODULE</p>
        <div class="grid grid-cols-[1fr_90px] gap-3">
          <label class="text-xs text-muted">Title<input v-model="meta.title" :class="input" class="mt-1" /></label>
          <label class="text-xs text-muted">Order<input v-model.number="meta.sort_order" type="number" :class="input" class="mt-1" /></label>
        </div>
        <label class="block text-xs text-muted">Description (optional)<textarea v-model="meta.summary" rows="2" :class="input" class="mt-1" /></label>
        <button :class="btn" class="bg-accent text-ink" @click="saveMeta">Save module</button>
      </div>

      <div class="flex gap-1 border-b border-line mb-4">
        <button
          v-for="s in [{ k: 'questions', l: `Questions (${questions.length})` }, { k: 'notes', l: `Notes (${notes.length})` }, { k: 'cards', l: `Flashcards (${cards.length})` }]"
          :key="s.k"
          class="px-3 py-2 -mb-px border-b-2 text-sm"
          :class="section === s.k ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'"
          @click="section = s.k"
        >{{ s.l }}</button>
      </div>

      <!-- Questions -->
      <section v-if="section === 'questions'" class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <button v-for="(l, t) in typeLabel" :key="t" :class="btn" class="border border-line hover:border-white/40" @click="addQuestion(t)">+ {{ l }}</button>
        </div>
        <div v-for="(q, i) in questions" :key="q.id || 'new' + i" class="rounded-xl border bg-panel p-4 space-y-3" :class="q._dirty ? 'border-amber-400/50' : 'border-line'" @input="q._dirty = true">
          <div class="flex items-center gap-2">
            <select v-model="q.form.type" class="rounded-lg border border-line bg-ink px-2 py-1 text-xs" @change="onType(q)">
              <option v-for="(l, t) in typeLabel" :key="t" :value="t">{{ l }}</option>
            </select>
            <span v-if="!q.id" class="font-mono text-xs text-amber-300">new</span>
            <span v-else-if="q._dirty" class="font-mono text-xs text-amber-300">unsaved</span>
            <button class="ml-auto text-xs text-red-300 hover:underline" @click="removeQuestion(q, i)">Delete</button>
          </div>
          <textarea v-model="q.form.prompt" rows="2" placeholder="Question" :class="input" />

          <template v-if="q.form.type === 'mcq'">
            <textarea v-model="q.form.choicesText" rows="4" placeholder="Choices, one per line" :class="input" class="font-mono" />
            <label class="block text-xs text-muted">Correct choice
              <select v-model="q.form.answerText" :class="input" class="mt-1" @change="q._dirty = true">
                <option value="" disabled>Pick one…</option>
                <option v-for="c in choiceLines(q.form)" :key="c" :value="c">{{ c }}</option>
              </select>
            </label>
          </template>
          <div v-else-if="q.form.type === 'true_false'" class="flex gap-4 text-sm">
            <label class="flex items-center gap-2"><input v-model="q.form.answerBool" type="radio" :value="true" /> True</label>
            <label class="flex items-center gap-2"><input v-model="q.form.answerBool" type="radio" :value="false" /> False</label>
          </div>
          <label v-else-if="q.form.type === 'identification'" class="block text-xs text-muted">
            Accepted answers, one per line (first one is shown as the answer)
            <textarea v-model="q.form.answerText" rows="2" :class="input" class="mt-1 font-mono" />
          </label>
          <label v-else class="block text-xs text-muted">
            One item per line · alternatives on the same line separated by <code>|</code>
            <textarea v-model="q.form.answerText" rows="4" :class="input" class="mt-1 font-mono" placeholder="Visual Arts | Visual&#10;Applied Art | Applied" />
          </label>

          <input v-model="q.form.explanation" placeholder="Explanation (optional)" :class="input" />
          <p v-if="q._err" class="text-xs text-red-300">{{ q._err }}</p>
          <button :class="btn" class="bg-accent text-ink disabled:opacity-40" :disabled="!q._dirty" @click="saveQuestion(q)">Save</button>
        </div>
        <p v-if="!questions.length" class="text-sm text-muted">No questions yet.</p>
      </section>

      <!-- Notes -->
      <section v-else-if="section === 'notes'" class="space-y-3">
        <div v-for="(n, i) in notes" :key="n.id || 'n' + i" class="rounded-xl border bg-panel p-4 space-y-3" :class="n._dirty ? 'border-amber-400/50' : 'border-line'" @input="n._dirty = true">
          <div class="flex items-center gap-2">
            <input v-model="n.title" placeholder="Section title (optional)" :class="input" />
            <input v-model.number="n.sort_order" type="number" title="Order" class="w-16 rounded-lg border border-line bg-ink px-2 py-2 text-sm" />
            <button class="text-xs text-red-300 hover:underline" @click="removeNote(n, i)">Delete</button>
          </div>
          <textarea v-model="n.content" rows="12" placeholder="Notes (Markdown supported)" :class="input" class="font-mono text-xs leading-relaxed" />
          <button :class="btn" class="bg-accent text-ink disabled:opacity-40" :disabled="!n._dirty" @click="saveNote(n)">Save</button>
        </div>
        <button :class="btn" class="border border-line hover:border-white/40" @click="addNote">+ Note section</button>
      </section>

      <!-- Flashcards -->
      <section v-else class="space-y-3">
        <div v-for="(c, i) in cards" :key="c.id || 'c' + i" class="rounded-xl border bg-panel p-4 grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-start" :class="c._dirty ? 'border-amber-400/50' : 'border-line'" @input="c._dirty = true">
          <input v-model="c.front" placeholder="Front" :class="input" />
          <textarea v-model="c.back" rows="2" placeholder="Back" :class="input" />
          <div class="flex sm:flex-col gap-2">
            <button :class="btn" class="bg-accent text-ink disabled:opacity-40" :disabled="!c._dirty" @click="saveCard(c)">Save</button>
            <button class="text-xs text-red-300 hover:underline" @click="removeCard(c, i)">Delete</button>
          </div>
        </div>
        <button :class="btn" class="border border-line hover:border-white/40" @click="addCard">+ Flashcard</button>
      </section>

      <div class="fixed bottom-5 right-5 space-y-2 text-sm">
        <p v-if="flash" class="rounded-lg bg-green-500/20 border border-green-500/40 px-4 py-2 text-green-200">{{ flash }}</p>
        <p v-if="error" class="rounded-lg bg-red-500/20 border border-red-500/40 px-4 py-2 text-red-200 max-w-sm">{{ error }}</p>
      </div>
    </template>
  </div>
</template>
