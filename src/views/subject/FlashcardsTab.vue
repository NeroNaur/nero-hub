<script setup>
import { inject, computed } from 'vue'
import { useRouter } from 'vue-router'
import { setsInTerm, TERMS } from '@/lib/api'
import { currentTerm } from '@/lib/term'
import { user } from '@/lib/auth'
import { progress } from '@/lib/progress'
import TermPicker from '@/components/TermPicker.vue'

const subject = inject('subject')
const s = computed(() => subject.value)
const term = computed(() => currentTerm(s.value))
const termLabel = computed(() => TERMS.find((t) => t.key === term.value).label)
const sets = computed(() => setsInTerm(s.value, term.value))
const router = useRouter()
const open = (set) => router.push({ name: 'flashcards-set', params: { subject: s.value.slug, set: set.id } })
const known = (set) => set.flashcards.filter((c) => progress.flash[c.id] === 'known').length
</script>

<template>
  <p v-if="s.needsMigration" class="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
    Flashcard sets need <code>supabase/003_terms_flashcard_sets.sql</code> to be run in Supabase.
  </p>
  <TermPicker :subject="s" count="sets" />

  <div class="grid gap-3 sm:grid-cols-2">
    <div
      v-for="set in sets"
      :key="set.id"
      role="link"
      tabindex="0"
      class="group relative cursor-pointer rounded-xl border border-line bg-panel p-5 transition hover:border-white/30"
      @click="open(set)"
      @keydown.enter="open(set)"
    >
      <p class="font-mono text-xs text-muted">
        {{ set.flashcards.length }} cards
        <template v-if="s.moduleById[set.module_id]"> · {{ s.moduleById[set.module_id].title }}</template>
      </p>
      <p class="font-display text-lg font-bold mt-1">{{ set.title }}</p>
      <p v-if="set.description" class="text-sm text-muted mt-1 line-clamp-2">{{ set.description }}</p>
      <div v-if="set.flashcards.length" class="mt-4 h-1 rounded bg-line overflow-hidden">
        <div class="h-full rounded" :style="{ width: (known(set) / set.flashcards.length) * 100 + '%', background: s.color }" />
      </div>
      <RouterLink
        v-if="user"
        :to="{ name: 'flashcards-edit', params: { subject: s.slug, set: set.id } }"
        class="absolute top-4 right-4 rounded-md border border-dashed border-accent/60 px-2 py-0.5 font-mono text-xs text-accent hover:bg-accent/10"
        @click.stop
      >✏️ Edit</RouterLink>
    </div>

    <RouterLink
      v-if="user"
      :to="{ name: 'flashcards-new', params: { subject: s.slug }, query: { term } }"
      class="grid place-items-center rounded-xl border-2 border-dashed border-accent/50 p-5 text-accent hover:bg-accent/5 transition min-h-28"
    >
      <span class="font-semibold">+ Create a {{ termLabel }} flashcard set</span>
    </RouterLink>
  </div>

  <div v-if="!sets.length && !user" class="rounded-xl border border-dashed border-line p-10 text-center">
    <p class="font-display text-lg font-bold">No {{ termLabel }} flashcards yet</p>
  </div>
</template>
