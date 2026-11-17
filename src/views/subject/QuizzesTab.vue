<script setup>
import { inject, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { quizzesInTerm, deleteQuiz, clearCache, TERMS } from '@/lib/api'
import { currentTerm } from '@/lib/term'
import { canEdit } from '@/lib/editMode'
import { quizScores, fmtDate } from '@/lib/quizzes'
import TermPicker from '@/components/TermPicker.vue'
import AddQuizModal from '@/components/AddQuizModal.vue'

const subject = inject('subject')
const reloadSubject = inject('reloadSubject')
const router = useRouter()
const s = computed(() => subject.value)
const term = computed(() => currentTerm(s.value))
const termLabel = computed(() => TERMS.find((t) => t.key === term.value).label)
const quizzes = computed(() => quizzesInTerm(s.value, term.value))
const adding = ref(false)
const lessonNames = (z) => z.module_ids.map((id) => s.value.moduleById[id]?.title).filter(Boolean).join(', ')

async function refresh() {
  adding.value = false
  clearCache(s.value.slug)
  await reloadSubject()
}
async function created(id) {
  await refresh()
  router.push({ name: 'quizzes-edit', params: { subject: s.value.slug, quiz: id } })
}
async function remove(z) {
  if (!confirm(`Delete "${z.title}" and its ${z.questions.length} questions?`)) return
  try {
    await deleteQuiz(z.id)
    await refresh()
  } catch (e) {
    alert(e.message)
  }
}
const to = (name, z) => ({ name, params: { subject: s.value.slug, quiz: z.id } })
</script>

<template>
  <p v-if="s.needsQuizzes && canEdit" class="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
    Quizzes need <code>supabase/005_quizzes.sql</code> to be run in Supabase.
  </p>
  <div class="flex flex-wrap items-start gap-3">
    <TermPicker :subject="s" count="quizzes" />
    <button
      v-if="canEdit"
      class="ml-auto rounded-lg border-2 border-dashed border-accent/60 px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent/10"
      @click="adding = true"
    >+ Add quiz</button>
  </div>

  <div v-if="!quizzes.length" class="rounded-xl border border-dashed border-line p-10 text-center">
    <p class="font-display text-lg font-bold">No {{ termLabel }} quizzes yet</p>
    <p class="mt-2 text-sm text-muted">Quizzes from class will show up here to retake and review.</p>
  </div>

  <div class="space-y-3">
    <div v-for="z in quizzes" :key="z.id" class="rounded-xl border border-line bg-panel p-5 sm:flex sm:items-center sm:gap-5">
      <div class="min-w-0 flex-1">
        <p class="font-mono text-xs text-muted">
          <template v-if="z.quiz_date">{{ fmtDate(z.quiz_date) }} · </template>{{ z.questions.length }} item{{ z.questions.length === 1 ? '' : 's' }}
          <template v-if="z.time_limit_min"> · {{ z.time_limit_min }} min</template>
        </p>
        <p class="mt-0.5 font-display text-lg font-bold">{{ z.title }}</p>
        <p v-if="z.note" class="text-sm text-muted">{{ z.note }}</p>
        <p v-if="lessonNames(z)" class="mt-1 font-mono text-xs text-muted">Covers: {{ lessonNames(z) }}</p>
        <p v-if="quizScores(z.id)" class="mt-2 text-sm">
          Best <span class="font-semibold" :style="{ color: s.color }">{{ quizScores(z.id).best }}%</span>
          <span class="text-muted"> · last {{ quizScores(z.id).last }}% · {{ quizScores(z.id).tries }} {{ quizScores(z.id).tries === 1 ? 'try' : 'tries' }}</span>
        </p>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 sm:mt-0">
        <RouterLink :to="to('quizzes-take', z)" class="rounded-lg px-4 py-2 text-sm font-semibold text-ink" :style="{ background: s.color }">Retake</RouterLink>
        <RouterLink :to="to('quizzes-review', z)" class="rounded-lg border border-line px-4 py-2 text-sm hover:border-white/40">Review answers</RouterLink>
        <template v-if="canEdit">
          <RouterLink :to="to('quizzes-edit', z)" class="rounded-lg border border-dashed border-accent/60 px-3 py-2 text-sm text-accent hover:bg-accent/10">✏️ Edit</RouterLink>
          <button class="rounded-lg border border-dashed border-red-400/50 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10" title="Delete quiz" @click="remove(z)">🗑</button>
        </template>
      </div>
    </div>
  </div>

  <AddQuizModal v-if="adding" :subject="s" :term="term" @close="adding = false" @done="refresh" @created="created" />
</template>
