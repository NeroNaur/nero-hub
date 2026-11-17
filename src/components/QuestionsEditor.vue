<script setup>
// Edit/add/delete/reorder questions for a lesson (table "questions") or a class quiz ("quiz_questions").
import { ref } from 'vue'
import { updateRow, insertRow, deleteRow } from '@/lib/api'
import { toForm, fromForm, choiceLines } from '@/lib/questionForm'

const props = defineProps({
  table: String, // 'questions' | 'quiz_questions'
  parentKey: String, // 'module_id' | 'quiz_id'
  parentId: String,
  initial: Array,
  ordered: Boolean, // quiz questions keep a fixed order (sort_order)
})
const emit = defineEmits(['changed', 'error'])

const typeLabel = { mcq: 'Multiple choice', true_false: 'True/False', identification: 'Identification', enumeration: 'Enumeration' }
const items = ref(props.initial.map((q) => ({ id: q.id, form: toForm(q) })))

function add(type) {
  const item = { id: null, form: toForm({ type, prompt: '', answer: type === 'true_false' ? true : '' }), _dirty: true }
  props.ordered ? items.value.push(item) : items.value.unshift(item)
}
function onType(q) {
  const keep = { prompt: q.form.prompt, explanation: q.form.explanation }
  q.form = { ...toForm({ type: q.form.type, answer: q.form.type === 'true_false' ? true : '' }), ...keep }
  q._dirty = true
}
async function save(q, i) {
  const { q: row, errors } = fromForm(q.form)
  q._err = errors.join(' ')
  if (errors.length) return
  try {
    if (props.ordered) row.sort_order = i + 1
    if (q.id) await updateRow(props.table, q.id, row)
    else q.id = (await insertRow(props.table, { ...row, [props.parentKey]: props.parentId })).id
    q._dirty = false
    emit('changed', 'Question saved')
  } catch (e) {
    emit('error', e.message)
  }
}
async function remove(q, i) {
  if (!confirm('Delete this question?')) return
  try {
    if (q.id) await deleteRow(props.table, q.id)
    items.value.splice(i, 1)
    emit('changed', 'Question deleted')
  } catch (e) {
    emit('error', e.message)
  }
}
async function move(i, d) {
  const j = i + d
  if (j < 0 || j >= items.value.length) return
  const arr = items.value
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
  try {
    for (const k of [i, j]) if (arr[k].id) await updateRow(props.table, arr[k].id, { sort_order: k + 1 })
    emit('changed', 'Order saved')
  } catch (e) {
    emit('error', e.message)
  }
}

const input = 'w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm focus:border-white/40 focus:outline-none'
const btn = 'rounded-lg px-3 py-1.5 text-xs font-semibold'
</script>

<template>
  <section class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <button v-for="(l, t) in typeLabel" :key="t" :class="btn" class="border border-line hover:border-white/40" @click="add(t)">+ {{ l }}</button>
    </div>
    <div
      v-for="(q, i) in items"
      :key="q.id || 'new' + i"
      class="space-y-3 rounded-xl border bg-panel p-4"
      :class="q._dirty ? 'border-amber-400/50' : 'border-line'"
      @input="q._dirty = true"
    >
      <div class="flex items-center gap-2">
        <span v-if="ordered" class="font-mono text-sm font-semibold">{{ i + 1 }}.</span>
        <select v-model="q.form.type" class="rounded-lg border border-line bg-ink px-2 py-1 text-xs" @change="onType(q)">
          <option v-for="(l, t) in typeLabel" :key="t" :value="t">{{ l }}</option>
        </select>
        <span v-if="!q.id" class="font-mono text-xs text-amber-300">new</span>
        <span v-else-if="q._dirty" class="font-mono text-xs text-amber-300">unsaved</span>
        <div class="ml-auto flex items-center gap-1">
          <template v-if="ordered">
            <button class="px-1.5 text-muted hover:text-white" title="Move up" @click="move(i, -1)">↑</button>
            <button class="px-1.5 text-muted hover:text-white" title="Move down" @click="move(i, 1)">↓</button>
          </template>
          <button class="text-xs text-red-300 hover:underline" @click="remove(q, i)">Delete</button>
        </div>
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
      <button :class="btn" class="bg-accent text-ink disabled:opacity-40" :disabled="!q._dirty" @click="save(q, i)">Save</button>
    </div>
    <p v-if="!items.length" class="text-sm text-muted">No questions yet. Add one above.</p>
  </section>
</template>
