<script setup>
import { inject, computed, ref } from 'vue'
import { shuffle } from '@/lib/grade'
import QuizRunner from '@/components/QuizRunner.vue'
import EmptyContent from '@/components/EmptyContent.vue'

const subject = inject('subject')
const s = computed(() => subject.value)

const withQs = computed(() => s.value.modules.filter((m) => m.questions.length))
const picked = ref(withQs.value.map((m) => m.id))
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
  <EmptyContent v-if="!s.questions.length" what="questions" />

  <div v-else-if="running" class="max-w-3xl mx-auto">
    <QuizRunner
      :key="running.key"
      :subject="s"
      :questions="running.questions"
      mode="deferred"
      kind="exam"
      :time-limit="minutes * 60"
      @restart="running = null"
      @exit="running = null"
    />
  </div>

  <div v-else class="max-w-xl mx-auto rounded-2xl border border-line bg-panel p-6 sm:p-8 space-y-6">
    <div>
      <h2 class="font-display text-2xl font-bold">Mock Exam</h2>
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
