<script setup>
// Searches everything in one subject: lessons, notes, questions, flashcards, quizzes and materials.
import { ref, computed } from 'vue'
import { TERMS } from '@/lib/api'
import { formatAnswer } from '@/lib/grade'
import { kindInfo } from '@/lib/quizzes'
import { setTerm } from '@/lib/term'

const props = defineProps({ subject: Object })
const query = ref('')

const plain = (s) =>
  String(s ?? '')
    .replace(/[#*_>`|]/g, ' ')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
const termLabel = (t) => TERMS.find((x) => x.key === t)?.label || 'No term'

// One flat list of searchable things, rebuilt only when the subject changes.
const index = computed(() => {
  const s = props.subject
  const out = []
  const study = (m) => ({ name: 'study', params: { subject: s.slug, module: m.slug } })
  for (const m of s.modules) {
    out.push({ type: 'Lesson', title: m.title, text: plain(m.summary), term: m.term, to: study(m) })
    for (const r of m.reviews) out.push({ type: 'Notes', title: `${m.title}${r.title ? ' · ' + r.title : ''}`, text: plain(r.content), term: m.term, to: study(m) })
    for (const q of m.questions)
      out.push({ type: 'Question', title: m.title, text: `${plain(q.prompt)} · Answer: ${plain(formatAnswer(q))}`, term: m.term, to: study(m) })
    for (const mat of m.materials || []) out.push({ type: 'Material', title: m.title, text: `${mat.title} ${mat.file_name || ''}`, term: m.term, to: study(m) })
  }
  for (const set of s.sets) {
    const to = { name: 'flashcards-set', params: { subject: s.slug, set: set.id } }
    out.push({ type: 'Flashcard set', title: set.title, text: plain(set.description), term: set.term, to })
    for (const c of set.flashcards) out.push({ type: 'Flashcard', title: set.title, text: `${plain(c.front)} · ${plain(c.back)}`, term: set.term, to })
  }
  for (const z of s.quizzes) {
    const to = { name: 'quizzes-review', params: { subject: s.slug, quiz: z.id } }
    const label = kindInfo(z.kind).One
    out.push({ type: label, title: z.title, text: plain(z.note), term: z.term, to })
    for (const q of z.questions) out.push({ type: `${label} question`, title: z.title, text: `${plain(q.prompt)} · Answer: ${plain(formatAnswer(q))}`, term: z.term, to })
  }
  return out.map((x) => ({ ...x, hay: `${x.title} ${x.text}`.toLowerCase() }))
})

const words = computed(() => query.value.toLowerCase().split(/\s+/).filter((w) => w.length > 1))
const results = computed(() => {
  if (!words.value.length) return []
  return index.value
    .filter((x) => words.value.every((w) => x.hay.includes(w)))
    .map((x) => ({ ...x, score: x.title.toLowerCase().includes(words.value[0]) ? 0 : 1 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 40)
})

// Short excerpt around the first match, with matches highlighted.
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
function snippet(text) {
  const lower = text.toLowerCase()
  const at = Math.max(0, lower.indexOf(words.value[0]))
  const start = Math.max(0, at - 60)
  let part = (start ? '…' : '') + text.slice(start, at + 140) + (at + 140 < text.length ? '…' : '')
  part = esc(part)
  for (const w of words.value) part = part.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`)
  return part
}
</script>

<template>
  <div>
    <div class="relative">
      <input
        v-model="query"
        type="search"
        :placeholder="`Search ${subject.name}: notes, questions, flashcards, quizzes…`"
        class="w-full rounded-xl border border-line bg-panel py-3 pl-10 pr-4 text-sm focus:border-white/40 focus:outline-none"
      />
      <svg class="absolute left-3.5 top-3.5 size-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
    </div>

    <div v-if="words.length" class="mt-3 rounded-xl border border-line bg-panel p-2">
      <p v-if="!results.length" class="p-3 text-sm text-muted">Nothing found for "{{ query }}".</p>
      <p v-else class="px-2 pb-1 font-mono text-[11px] text-muted">{{ results.length }}{{ results.length === 40 ? '+' : '' }} result{{ results.length === 1 ? '' : 's' }}</p>
      <RouterLink
        v-for="(r, i) in results"
        :key="i"
        :to="r.to"
        class="block rounded-lg px-3 py-2 hover:bg-white/5"
        @click="r.term && setTerm(subject, r.term)"
      >
        <p class="flex flex-wrap items-center gap-2 text-sm">
          <span class="rounded bg-white/10 px-1.5 font-mono text-[10px] uppercase">{{ r.type }}</span>
          <span class="font-semibold">{{ r.title }}</span>
          <span class="font-mono text-[10px] text-muted">{{ termLabel(r.term) }}</span>
        </p>
        <p v-if="r.text" class="search-snippet mt-0.5 text-xs text-white/70" v-html="snippet(r.text)" />
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.search-snippet :deep(mark) {
  background: var(--color-accent);
  color: var(--color-ink);
  border-radius: 2px;
  padding: 0 1px;
}
</style>
