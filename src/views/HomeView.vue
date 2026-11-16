<script setup>
import { listSubjects } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { progress } from '@/lib/progress'
import LoadState from '@/components/LoadState.vue'

const { data: subjects, loading, error } = useAsync(() => listSubjects())
const mistakes = (slug) => progress.mistakes[slug]?.length || 0
</script>

<template>
  <section class="mb-10">
    <p class="font-mono text-xs text-accent mb-2">DASHBOARD</p>
    <h1 class="font-display text-4xl font-bold tracking-tight">What are we reviewing today?</h1>
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
