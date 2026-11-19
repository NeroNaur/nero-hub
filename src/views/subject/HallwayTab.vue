<script setup>
import { inject, computed, ref } from 'vue'
import { progress, moduleAccuracy } from '@/lib/progress'
import { canEdit } from '@/lib/editMode'
import { deleteModule, updateRow, clearCache, modulesInTerm, setsInTerm, quizzesInTerm, TERMS } from '@/lib/api'
import { currentTerm } from '@/lib/term'
import { quizScores, fmtDate } from '@/lib/quizzes'
import EmptyContent from '@/components/EmptyContent.vue'
import TermPicker from '@/components/TermPicker.vue'
import AddLessonModal from '@/components/AddLessonModal.vue'
import HideableSection from '@/components/HideableSection.vue'
import SubjectSearch from '@/components/SubjectSearch.vue'
import { lessonFile, download } from '@/lib/backup'

const subject = inject('subject')
const reloadSubject = inject('reloadSubject')
const s = computed(() => subject.value)
const term = computed(() => currentTerm(s.value))
const termLabel = computed(() => TERMS.find((t) => t.key === term.value).label)
const mods = computed(() => modulesInTerm(s.value, term.value))
const unassignedList = computed(() => s.value.modules.filter((m) => !m.term))
const shown = computed(() => (canEdit.value ? [...mods.value, ...unassignedList.value] : mods.value))
const mistakes = computed(() => progress.mistakes[s.value.slug]?.length || 0)
const lastModule = computed(() => s.value.modules.find((m) => m.slug === progress.last[s.value.slug]?.module))
const recentQuizzes = computed(() => quizzesInTerm(s.value, term.value).slice(0, 4))
const stats = computed(() => [
  { label: 'Lessons', value: mods.value.length },
  { label: 'Questions', value: mods.value.reduce((n, m) => n + m.questions.length, 0) },
  { label: 'Flashcards', value: setsInTerm(s.value, term.value).reduce((n, x) => n + x.flashcards.length, 0) },
  { label: 'To review', value: mistakes.value },
])

const adding = ref(false)
async function refresh() {
  adding.value = false
  editing.value = null
  clearCache(s.value.slug)
  await reloadSubject()
}

// ---- edit a lesson right in its row ----
const editing = ref(null) // { id, title, summary, term, sort_order }
const saving = ref(false)
const startEdit = (m) => (editing.value = { id: m.id, title: m.title, summary: m.summary || '', term: m.term || '', sort_order: m.sort_order ?? 0 })
async function saveEdit() {
  const e = editing.value
  if (!e.title.trim()) return alert('Give the lesson a title.')
  saving.value = true
  try {
    await updateRow('modules', e.id, {
      title: e.title.trim(),
      summary: e.summary.trim() || null,
      term: e.term || null,
      sort_order: Number(e.sort_order) || 0,
    })
    await refresh()
  } catch (err) {
    alert(err.message)
  } finally {
    saving.value = false
  }
}
async function remove(m) {
  const files = (m.materials || []).filter((x) => x.storage_path)
  const mb = files.reduce((n, x) => n + (x.size_bytes || 0), 0) / 1048576
  const extra = files.length ? `\n\nThis also deletes ${files.length} uploaded file${files.length === 1 ? '' : 's'} (${mb.toFixed(1)} MB).` : ''
  if (!confirm(`Delete "${m.title}"? Its notes, questions and materials will be removed.${extra}`)) return
  try {
    await deleteModule(m.id)
    await refresh()
  } catch (e) {
    alert(e.message)
  }
}
const field = 'w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm focus:border-white/40 focus:outline-none'
</script>

