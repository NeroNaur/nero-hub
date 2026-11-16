<script setup>
import { listSubjects } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import LoadState from '@/components/LoadState.vue'

const { data: subjects, loading, error } = useAsync(() => listSubjects())
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
        :to="{ name: 'subject', params: { subject: s.slug } }"
        class="group relative overflow-hidden rounded-xl border border-line bg-panel p-5 transition hover:-translate-y-0.5 hover:border-white/20"
      >
        <span class="absolute inset-x-0 top-0 h-1" :style="{ background: s.color }" />
        <p class="font-mono text-xs text-muted">{{ s.code }}</p>
        <h2 class="font-display text-xl font-bold mt-1 leading-snug">{{ s.name }}</h2>
        <p class="mt-6 text-sm text-muted">
          {{ s.modules[0]?.count ?? 0 }} module{{ (s.modules[0]?.count ?? 0) === 1 ? '' : 's' }}
          <span class="float-right text-accent opacity-0 transition group-hover:opacity-100">Open →</span>
        </p>
      </RouterLink>
    </div>
  </LoadState>
</template>
