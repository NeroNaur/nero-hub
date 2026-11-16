<script setup>
import { inject, computed } from 'vue'
import { progress, moduleAccuracy } from '@/lib/progress'
import EmptyContent from '@/components/EmptyContent.vue'

const subject = inject('subject')
const s = computed(() => subject.value)
const mistakes = computed(() => progress.mistakes[s.value.slug]?.length || 0)
const lastExam = computed(() => progress.attempts.find((a) => a.subject === s.value.slug && a.kind === 'exam'))
const lastModule = computed(() => s.value.modules.find((m) => m.slug === progress.last[s.value.slug]?.module))
const stats = computed(() => [
  { label: 'Modules', value: s.value.modules.length },
  { label: 'Questions', value: s.value.questions.length },
  { label: 'Flashcards', value: s.value.flashcards.length },
  { label: 'To review', value: mistakes.value },
])
</script>

<template>
  <div class="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-6">
    <div v-for="st in stats" :key="st.label" class="rounded-xl border border-line bg-panel p-4">
      <p class="font-mono text-xs text-muted">{{ st.label }}</p>
      <p class="font-display text-3xl font-bold mt-1">{{ st.value }}</p>
    </div>
  </div>

  <div class="grid gap-3 sm:grid-cols-2 mb-10">
    <RouterLink
      v-if="lastModule"
      :to="{ name: 'study', params: { subject: s.slug, module: lastModule.slug } }"
      class="rounded-xl border border-line bg-panel p-4 hover:border-white/30 transition"
    >
      <p class="font-mono text-xs text-muted">CONTINUE STUDYING</p>
      <p class="font-semibold mt-1">{{ lastModule.title }} →</p>
    </RouterLink>
    <RouterLink
      :to="{ name: 'exam', params: { subject: s.slug } }"
      class="rounded-xl border border-line bg-panel p-4 hover:border-white/30 transition"
    >
      <p class="font-mono text-xs text-muted">MOCK EXAM</p>
      <p class="font-semibold mt-1">
        <template v-if="lastExam">Last: {{ Math.round((lastExam.score / lastExam.total) * 100) }}% · try again →</template>
        <template v-else>Take your first mock exam →</template>
      </p>
    </RouterLink>
  </div>

  <h2 class="font-display text-xl font-bold mb-4">Modules</h2>
  <EmptyContent v-if="!s.modules.length" what="modules" />
  <ol v-else class="space-y-3">
    <li v-for="(m, i) in s.modules" :key="m.id" class="rounded-xl border border-line bg-panel p-4 sm:flex items-center gap-4">
      <span class="font-mono text-sm text-muted w-8 hidden sm:block">{{ String(i + 1).padStart(2, '0') }}</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold">{{ m.title }}</p>
        <p v-if="m.summary" class="text-sm text-muted">{{ m.summary }}</p>
        <p class="font-mono text-xs text-muted mt-1">
          {{ m.questions.length }} Q · {{ m.flashcards.length }} cards
          <template v-if="moduleAccuracy(m)"> · <span :style="{ color: s.color }">{{ moduleAccuracy(m).pct }}% accuracy</span></template>
        </p>
      </div>
      <div class="flex gap-2 mt-3 sm:mt-0">
        <RouterLink :to="{ name: 'study', params: { subject: s.slug, module: m.slug } }" class="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/40">Study</RouterLink>
        <RouterLink
          v-if="m.questions.length"
          :to="{ name: 'practice', params: { subject: s.slug }, query: { m: m.slug } }"
          class="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/40"
        >Practice</RouterLink>
      </div>
    </li>
  </ol>
</template>
