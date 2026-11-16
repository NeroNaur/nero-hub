<script setup>
import { inject, computed, ref } from 'vue'
import { progress } from '@/lib/progress'
import { shuffle, formatAnswer } from '@/lib/grade'
import QuizRunner from '@/components/QuizRunner.vue'

const subject = inject('subject')
const s = computed(() => subject.value)
const ids = computed(() => progress.mistakes[s.value.slug] || [])
const items = computed(() => s.value.questions.filter((q) => ids.value.includes(q.id)))
const running = ref(null)

function start() {
  running.value = { questions: shuffle(items.value), key: Date.now() }
}
function clearAll() {
  if (confirm('Clear your whole mistake bank for this subject?')) progress.mistakes[s.value.slug] = []
}
</script>

<template>
  <div v-if="running" class="max-w-3xl mx-auto">
    <QuizRunner
      :key="running.key"
      :subject="s"
      :questions="running.questions"
      mode="instant"
      kind="review"
      @restart="items.length ? start() : (running = null)"
      @exit="running = null"
    />
  </div>

  <div v-else-if="!items.length" class="rounded-xl border border-dashed border-line p-10 text-center">
    <p class="font-display text-lg font-bold">Mistake bank is empty</p>
    <p class="text-muted text-sm mt-2">Questions you miss in Practice, Mock Quiz or Mock Exam land here. Answer them right here to clear them.</p>
  </div>

  <div v-else>
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <div>
        <h2 class="font-display text-2xl font-bold">{{ items.length }} to review</h2>
        <p class="text-sm text-muted">Get one right here and it leaves the bank.</p>
      </div>
      <div class="ml-auto flex gap-2">
        <button class="rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-white" @click="clearAll">Clear</button>
        <button class="rounded-lg px-5 py-2 text-sm font-semibold text-ink" :style="{ background: s.color }" @click="start">Retry all</button>
      </div>
    </div>
    <ul class="space-y-2">
      <li v-for="q in items" :key="q.id" class="rounded-xl border border-line bg-panel p-4">
        <p class="font-mono text-xs text-muted">{{ s.moduleById[q.module_id]?.title }} · missed {{ progress.stats[q.id]?.w || 1 }}×</p>
        <p class="mt-1">{{ q.prompt }}</p>
        <details class="mt-2 text-sm">
          <summary class="cursor-pointer text-muted hover:text-white">Show answer</summary>
          <p class="mt-1 font-semibold">{{ formatAnswer(q) }}</p>
          <p v-if="q.explanation" class="text-white/70 mt-1">{{ q.explanation }}</p>
        </details>
      </li>
    </ul>
  </div>
</template>
