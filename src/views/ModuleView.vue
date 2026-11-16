<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getModule } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import LoadState from '@/components/LoadState.vue'
import ComingSoon from '@/components/ComingSoon.vue'

const route = useRoute()
const { data, loading, error } = useAsync(() => getModule(route.params.subject, route.params.module))
const tab = computed(() => route.params.tab || 'review')
const tabs = [
  { key: 'review', label: 'Review' },
  { key: 'practice', label: 'Practice' },
  { key: 'quiz', label: 'Mock Quiz' },
]
</script>

<template>
  <LoadState :loading="loading" :error="error">
    <div v-if="!data" class="text-muted">Module not found. <RouterLink to="/" class="text-accent">Back home</RouterLink></div>
    <template v-else>
      <RouterLink
        :to="{ name: 'subject', params: { subject: data.subject.slug } }"
        class="font-mono text-xs text-muted hover:text-white"
      >← {{ data.subject.name }}</RouterLink>
      <h1 class="font-display text-3xl font-bold tracking-tight mt-4">{{ data.module.title }}</h1>

      <nav class="mt-6 mb-8 flex gap-1 border-b border-line">
        <RouterLink
          v-for="t in tabs"
          :key="t.key"
          :to="{ name: 'module', params: { ...route.params, tab: t.key } }"
          class="px-4 py-2 -mb-px border-b-2 text-sm font-medium transition"
          :class="tab === t.key ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'"
        >{{ t.label }}</RouterLink>
      </nav>

      <ComingSoon v-if="tab === 'review'" title="Review" note="Your notes for this module will render here (Step 2)." />
      <ComingSoon v-else-if="tab === 'practice'" title="Practice" note="Untimed, instant feedback per question (Step 3)." />
      <ComingSoon v-else title="Mock Quiz" note="Randomized, scored quiz from this module (Step 3)." />
    </template>
  </LoadState>
</template>
