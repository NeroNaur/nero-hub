<script setup>
import { listSubjects, listRecentQuizzes } from '@/lib/api'
import { quizScores, fmtDate } from '@/lib/quizzes'
import { useAsync } from '@/lib/useAsync'
import { progress } from '@/lib/progress'
import LoadState from '@/components/LoadState.vue'

const { data: subjects, loading, error } = useAsync(() => listSubjects())
const { data: recent } = useAsync(() => listRecentQuizzes(6))
const mistakes = (slug) => progress.mistakes[slug]?.length || 0
</script>

<template>
  <section class="mb-10">
    <p class="font-mono text-xs text-accent mb-2">DASHBOARD</p>
    <h1 class="font-display text-4xl font-bold tracking-tight">What are we reviewing today?</h1>
  </section>

  <section v-if="recent?.length" class="mb-10">
    <div class="mb-3 flex items-baseline gap-3">
      <h2 class="font-display text-xl font-bold">Recent quizzes</h2>
      <span class="font-mono text-xs text-muted">retake or review answers</span>
    </div>
    <div class="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2">
      <div
        v-for="z in recent"
        :key="z.id"
        class="relative w-64 shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-panel p-4"
      >
        <span class="absolute inset-y-0 left-0 w-1" :style="{ background: z.subject?.color }" />
        <p class="font-mono text-xs" :style="{ color: z.subject?.color }">{{ z.subject?.code || z.subject?.name }}</p>
        <p class="mt-0.5 line-clamp-2 font-semibold leading-snug">{{ z.title }}</p>
        <p class="mt-1 font-mono text-xs text-muted">
          <template v-if="z.quiz_date">{{ fmtDate(z.quiz_date) }} · </template>{{ z.quiz_questions?.[0]?.count ?? 0 }} items
          <template v-if="quizScores(z.id)"> · best {{ quizScores(z.id).best }}%</template>
        </p>
        <div class="mt-3 flex gap-2">
          <RouterLink :to="{ name: 'quizzes-take', params: { subject: z.subject.slug, quiz: z.id } }" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink" :style="{ background: z.subject?.color }">Retake</RouterLink>
          <RouterLink :to="{ name: 'quizzes-review', params: { subject: z.subject.slug, quiz: z.id } }" class="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-white/40">Answers</RouterLink>
        </div>
      </div>
    </div>
  </section>

  <LoadState :loading="loading" :error="error">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="s in subjects"
        :key="s.id"
        :to="{ name: 'hallway', params: { subject: s.slug } }"
        class="group relative overflow-hidden rounded-xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-white/20"
      >
        <span class="absolute inset-x-0 top-0 h-1" :style="{ background: s.color }" />
        <p class="font-mono text-xs text-muted">{{ s.code }}</p>
        <h2 class="font-display text-xl font-bold mt-1 leading-snug">{{ s.name }}</h2>
        <div class="mt-6 flex items-center gap-3 text-sm text-muted">
          <span>{{ s.modules[0]?.count ?? 0 }} module{{ (s.modules[0]?.count ?? 0) === 1 ? '' : 's' }}</span>
          <span v-if="mistakes(s.slug)" class="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-xs text-red-300">
            {{ mistakes(s.slug) }} to review
          </span>
          <span class="ml-auto text-accent opacity-0 transition group-hover:opacity-100">Open →</span>
        </div>
      </RouterLink>
    </div>
  </LoadState>
</template>
