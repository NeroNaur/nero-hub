<script setup>
import { inject, computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { saveQuizMeta, clearCache, modulesInTerm, TERMS } from '@/lib/api'
import { canEdit, editMode } from '@/lib/editMode'
import QuestionsEditor from '@/components/QuestionsEditor.vue'

const subject = inject('subject')
const reloadSubject = inject('reloadSubject')
const route = useRoute()
const s = computed(() => subject.value)
const quiz = computed(() => s.value.quizzes.find((z) => z.id === route.params.quiz))

const meta = reactive({ ...(quiz.value || {}), module_ids: [...(quiz.value?.module_ids || [])], _dirty: false })
const termLessons = computed(() => modulesInTerm(s.value, meta.term))
const flash = ref('')
const error = ref('')

function toast(msg) {
  error.value = ''
  flash.value = msg
  setTimeout(() => (flash.value = ''), 2000)
}
async function refresh() {
  clearCache(s.value.slug)
  await reloadSubject()
}
async function saveMeta() {
  if (!meta.title?.trim()) return (error.value = 'Give the quiz a title.')
  try {
    await saveQuizMeta({ ...meta, subject_id: s.value.id })
    meta._dirty = false
    await refresh()
    toast('Quiz details saved')
  } catch (e) {
    error.value = e.message
  }
}
async function onChanged(msg) {
  await refresh()
  toast(msg)
}
const input = 'w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm focus:border-white/40 focus:outline-none'
</script>

<template>
  <div v-if="!canEdit" class="rounded-xl border border-dashed border-accent/50 p-10 text-center">
    <p class="text-muted">Turn on Edit mode to edit this quiz.</p>
    <button class="mt-3 rounded-lg bg-accent px-4 py-2 font-semibold text-ink" @click="editMode.on = true">Turn on Edit mode</button>
  </div>
  <div v-else-if="!quiz" class="text-muted">Quiz not found.</div>

  <div v-else class="mx-auto max-w-3xl">
    <div class="mb-4 flex items-center gap-3">
      <RouterLink :to="{ name: 'quizzes', params: { subject: s.slug } }" class="font-mono text-xs text-muted hover:text-white">← All quizzes</RouterLink>
      <RouterLink :to="{ name: 'quizzes-review', params: { subject: s.slug, quiz: quiz.id } }" class="ml-auto text-sm text-muted underline hover:text-white">Preview answer key</RouterLink>
    </div>

    <div class="mb-6 space-y-3 rounded-xl border bg-panel p-4" :class="meta._dirty ? 'border-amber-400/50' : 'border-line'" @input="meta._dirty = true">
      <p class="font-mono text-xs text-muted">QUIZ DETAILS</p>
      <input v-model="meta.title" placeholder="Title" :class="input" class="font-semibold" />
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="text-xs text-muted">Date given<input v-model="meta.quiz_date" type="date" :class="input" class="mt-1" /></label>
        <label class="text-xs text-muted">Term
          <select v-model="meta.term" :class="input" class="mt-1" @change="meta.module_ids = []; meta._dirty = true">
            <option v-for="t in TERMS" :key="t.key" :value="t.key">{{ t.label }}</option>
          </select>
        </label>
        <label class="text-xs text-muted">Time limit (minutes, optional)<input v-model.number="meta.time_limit_min" type="number" min="1" :class="input" class="mt-1" /></label>
      </div>
      <input v-model="meta.note" placeholder="Note (optional), e.g. 20 items, open notes" :class="input" />
      <div v-if="termLessons.length">
        <p class="mb-1 text-xs text-muted">Lessons it covered (optional)</p>
        <label v-for="m in termLessons" :key="m.id" class="mr-4 inline-flex items-center gap-2 text-sm">
          <input v-model="meta.module_ids" type="checkbox" :value="m.id" @change="meta._dirty = true" /> {{ m.title }}
        </label>
      </div>
      <button class="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-40" :disabled="!meta._dirty" @click="saveMeta">Save details</button>
    </div>

    <p class="mb-3 font-mono text-xs text-muted">QUESTIONS ({{ quiz.questions.length }})</p>
    <QuestionsEditor
      table="quiz_questions"
      parent-key="quiz_id"
      :parent-id="quiz.id"
      :initial="quiz.questions"
      ordered
      @changed="onChanged"
      @error="(m) => (error = m)"
    />

    <div class="fixed bottom-5 right-5 space-y-2 text-sm">
      <p v-if="flash" class="rounded-lg border border-green-500/40 bg-green-500/20 px-4 py-2 text-green-200">{{ flash }}</p>
      <p v-if="error" class="max-w-sm rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-2 text-red-200">{{ error }}</p>
    </div>
  </div>
</template>
