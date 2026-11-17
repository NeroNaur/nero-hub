<script setup>
import { inject, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { fmtDate, quizScores } from '@/lib/quizzes'
import QuizRunner from '@/components/QuizRunner.vue'

const subject = inject('subject')
const route = useRoute()
const s = computed(() => subject.value)
const quiz = computed(() => s.value.quizzes.find((z) => z.id === route.params.quiz))
const running = ref(null)
const timed = ref(true)
const start = () => (running.value = { key: Date.now() })
const back = { name: 'quizzes' }
</script>

<template>
  <div v-if="!quiz" class="text-muted">Quiz not found. <RouterLink :to="{ ...back, params: { subject: s.slug } }" class="text-accent">Back</RouterLink></div>

  <div v-else-if="running" class="mx-auto max-w-3xl">
    <p class="mb-3 font-display text-xl font-bold">{{ quiz.title }}</p>
    <QuizRunner
      :key="running.key"
      :subject="s"
      :questions="quiz.questions"
      mode="deferred"
      kind="class-quiz"
      :quiz-id="quiz.id"
      :term="quiz.term"
      :time-limit="timed && quiz.time_limit_min ? quiz.time_limit_min * 60 : 0"
      @restart="start"
      @exit="running = null"
    />
  </div>

  <div v-else class="mx-auto max-w-xl space-y-5 rounded-2xl border border-line bg-panel p-6 sm:p-8">
    <RouterLink :to="{ ...back, params: { subject: s.slug } }" class="font-mono text-xs text-muted hover:text-white">← All quizzes</RouterLink>
    <div>
      <p class="font-mono text-xs text-muted"><template v-if="quiz.quiz_date">Given {{ fmtDate(quiz.quiz_date) }}</template></p>
      <h2 class="font-display text-2xl font-bold">{{ quiz.title }}</h2>
      <p v-if="quiz.note" class="mt-1 text-sm text-muted">{{ quiz.note }}</p>
    </div>
    <div class="flex flex-wrap gap-6 text-sm">
      <div><p class="font-display text-3xl font-bold">{{ quiz.questions.length }}</p><p class="text-muted">items</p></div>
      <div v-if="quiz.time_limit_min"><p class="font-display text-3xl font-bold">{{ quiz.time_limit_min }}</p><p class="text-muted">minutes</p></div>
      <div v-if="quizScores(quiz.id)"><p class="font-display text-3xl font-bold" :style="{ color: s.color }">{{ quizScores(quiz.id).best }}%</p><p class="text-muted">your best</p></div>
    </div>
    <label v-if="quiz.time_limit_min" class="flex items-center gap-2 text-sm">
      <input v-model="timed" type="checkbox" class="toggle" /> Use the {{ quiz.time_limit_min }}-minute timer
    </label>
    <p class="text-sm text-muted">Answer everything, then submit to see your score and which ones you missed.</p>
    <div class="flex flex-wrap gap-2">
      <button class="flex-1 rounded-lg py-3 font-semibold text-ink disabled:opacity-40" :style="{ background: s.color }" :disabled="!quiz.questions.length" @click="start">Start retake</button>
      <RouterLink :to="{ name: 'quizzes-review', params: { subject: s.slug, quiz: quiz.id } }" class="rounded-lg border border-line px-5 py-3 text-sm hover:border-white/40">Review answers</RouterLink>
    </div>
  </div>
</template>
