<script setup>
import { inject, computed, ref, watch } from 'vue'
import { shuffle } from '@/lib/grade'
import QuizRunner from '@/components/QuizRunner.vue'
import EmptyContent from '@/components/EmptyContent.vue'
import TermPicker from '@/components/TermPicker.vue'
import { modulesInTerm, TERMS } from '@/lib/api'
import { currentTerm } from '@/lib/term'

const subject = inject('subject')
const s = computed(() => subject.value)

const term = computed(() => currentTerm(s.value))
const termLabel = computed(() => TERMS.find((t) => t.key === term.value).label)
const withQs = computed(() => modulesInTerm(s.value, term.value).filter((m) => m.questions.length))
const picked = ref(withQs.value.map((m) => m.id))
watch(withQs, (v) => {
  picked.value = v.map((m) => m.id)
  count.value = Math.min(50, pool.value.length)
  minutes.value = Math.max(5, count.value)
})
const pool = computed(() => s.value.questions.filter((q) => picked.value.includes(q.module_id)))
const count = ref(Math.min(50, pool.value.length))
const minutes = ref(Math.max(5, Math.round(count.value * 1)))
const running = ref(null)

// Spread questions across picked modules proportionally, then shuffle.
function start() {
  const n = Math.min(count.value, pool.value.length)
  const byMod = withQs.value
    .filter((m) => picked.value.includes(m.id))
    .map((m) => shuffle(m.questions))
  const out = []
  while (out.length < n) {
    for (const qs of byMod) if (qs.length && out.length < n) out.push(qs.shift())
  }
  running.value = { questions: shuffle(out), key: Date.now() }
}
</script>

<template>
  <TermPicker v-if="!running" :subject="s" />
  <EmptyContent v-if="!withQs.length" what="questions in this term" />

  <div v-else-if="running" class="max-w-3xl mx-auto">
    <QuizRunner
      :key="running.key"
      :subject="s"
      :questions="running.questions"
      mode="deferred"
      kind="exam"
      :term="term"
      :time-limit="minutes * 60"
      @restart="running = null"
      @exit="running = null"
    />
  </div>

  <div v-else class="max-w-xl mx-auto rounded-2xl border border-line bg-panel p-6 sm:p-8 space-y-6">
    <div>
      <h2 class="font-display text-2xl font-bold">{{ termLabel }} Mock Exam</h2>
      <p class="text-sm text-muted mt-1">Timed, randomized, graded at the end. Auto-submits when time runs out.</p>
    </div>

    <div>
      <p class="font-mono text-xs text-muted mb-2">COVERAGE</p>
      <label v-for="m in withQs" :key="m.id" class="flex items-center gap-3 py-1.5 text-sm">
        <input v-model="picked" type="checkbox" :value="m.id" />
        <span class="flex-1">{{ m.title }}</span>
        <span class="font-mono text-xs text-muted">{{ m.questions.length }}</span>
      </label>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <label>
        <span class="font-mono text-xs text-muted">QUESTIONS (max {{ pool.length }})</span>
        <input v-model.number="count" type="number" min="1" :max="pool.length" class="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" />
      </label>
      <label>
        <span class="font-mono text-xs text-muted">MINUTES</span>
        <input v-model.number="minutes" type="number" min="1" class="mt-2 w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" />
      </label>
    </div>

    <button
      class="w-full rounded-lg py-3 font-semibold text-ink disabled:opacity-40"
      :style="{ background: s.color }"
      :disabled="!pool.length || count < 1"
      @click="start"
    >Start exam</button>
  </div>
</template>
