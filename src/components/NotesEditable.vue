<script setup>
// A lesson's notes. Everyone sees them rendered; in Edit mode each section can be edited right where it is.
import { ref, computed, inject } from 'vue'
import { renderMarkdown } from '@/lib/markdown'
import { canEdit } from '@/lib/editMode'
import { updateRow, insertRow, deleteRow, clearCache } from '@/lib/api'

const props = defineProps({ subject: Object, module: Object })
const reloadSubject = inject('reloadSubject')

const sections = computed(() => props.module.reviews || [])
const editing = ref(null) // { id | null, at, title, content, preview }
const busy = ref(false)

const render = (r) => renderMarkdown((r.title ? `# ${r.title}\n\n` : '') + r.content)

async function refresh() {
  clearCache(props.subject.slug)
  await reloadSubject()
}
async function run(fn) {
  busy.value = true
  try {
    await fn()
    await refresh()
    return true
  } catch (e) {
    alert(e.message)
    return false
  } finally {
    busy.value = false
  }
}

const edit = (r) => (editing.value = { id: r.id, title: r.title || '', content: r.content, preview: false })
const addAt = (at) => (editing.value = { id: null, at, title: '', content: '', preview: false })

async function save() {
  const e = editing.value
  if (!e.content.trim()) return alert('The section is empty.')
  const ok = await run(async () => {
    if (e.id) {
      await updateRow('reviews', e.id, { title: e.title.trim() || null, content: e.content })
    } else {
      // insert at position e.at, shift the ones after it down
      const list = sections.value
      for (let k = list.length - 1; k >= e.at; k--) await updateRow('reviews', list[k].id, { sort_order: k + 2 })
      await insertRow('reviews', { module_id: props.module.id, title: e.title.trim() || null, content: e.content, sort_order: e.at + 1 })
    }
  })
  if (ok) editing.value = null
}
function cancel() {
  const e = editing.value
  const orig = e.id && sections.value.find((r) => r.id === e.id)
  const changed = e.id ? e.content !== orig.content || e.title !== (orig.title || '') : e.content || e.title
  if (!changed || confirm('Discard your changes?')) editing.value = null
}
function move(i, d) {
  const list = sections.value
  const j = i + d
  if (j < 0 || j >= list.length) return
  run(async () => {
    await updateRow('reviews', list[i].id, { sort_order: j + 1 })
    await updateRow('reviews', list[j].id, { sort_order: i + 1 })
  })
}
const remove = (r) => confirm(`Delete the section "${r.title || 'Untitled'}"?`) && run(() => deleteRow('reviews', r.id))
</script>

<template>
  <div>
    <!-- editor block (also used for "add here") -->
    <template v-for="(r, i) in sections" :key="r.id">
      <div
        v-if="editing?.id === r.id"
        class="mb-10 space-y-2 rounded-2xl border border-accent/60 bg-panel p-4"
      >
        <input v-model="editing.title" placeholder="Section title (optional)" class="w-full rounded-lg border border-line bg-ink px-3 py-2 font-semibold" />
        <div class="flex items-center gap-2 text-xs">
          <button class="rounded px-2 py-1" :class="!editing.preview ? 'bg-white/10' : 'text-muted'" @click="editing.preview = false">Write</button>
          <button class="rounded px-2 py-1" :class="editing.preview ? 'bg-white/10' : 'text-muted'" @click="editing.preview = true">Preview</button>
          <span class="ml-auto font-mono text-muted">Markdown: ## heading · - list · **bold**</span>
        </div>
        <div v-if="editing.preview" class="prose-nh rounded-lg border border-line bg-ink p-4" v-html="renderMarkdown((editing.title ? `# ${editing.title}\n\n` : '') + editing.content)" />
        <textarea v-else v-model="editing.content" rows="14" class="w-full rounded-lg border border-line bg-ink p-3 font-mono text-xs leading-relaxed focus:border-white/40 focus:outline-none" />
        <div class="flex gap-2">
          <button class="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-40" :disabled="busy" @click="save">{{ busy ? 'Saving…' : 'Save' }}</button>
          <button class="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-white" @click="cancel">Cancel</button>
        </div>
      </div>

      <div v-else class="group relative mb-10" :class="canEdit && 'rounded-xl border border-dashed border-transparent p-2 -m-2 hover:border-accent/40'">
        <div v-if="canEdit && !editing" class="absolute -top-3 right-2 z-10 flex gap-1 rounded-lg border border-line bg-panel px-1 py-0.5 text-xs opacity-80 group-hover:opacity-100">
          <button class="px-1.5 text-accent" title="Edit this section" @click="edit(r)">✏️ Edit</button>
          <button class="px-1.5 text-muted hover:text-white" title="Move up" @click="move(i, -1)">↑</button>
          <button class="px-1.5 text-muted hover:text-white" title="Move down" @click="move(i, 1)">↓</button>
          <button class="px-1.5 text-red-300" title="Delete section" @click="remove(r)">🗑</button>
        </div>
        <div class="prose-nh" v-html="render(r)" />
      </div>

      <button
        v-if="canEdit && !editing"
        class="-mt-6 mb-6 w-full rounded-lg border border-dashed border-line py-1 font-mono text-[11px] text-muted opacity-60 hover:border-accent/60 hover:text-accent hover:opacity-100"
        @click="addAt(i + 1)"
      >+ Add section here</button>
    </template>

    <!-- new section editor (end of list or empty lesson) -->
    <div v-if="canEdit && editing && !editing.id" class="mb-10 space-y-2 rounded-2xl border border-accent/60 bg-panel p-4">
      <p class="font-mono text-xs text-accent">NEW SECTION{{ sections.length ? ` (position ${editing.at + 1})` : '' }}</p>
      <input v-model="editing.title" placeholder="Section title (optional)" class="w-full rounded-lg border border-line bg-ink px-3 py-2 font-semibold" />
      <div class="flex items-center gap-2 text-xs">
        <button class="rounded px-2 py-1" :class="!editing.preview ? 'bg-white/10' : 'text-muted'" @click="editing.preview = false">Write</button>
        <button class="rounded px-2 py-1" :class="editing.preview ? 'bg-white/10' : 'text-muted'" @click="editing.preview = true">Preview</button>
      </div>
      <div v-if="editing.preview" class="prose-nh rounded-lg border border-line bg-ink p-4" v-html="renderMarkdown((editing.title ? `# ${editing.title}\n\n` : '') + editing.content)" />
      <textarea v-else v-model="editing.content" rows="12" placeholder="Paste or type the notes…" class="w-full rounded-lg border border-line bg-ink p-3 font-mono text-xs leading-relaxed focus:border-white/40 focus:outline-none" />
      <div class="flex gap-2">
        <button class="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-ink disabled:opacity-40" :disabled="busy" @click="save">{{ busy ? 'Saving…' : 'Add section' }}</button>
        <button class="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-white" @click="cancel">Cancel</button>
      </div>
    </div>

    <template v-if="!sections.length && !(canEdit && editing)">
      <button v-if="canEdit" class="w-full rounded-xl border-2 border-dashed border-accent/50 py-6 font-semibold text-accent hover:bg-accent/5" @click="addAt(0)">+ Add the first notes section</button>
      <div v-else class="rounded-xl border border-dashed border-line p-10 text-center">
        <p class="font-display text-lg font-bold">No notes for this lesson yet</p>
      </div>
    </template>
  </div>
</template>