<template>
  <p v-if="s.needsMigration" class="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
    Terms and flashcard sets need <code>supabase/003_terms_flashcard_sets.sql</code> to be run in Supabase.
  </p>
  <p v-if="s.needsSettings && canEdit" class="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
    Show/Hide needs <code>supabase/006_subject_settings.sql</code> to be run in Supabase.
  </p>
  <!-- Search (all terms) -->
  <HideableSection :subject="s" id="search" label="Search">
    <SubjectSearch :subject="s" />
  </HideableSection>

  <TermPicker :subject="s" />

  <!-- Stats -->
  <HideableSection :subject="s" id="stats" label="Stats">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div v-for="st in stats" :key="st.label" class="rounded-xl border border-line bg-panel p-4">
        <p class="font-mono text-xs text-muted">{{ st.label }}</p>
        <p class="mt-1 font-display text-3xl font-bold">{{ st.value }}</p>
      </div>
    </div>
  </HideableSection>

  <!-- Continue studying -->
  <HideableSection :subject="s" id="continue" label="Continue studying">
    <RouterLink
      v-if="lastModule"
      :to="{ name: 'study', params: { subject: s.slug, module: lastModule.slug } }"
      class="block rounded-xl border border-line bg-panel p-4 transition hover:border-white/30"
    >
      <p class="font-mono text-xs text-muted">CONTINUE STUDYING</p>
      <p class="mt-1 font-semibold">{{ lastModule.title }} →</p>
    </RouterLink>
    <p v-else-if="canEdit" class="text-sm text-muted">Shows the last lesson someone opened in Study.</p>
  </HideableSection>

  <!-- Recent quizzes (real class quizzes) -->
  <HideableSection :subject="s" id="quizzes" label="Recent quizzes">
    <div class="mb-3 flex items-baseline gap-3">
      <h2 class="font-display text-xl font-bold">Recent {{ termLabel }} quizzes</h2>
      <RouterLink v-if="recentQuizzes.length" :to="{ name: 'quizzes', params: { subject: s.slug } }" class="font-mono text-xs text-muted hover:text-white">all quizzes →</RouterLink>
    </div>
    <p v-if="!recentQuizzes.length" class="rounded-xl border border-dashed border-line p-5 text-sm text-muted">No {{ termLabel }} quizzes yet.</p>
    <div v-else class="grid gap-3 sm:grid-cols-2">
      <div v-for="z in recentQuizzes" :key="z.id" class="rounded-xl border border-line bg-panel p-4">
        <p class="font-mono text-xs text-muted"><template v-if="z.quiz_date">{{ fmtDate(z.quiz_date) }} · </template>{{ z.questions.length }} item{{ z.questions.length === 1 ? '' : 's' }}</p>
        <p class="mt-0.5 font-semibold">{{ z.title }}</p>
        <p v-if="quizScores(z.id)" class="text-xs text-muted">Best <span :style="{ color: s.color }">{{ quizScores(z.id).best }}%</span></p>
        <div class="mt-3 flex gap-2">
          <RouterLink :to="{ name: 'quizzes-take', params: { subject: s.slug, quiz: z.id } }" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink" :style="{ background: s.color }">Retake</RouterLink>
          <RouterLink :to="{ name: 'quizzes-review', params: { subject: s.slug, quiz: z.id } }" class="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-white/40">Answers</RouterLink>
        </div>
      </div>
    </div>
  </HideableSection>

  <!-- Lessons -->
  <HideableSection :subject="s" id="lessons" label="Lessons list">
    <div class="mb-4 flex items-center">
      <h2 class="font-display text-xl font-bold">{{ termLabel }} lessons</h2>
      <button
        v-if="canEdit"
        class="ml-auto rounded-lg border-2 border-dashed border-accent/60 px-3 py-1.5 text-sm font-semibold text-accent hover:bg-accent/10"
        @click="adding = true"
      >+ Add lesson</button>
    </div>
    <p v-if="unassignedList.length && canEdit" class="mb-3 font-mono text-xs text-amber-300">
      {{ unassignedList.length }} lesson(s) have no term yet (shown below with "no term"). Use ✏️ to set one; classmates can't see them until then.
    </p>
    <EmptyContent v-if="!shown.length && !canEdit" :what="`${termLabel} lessons`" />
    <p v-else-if="!shown.length" class="rounded-xl border border-dashed border-accent/40 p-8 text-center text-sm text-muted">
      No {{ termLabel }} lessons yet. Use <span class="text-accent">+ Add lesson</span>.
    </p>

    <ol v-else class="space-y-3">
      <li v-for="(m, i) in shown" :key="m.id" class="rounded-xl border bg-panel p-4" :class="editing?.id === m.id ? 'border-accent/60' : 'border-line'">
        <!-- editing in place -->
        <div v-if="editing?.id === m.id" class="space-y-2">
          <div class="grid gap-2 sm:grid-cols-[1fr_140px_80px]">
            <input v-model="editing.title" placeholder="Lesson title" :class="field" class="font-semibold" @keydown.enter="saveEdit" />
            <select v-model="editing.term" :class="field">
              <option value="">— no term —</option>
              <option v-for="t in TERMS" :key="t.key" :value="t.key">{{ t.label }}</option>
            </select>
            <input v-model.number="editing.sort_order" type="number" title="Order" :class="field" />
          </div>
          <textarea v-model="editing.summary" rows="2" placeholder="Description (optional)" :class="field" />
          <div class="flex gap-2">
            <button class="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-40" :disabled="saving" @click="saveEdit">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button class="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-white" @click="editing = null">Cancel</button>
            <span class="ml-auto self-center font-mono text-xs text-muted">Notes & questions are edited on the Study page.</span>
          </div>
        </div>

        <!-- normal row -->
        <div v-else class="items-center gap-4 sm:flex">
          <span class="hidden w-8 font-mono text-sm text-muted sm:block">{{ String(i + 1).padStart(2, '0') }}</span>
          <div class="min-w-0 flex-1">
            <p class="font-semibold">{{ m.title }} <span v-if="!m.term" class="font-mono text-xs text-amber-300">no term</span></p>
            <p v-if="m.summary" class="text-sm text-muted">{{ m.summary }}</p>
            <p class="mt-1 font-mono text-xs text-muted">
              {{ m.questions.length }} questions<template v-if="m.materials?.length"> · 📎 {{ m.materials.length }} material{{ m.materials.length === 1 ? '' : 's' }}</template>
              <template v-if="moduleAccuracy(m)"> · <span :style="{ color: s.color }">{{ moduleAccuracy(m).pct }}% accuracy</span></template>
            </p>
          </div>
          <div class="mt-3 flex flex-wrap gap-2 sm:mt-0">
            <RouterLink :to="{ name: 'study', params: { subject: s.slug, module: m.slug } }" class="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/40">Study</RouterLink>
            <RouterLink
              v-if="m.questions.length"
              :to="{ name: 'practice', params: { subject: s.slug }, query: { m: m.slug } }"
              class="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-white/40"
            >Practice</RouterLink>
            <template v-if="canEdit">
              <button class="rounded-lg border border-dashed border-accent/60 px-3 py-1.5 text-sm text-accent hover:bg-accent/10" title="Edit title, description, term" @click="startEdit(m)">✏️</button>
              <button class="rounded-lg border border-dashed border-line px-3 py-1.5 text-sm text-muted hover:text-white" title="Download a backup of this lesson (.json, re-importable)" @click="download(lessonFile(s, m), `${s.slug}-${m.slug}.json`)">⬇</button>
              <button class="rounded-lg border border-dashed border-red-400/50 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/10" title="Delete lesson" @click="remove(m)">🗑</button>
            </template>
          </div>
        </div>
      </li>
    </ol>
  </HideableSection>

  <AddLessonModal v-if="adding" :subject="s" :term="term" @close="adding = false" @done="refresh" />
</template>
