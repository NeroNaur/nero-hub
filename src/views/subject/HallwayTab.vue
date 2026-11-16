<script setup>
import { inject, computed } from 'vue'
import { progress, moduleAccuracy } from '@/lib/progress'
import EmptyContent from '@/components/EmptyContent.vue'
import TermPicker from '@/components/TermPicker.vue'
import AddLessonModal from '@/components/AddLessonModal.vue'
import ModuleEditor from '@/components/ModuleEditor.vue'
import { canEdit } from '@/lib/editMode'
import { deleteModule, clearCache } from '@/lib/api'
import { ref } from 'vue'
import { modulesInTerm, setsInTerm, TERMS } from '@/lib/api'
import { currentTerm } from '@/lib/term'

const subject = inject('subject')
const reloadSubject = inject('reloadSubject')
const adding = ref(false)
const editing = ref(null) // module id

async function refresh() {
  adding.value = false
  editing.value = null
  clearCache(s.value.slug)
  await reloadSubject()
}
async function remove(m) {
  if (!confirm(`Delete "${m.title}"? Its notes and questions will be removed.`)) return
  try {
    await deleteModule(m.id)
    await refresh()
  } catch (e) {
    alert(e.message)
  }
}
const s = computed(() => subject.value)
const term = computed(() => currentTerm(s.value))
const termLabel = computed(() => TERMS.find((t) => t.key === term.value).label)
const mods = computed(() => modulesInTerm(s.value, term.value))
const unassignedList = computed(() => s.value.modules.filter((m) => !m.term))
const unassigned = computed(() => unassignedList.value.length)
const shown = computed(() => (canEdit.value ? [...mods.value, ...unassignedList.value] : mods.value))
const mistakes = computed(() => progress.mistakes[s.value.slug]?.length || 0)
const lastExam = computed(() => progress.attempts.find((a) => a.subject === s.value.slug && a.kind === 'exam' && (!a.term || a.term === term.value)))
const lastModule = computed(() => s.value.modules.find((m) => m.slug === progress.last[s.value.slug]?.module))
const stats = computed(() => [
  { label: 'Lessons', value: mods.value.length },
  { label: 'Questions', value: mods.value.reduce((n, m) => n + m.questions.length, 0) },
  { label: 'Flashcards', value: setsInTerm(s.value, term.value).reduce((n, x) => n + x.flashcards.length, 0) },
  { label: 'To review', value: mistakes.value },
])
</script>

<template>
  <p v-if="s.needsMigration" class="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
    Terms and flashcard sets need <code>supabase/003_terms_flashcard_sets.sql</code> to be run in Supabase.
  </p>
  <TermPicker :subject="s" />
  <div class="grid gap-3 grid-cols-2 sm:grid-cols-4 mb-6">
    <div v-for="st in stats" :key="st.label" class="rounded-xl border border-line bg-panel p-4">
      <p class="font-mono text-xs text-muted">{{ st.label }}</p>
      <p class="font-display text-3xl font-bold mt-1">{{ st.value }}</p>
    </div>
  </div>

  <div class="grid gap-3 sm:grid-cols-2 mb-10">
    <RouterLink
      v-if="lastModule"
      :to="{ name: 'study', params: { subject: s.slug, module: lastModule.slug } }"
      class="rounded-xl border border-line bg-panel p-4 hover:border-white/30 transition"
    >
      <p class="font-mono text-xs text-muted">CONTINUE STUDYING</p>
      <p class="font-semibold mt-1">{{ lastModule.title }} →</p>
    </RouterLink>
    <RouterLink
      :to="{ name: 'exam', params: { subject: s.slug } }"
      class="rounded-xl border border-line bg-panel p-4 hover:border-white/30 transition"
    >
      <p class="font-mono text-xs text-muted">{{ termLabel.toUpperCase() }} MOCK EXAM</p>
      <p class="font-semibold mt-1">
        <template v-if="lastExam">Last: {{ Math.round((lastExam.score / lastExam.total) * 100) }}% · try again →</template>
        <template v-else>Take your first mock exam →</template>
      </p>
    </RouterLink>
  </div>

  <div class="flex items-center mb-4">
    <h2 class="font-display text-xl font-bold">{{ termLabel }} lessons</h2>
    <button
      v-if="canEdit"
      class="ml-auto rounded-lg border-2 border-dashed border-accent/60 px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent/10"
      @click="adding = true"
    >+ Add lesson</button>
  </div>
  <p v-if="unassigned && canEdit" class="mb-3 font-mono text-xs text-amber-300">{{ unassigned }} lesson(s) have no term yet (shown below with "no term"). Use ✏️ Edit to set one; classmates can't see them until then.</p>
  <EmptyContent v-if="!shown.length && !canEdit" :what="`${termLabel} lessons`" />
  <p v-else-if="!shown.length" class="rounded-xl border border-dashed border-accent/40 p-8 text-center text-sm text-muted">No {{ termLabel }} lessons yet. Use <span class="text-accent">+ Add lesson</span>.</p>
  <ol v-else class="space-y-3">
    <li v-for="(m, i) in shown" :key="m.id" class="rounded-xl border border-line bg-panel p-4 sm:flex items-center gap-4">
      <span class="font-mono text-sm text-muted w-8 hidden sm:block">{{ String(i + 1).padStart(2, '0') }}</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold">{{ m.title }} <span v-if="!m.term" class="font-mono text-xs text-amber-300">no term</span></p>
        <p v-if="m.summary" class="text-sm text-muted">{{ m.summary }}</p>
        <p class="font-mono text-xs text-muted mt-1">
          {{ m.questions.length }} questions<template v-if="m.materials?.length"> · 📎 {{ m.materials.length }} material{{ m.materials.length === 1 ? '' : 's' }}</template>
          <template v-if="moduleAccuracy(m)"> · <span :style="{ color: s.color }">{{ moduleAccuracy(m).pct }}% accuracy</span></template>
        </p>
      </div>
      <div class="flex gap-2 mt-3 sm:mt-0">
        <RouterLink :to="{ name: 'study', params: { subject: s.slug, module: m.slug } }" class="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/40">Study</RouterLink>
        <RouterLink
          v-if="m.questions.length"
          :to="{ name: 'practice', params: { subject: s.slug }, query: { m: m.slug } }"
          class="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/40"
        >Practice</RouterLink>
        <template v-if="canEdit">
          <button class="rounded-lg border border-dashed border-accent/60 px-3 py-1.5 text-sm text-accent hover:bg-accent/10" @click="editing = m.id">✏️ Edit</button>
          <button class="rounded-lg border border-dashed border-red-400/50 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10" title="Delete lesson" @click="remove(m)">🗑</button>
        </template>
      </div>
    </li>
  </ol>

  <AddLessonModal v-if="adding" :subject="s" :term="term" @close="adding = false" @done="refresh" />
  <div v-if="editing" class="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4" @click.self="refresh">
    <div class="mx-auto my-8 max-w-3xl rounded-2xl border border-line bg-ink p-6">
      <ModuleEditor :module-id="editing" :subject="s" back-label="✕ Close editor" @back="refresh" />
    </div>
  </div>
</template>
