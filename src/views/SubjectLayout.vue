<script setup>
import { provide, computed } from 'vue'
import { useRoute } from 'vue-router'
import { getSubjectFull } from '@/lib/api'
import { useAsync } from '@/lib/useAsync'
import { ui } from '@/lib/ui'
import { user } from '@/lib/auth'
import LoadState from '@/components/LoadState.vue'

const route = useRoute()
const { data: subject, loading, error } = useAsync(() => getSubjectFull(route.params.subject))
provide('subject', subject)
// Re-fetch after edits without showing the loading screen.
provide('reloadSubject', async () => {
  subject.value = await getSubjectFull(route.params.subject, { fresh: true })
})

const tabs = [
  { name: 'hallway', label: 'Hallway', icon: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z' },
  { name: 'study', label: 'Study', icon: 'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-5a3 3 0 0 0-1 .2' },
  { name: 'materials', label: 'Materials', icon: 'M21.4 11.1 12.2 20.3a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5' },
  { name: 'flashcards', label: 'Flashcards', icon: 'M7 3h10a2 2 0 0 1 2 2v12M5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z' },
  { name: 'practice', label: 'Practice', icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { name: 'quizzes', label: 'Quizzes', icon: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9' },
  { name: 'exam', label: 'Mock Exam', icon: 'M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z' },
  { name: 'review', label: 'Review', icon: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5' },
  { name: 'progress', label: 'Progress', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
]
const current = computed(() => String(route.name).split('-')[0])
</script>

<template>
  <LoadState :loading="loading" :error="error">
    <div v-if="!subject" class="text-muted">
      Subject not found. <RouterLink to="/" class="text-accent">Back home</RouterLink>
    </div>
    <template v-else>
      <div v-if="!ui.focus" class="mb-6">
        <RouterLink to="/" class="font-mono text-xs text-muted hover:text-white">← All subjects</RouterLink>
        <p class="font-mono text-xs mt-3" :style="{ color: subject.color }">{{ subject.code }}</p>
        <h1 class="font-display text-3xl sm:text-4xl font-bold tracking-tight">{{ subject.name }}</h1>
      </div>

      <nav
        v-if="!ui.focus"
        class="sticky z-20 -mx-5 px-5 py-3 mb-8 bg-ink/90 backdrop-blur border-b border-line overflow-x-auto"
        :class="user ? 'top-10' : 'top-0'"
      >
        <div class="flex gap-2 min-w-max">
          <RouterLink
            v-for="t in tabs"
            :key="t.name"
            :to="{ name: t.name, params: { subject: subject.slug } }"
            class="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
            :class="
              current === t.name
                ? 'border-transparent text-ink'
                : 'border-line text-white/80 hover:border-white/30 hover:text-white'
            "
            :style="current === t.name ? { background: subject.color } : {}"
          >
            <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="t.icon" />
            </svg>
            {{ t.label }}
          </RouterLink>
        </div>
      </nav>

      <RouterView :key="route.name" />
    </template>
  </LoadState>
</template>
