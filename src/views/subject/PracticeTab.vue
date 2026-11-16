<script setup>
import { inject, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { shuffle } from '@/lib/grade'
import ModulePicker from '@/components/ModulePicker.vue'
import QuizRunner from '@/components/QuizRunner.vue'
import EmptyContent from '@/components/EmptyContent.vue'

const subject = inject('subject')
const route = useRoute()
const s = computed(() => subject.value)

const moduleSlug = ref(route.query.m || '')
const mode = ref('practice') // practice | quiz
const quizSize = ref(15)
const practiceSize = ref(null) // empty = all
const running = ref(null) // { questions, key }

const pool = computed(() => {
  const mod = s.value.modules.find((m) => m.slug === moduleSlug.value)
  return mod ? mod.questions : s.value.questions
})

function start() {
  const qs = shuffle(pool.value)
  running.value = {
    questions: qs.slice(0, mode.value === 'quiz' ? quizSize.value : practiceSize.value || qs.length),
    key: Date.now(),
  }
}
</script>

<template>
  <EmptyContent v-if="!s.questions.length" what="questions" />

  <div v-else-if="running" class="max-w-3xl mx-auto">
    <QuizRunner
      :key="running.key"
      :subject="s"
      :questions="running.questions"
      :mode="mode === 'quiz' ? 'deferred' : 'instant'"
      :kind="mode"
      @restart="start"
      @exit="running = null"
    />
  </div>

  <div v-else class="max-w-xl mx-auto rounded-2xl border border-line bg-panel p-6 sm:p-8 space-y-6">
    <div>
      <p class="font-mono text-xs text-muted mb-2">MODULE</p>
      <ModulePicker v-model="moduleSlug" :modules="s.modules.filter((m) => m.questions.length)" class="w-full" />
      <p class="font-mono text-xs text-muted mt-2">{{ pool.length }} questions available</p>
    </div>

    <div>
      <p class="font-mono text-xs text-muted mb-2">MODE</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="opt in [
            { k: 'practice', t: 'Practice', d: 'Untimed · feedback after every question' },
            { k: 'quiz', t: 'Mock Quiz', d: 'Random set · scored at the end' },
          ]"
          :key="opt.k"
          class="rounded-xl border p-4 text-left transition"
          :class="mode === opt.k ? 'border-white bg-white/5' : 'border-line hover:border-white/30'"
          @click="mode = opt.k"
        >
          <p class="font-semibold">{{ opt.t }}</p>
          <p class="text-xs text-muted mt-1">{{ opt.d }}</p>
        </button>
      </div>
    </div>

    <div>
      <p class="font-mono text-xs text-muted mb-2">HOW MANY QUESTIONS</p>
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="mode === 'practice'">
          <button
            v-for="n in [null, 10, 20, 30]"
            :key="n"
            class="rounded-lg border px-3 py-2 text-sm transition"
            :class="(n === null ? !practiceSize : practiceSize === n) ? 'border-white bg-white/5' : 'border-line hover:border-white/30 disabled:opacity-30 disabled:hover:border-line'"
            :disabled="n > pool.length"
            @click="practiceSize = n"
          >{{ n === null ? `All (${pool.length})` : n }}</button>
          <input
            v-model.number="practiceSize"
            type="number"
            min="1"
            :max="pool.length"
            placeholder="Custom"
            class="w-24 rounded-lg border border-line bg-ink px-3 py-2 text-sm"
          />
        </template>
        <input v-else v-model.number="quizSize" type="number" min="1" :max="pool.length" class="w-24 rounded-lg border border-line bg-ink px-3 py-2 text-sm" />
        <span class="font-mono text-xs text-muted">of {{ pool.length }}</span>
      </div>
    </div>

    <button
      class="w-full rounded-lg py-3 font-semibold text-ink disabled:opacity-40"
      :style="{ background: s.color }"
      :disabled="!pool.length"
      @click="start"
    >Start</button>
  </div>
</template>
