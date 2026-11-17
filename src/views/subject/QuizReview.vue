<script setup>
import { inject, computed } from 'vue'
import { useRoute } from 'vue-router'
import { formatAnswer } from '@/lib/grade'
import { fmtDate, kindInfo } from '@/lib/quizzes'

const subject = inject('subject')
const route = useRoute()
const s = computed(() => subject.value)
const quiz = computed(() => s.value.quizzes.find((z) => z.id === route.params.quiz))
const k = computed(() => kindInfo(quiz.value?.kind))
const typeLabel = { mcq: 'Multiple choice', true_false: 'True or false', identification: 'Identification', enumeration: 'Enumeration' }
const alts = (x) => (Array.isArray(x) ? x : [x])
</script>

<template>
  <div v-if="!quiz" class="text-muted">Quiz not found.</div>
  <div v-else class="mx-auto max-w-3xl">
    <RouterLink :to="{ name: k.tab, params: { subject: s.slug } }" class="font-mono text-xs text-muted hover:text-white">← All {{ k.many }}</RouterLink>
    <div class="mb-6 mt-2 flex flex-wrap items-end gap-3">
      <div class="flex-1">
        <p class="font-mono text-xs text-muted">ANSWER KEY<template v-if="quiz.quiz_date"> · {{ fmtDate(quiz.quiz_date) }}</template></p>
        <h2 class="font-display text-2xl font-bold">{{ quiz.title }}</h2>
      </div>
      <RouterLink :to="{ name: 'quizzes-take', params: { subject: s.slug, quiz: quiz.id } }" class="rounded-lg px-4 py-2 text-sm font-semibold text-ink" :style="{ background: s.color }">{{ k.start }}</RouterLink>
    </div>

    <ol class="space-y-3">
      <li v-for="(q, i) in quiz.questions" :key="q.id" class="rounded-xl border border-line bg-panel p-5">
        <p class="font-mono text-xs text-muted">{{ i + 1 }} · {{ typeLabel[q.type] }}</p>
        <p class="mt-1 whitespace-pre-line">{{ q.prompt }}</p>

        <ul v-if="q.type === 'mcq'" class="mt-3 space-y-1.5">
          <li
            v-for="(c, k) in q.choices"
            :key="c"
            class="flex gap-3 rounded-lg border px-3 py-2 text-sm"
            :class="c === q.answer ? 'border-green-500 bg-green-500/15' : 'border-line opacity-70'"
          >
            <span class="font-mono text-xs text-muted">{{ String.fromCharCode(65 + k) }}</span>{{ c }}
            <span v-if="c === q.answer" class="ml-auto text-green-300">✓</span>
          </li>
        </ul>
        <p v-else class="mt-3 rounded-lg border border-green-500/50 bg-green-500/10 px-3 py-2 text-sm">
          <span class="text-green-300">Answer:</span> <span class="font-semibold">{{ formatAnswer(q) }}</span>
          <span v-if="q.type === 'identification' && alts(q.answer).length > 1" class="block text-xs text-muted">Also accepted: {{ alts(q.answer).slice(1).join(', ') }}</span>
        </p>
        <p v-if="q.explanation" class="mt-2 text-sm text-white/70">{{ q.explanation }}</p>
      </li>
    </ol>
  </div>
</template>
