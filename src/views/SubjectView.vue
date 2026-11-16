<script setup>
import { useRoute } from 'vue-router'
import { getSubject } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import LoadState from '@/components/LoadState.vue'

const route = useRoute()
const { data: subject, loading, error } = useAsync(() => getSubject(route.params.subject))
</script>

<template>
  <LoadState :loading="loading" :error="error">
    <div v-if="!subject" class="text-muted">Subject not found. <RouterLink to="/" class="text-accent">Back home</RouterLink></div>
    <template v-else>
      <RouterLink to="/" class="font-mono text-xs text-muted hover:text-white">← All subjects</RouterLink>
      <div class="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="font-mono text-xs" :style="{ color: subject.color }">{{ subject.code }} · {{ subject.term }}</p>
          <h1 class="font-display text-4xl font-bold tracking-tight mt-1">{{ subject.name }}</h1>
        </div>
        <RouterLink
          :to="{ name: 'exam', params: { subject: subject.slug } }"
          class="rounded-lg bg-accent px-4 py-2 font-semibold text-ink transition hover:brightness-110"
        >Take mock exam</RouterLink>
      </div>

      <div v-if="!subject.modules.length" class="rounded-xl border border-dashed border-line p-10 text-center text-muted">
        No modules yet. Feed me your notes and they'll show up here.
      </div>

      <ol v-else class="space-y-3">
        <li v-for="(m, i) in subject.modules" :key="m.id">
          <RouterLink
            :to="{ name: 'module', params: { subject: subject.slug, module: m.slug, tab: 'review' } }"
            class="flex items-center gap-4 rounded-xl border border-line bg-panel p-4 transition hover:border-white/20"
          >
            <span class="font-mono text-sm text-muted w-8">{{ String(i + 1).padStart(2, '0') }}</span>
            <div class="flex-1">
              <p class="font-semibold">{{ m.title }}</p>
              <p v-if="m.summary" class="text-sm text-muted">{{ m.summary }}</p>
            </div>
            <span class="font-mono text-xs text-muted">{{ m.questions[0]?.count ?? 0 }} Q</span>
          </RouterLink>
        </li>
      </ol>
    </template>
  </LoadState>
</template>
