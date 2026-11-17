<script setup>
import { inject, computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { shuffle } from '@/lib/grade'
import ModulePicker from '@/components/ModulePicker.vue'
import QuizRunner from '@/components/QuizRunner.vue'
import EmptyContent from '@/components/EmptyContent.vue'
import TermPicker from '@/components/TermPicker.vue'
import QuizList from '@/components/QuizList.vue'
import { canEdit } from '@/lib/editMode'
import { quizzesInTerm } from '@/lib/api'
import { modulesInTerm } from '@/lib/api'
import { currentTerm } from '@/lib/term'

const subject = inject('subject')
const route = useRoute()
const s = computed(() => subject.value)
const mods = computed(() => modulesInTerm(s.value, currentTerm(s.value)))
const prepared = computed(() => quizzesInTerm(s.value, currentTerm(s.value), 'mock_quiz'))

const moduleSlug = ref(route.query.m || '')
watch(mods, () => { if (!mods.value.some((m) => m.slug === moduleSlug.value)) moduleSlug.value = '' })
const mode = ref('practice') // practice | quiz
const quizSize = ref(15)
const practiceSize = ref(null) // empty = all
const running = ref(null) // { questions, key }

const pool = computed(() => {
  const mod = mods.value.find((m) => m.slug === moduleSlug.value)
  return mod ? mod.questions : mods.value.flatMap((m) => m.questions)
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
  <TermPicker v-if="!running" :subject="s" />

  <section v-if="!running && (prepared.length || canEdit)" class="mb-10">
    <h2 class="mb-1 font-display text-xl font-bold">Prepared mock quizzes</h2>
    <p class="mb-4 text-sm text-muted">Made for this term. Take one, then review the answers.</p>
    <QuizList kind="mock_quiz" />
  </section>

  <h2 v-if="!running && (prepared.length || canEdit)" class="mb-4 font-display text-xl font-bold">Practice from lesson questions</h2>
  <EmptyContent v-if="!mods.some((m) => m.questions.length)" what="questions in this term" />

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
      <ModulePicker v-model="moduleSlug" all-label="All lessons in this term" :modules="mods.filter((m) => m.questions.length)" class="w-full" />
      <p class="font-mono text-xs text-muted mt-2">{{ pool.length }} questions available</p>
    </div>

    <div>
      <p class="font-mono text-xs text-muted mb-2">MODE</p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="opt in [
            { k: 'practice', t: 'Practice', d: 'Untimed · feedback after every question' },
            { k: 'quiz', t: 'Random mock quiz', d: 'Random set from the lessons · scored at the end' },
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
