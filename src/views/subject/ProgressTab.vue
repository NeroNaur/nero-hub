<script setup>
import { inject, computed } from 'vue'
import { progress, moduleAccuracy, resetSubject } from '@/lib/progress'
import { formatAnswer } from '@/lib/grade'

const subject = inject('subject')
const s = computed(() => subject.value)
const attempts = computed(() => progress.attempts.filter((a) => a.subject === s.value.slug))
const answered = computed(() =>
  s.value.questions.reduce((n, q) => n + (progress.stats[q.id] ? progress.stats[q.id].r + progress.stats[q.id].w : 0), 0),
)
const overall = computed(() => {
  let r = 0, t = 0
  for (const q of s.value.questions) {
    const st = progress.stats[q.id]
    if (st) { r += st.r; t += st.r + st.w }
  }
  return t ? Math.round((r / t) * 100) : null
})
const weakest = computed(() =>
  s.value.questions
    .map((q) => ({ q, st: progress.stats[q.id] }))
    .filter((x) => x.st && x.st.w > 0)
    .sort((a, b) => b.st.w / (b.st.r + b.st.w) - a.st.w / (a.st.r + a.st.w) || b.st.w - a.st.w)
    .slice(0, 5),
)
const kindLabel = { practice: 'Practice', quiz: 'Mock Quiz', exam: 'Mock Exam', review: 'Review', 'class-quiz': 'Quiz' }
const quizTitle = (a) => s.value.quizzes.find((z) => z.id === a.quiz_id)?.title
const fmtDate = (t) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const fmtDur = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`)
const pct = (a) => Math.round((a.score / a.total) * 100)
const examTrend = computed(() => attempts.value.filter((a) => a.kind === 'exam').slice(0, 10).reverse())

function reset() {
  if (confirm(`Reset all progress for ${s.value.name} in this browser?`)) resetSubject(s.value)
}
</script>

<template>
  <div class="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-8">
    <div class="rounded-xl border border-line bg-panel p-4">
      <p class="font-mono text-xs text-muted">Accuracy</p>
      <p class="font-display text-3xl font-bold mt-1" :style="{ color: s.color }">{{ overall ?? '—' }}<span v-if="overall !== null" class="text-lg">%</span></p>
    </div>
    <div class="rounded-xl border border-line bg-panel p-4">
      <p class="font-mono text-xs text-muted">Answers given</p>
      <p class="font-display text-3xl font-bold mt-1">{{ answered }}</p>
    </div>
    <div class="rounded-xl border border-line bg-panel p-4">
      <p class="font-mono text-xs text-muted">Sessions</p>
      <p class="font-display text-3xl font-bold mt-1">{{ attempts.length }}</p>
    </div>
    <div class="rounded-xl border border-line bg-panel p-4">
      <p class="font-mono text-xs text-muted">To review</p>
      <p class="font-display text-3xl font-bold mt-1">{{ progress.mistakes[s.slug]?.length || 0 }}</p>
    </div>
  </div>

  <div class="grid gap-6 lg:grid-cols-2 mb-8">
    <section class="rounded-xl border border-line bg-panel p-5">
      <h3 class="font-mono text-xs text-muted mb-4">ACCURACY BY MODULE</h3>
      <p v-if="!s.modules.length" class="text-sm text-muted">No modules yet.</p>
      <div v-for="m in s.modules" :key="m.id" class="mb-3">
        <div class="flex justify-between text-sm">
          <span class="truncate pr-3">{{ m.title }}</span>
          <span class="font-mono text-muted">{{ moduleAccuracy(m) ? moduleAccuracy(m).pct + '%' : 'not tried' }}</span>
        </div>
        <div class="h-1.5 rounded bg-line mt-1 overflow-hidden">
          <div class="h-full rounded" :style="{ width: (moduleAccuracy(m)?.pct || 0) + '%', background: s.color }" />
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-line bg-panel p-5">
      <h3 class="font-mono text-xs text-muted mb-4">MOCK EXAM TREND</h3>
      <p v-if="!examTrend.length" class="text-sm text-muted">Take a mock exam to see your trend.</p>
      <div v-else class="flex items-end gap-2 h-32">
        <div v-for="a in examTrend" :key="a.at" class="flex-1 flex flex-col items-center gap-1">
          <span class="font-mono text-[10px] text-muted">{{ pct(a) }}</span>
          <div class="w-full rounded-t" :style="{ height: Math.max(4, pct(a)) + '%', background: s.color }" :title="fmtDate(a.at)" />
        </div>
      </div>
    </section>
  </div>

  <section v-if="weakest.length" class="rounded-xl border border-line bg-panel p-5 mb-8">
    <h3 class="font-mono text-xs text-muted mb-4">WEAKEST QUESTIONS</h3>
    <ul class="space-y-3">
      <li v-for="w in weakest" :key="w.q.id" class="text-sm">
        <p>{{ w.q.prompt }}</p>
        <p class="font-mono text-xs text-muted mt-0.5">
          {{ w.st.r }}✓ {{ w.st.w }}✗ · answer: <span class="text-white">{{ formatAnswer(w.q) }}</span>
        </p>
      </li>
    </ul>
  </section>

  <section class="rounded-xl border border-line bg-panel p-5">
    <div class="flex items-center mb-4">
      <h3 class="font-mono text-xs text-muted">HISTORY</h3>
      <button class="ml-auto font-mono text-xs text-muted underline hover:text-red-300" @click="reset">Reset progress</button>
    </div>
    <p v-if="!attempts.length" class="text-sm text-muted">No sessions yet.</p>
    <table v-else class="w-full text-sm">
      <tbody>
        <tr v-for="a in attempts.slice(0, 30)" :key="a.at" class="border-t border-line">
          <td class="py-2">{{ kindLabel[a.kind] }}<span v-if="a.kind === 'class-quiz' && quizTitle(a)" class="text-muted">: {{ quizTitle(a) }}</span></td>
          <td class="py-2 font-mono">{{ a.score }}/{{ a.total }} <span class="text-muted">({{ pct(a) }}%)</span></td>
          <td class="py-2 font-mono text-muted hidden sm:table-cell">{{ fmtDur(a.duration) }}</td>
          <td class="py-2 text-right text-muted">{{ fmtDate(a.at) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
