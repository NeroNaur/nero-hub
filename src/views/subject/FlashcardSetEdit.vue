<script setup>
import { inject, computed, ref, reactive, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { user } from '@/lib/auth'
import { canEdit, editMode } from '@/lib/editMode'
import { TERMS, modulesInTerm, saveFlashcardSet, deleteFlashcardSet, uploadCardImage, clearCache } from '@/lib/api'
import { currentTerm, setTerm } from '@/lib/term'
import ImportCardsModal from '@/components/ImportCardsModal.vue'
import ImageSlot from '@/components/ImageSlot.vue'

const subject = inject('subject')
const reloadSubject = inject('reloadSubject')
const route = useRoute()
const router = useRouter()
const s = computed(() => subject.value)
const existing = computed(() => (route.params.set ? s.value.sets.find((x) => x.id === route.params.set) : null))

let uid = 0
const blank = () => ({ _k: ++uid, id: null, front: '', back: '', front_image: null, back_image: null })

const form = reactive({
  id: existing.value?.id || null,
  subject_id: s.value.id,
  term: existing.value?.term || route.query.term || currentTerm(s.value),
  module_id: existing.value?.module_id || '',
  title: existing.value?.title || '',
  description: existing.value?.description || '',
  sort_order: existing.value?.sort_order ?? s.value.sets.length + 1,
})
const cards = ref(
  existing.value?.flashcards.length
    ? existing.value.flashcards.map((c) => ({ _k: ++uid, ...c, front: c.front || '', back: c.back || '' }))
    : [blank(), blank()],
)
const dirty = ref(false)
const saving = ref(false)
const error = ref('')
const showImport = ref(false)
const termModules = computed(() => modulesInTerm(s.value, form.term))
const filled = computed(() => cards.value.filter((c) => c.front.trim() || c.back.trim() || c.front_image || c.back_image).length)

function touch() {
  dirty.value = true
}
function addCard() {
  cards.value.push(blank())
  touch()
  requestAnimationFrame(() => document.querySelector(`[data-card="${cards.value.length - 1}"] textarea`)?.focus())
}
function removeCard(k) {
  cards.value.splice(k, 1)
  touch()
}
function onImport(list) {
  // fill trailing empty rows first, then append
  while (cards.value.length && !cards.value.at(-1).front && !cards.value.at(-1).back && !cards.value.at(-1).front_image) cards.value.pop()
  cards.value.push(...list.map((c) => ({ ...blank(), ...c })))
  showImport.value = false
  touch()
}

// ---- drag to reorder ----
const dragFrom = ref(null)
const dragOver = ref(null)
function onDrop(k) {
  if (dragFrom.value === null || dragFrom.value === k) return
  const [moved] = cards.value.splice(dragFrom.value, 1)
  cards.value.splice(k, 0, moved)
  dragFrom.value = dragOver.value = null
  touch()
}
function move(k, d) {
  const n = k + d
  if (n < 0 || n >= cards.value.length) return
  const [c] = cards.value.splice(k, 1)
  cards.value.splice(n, 0, c)
  touch()
}

// ---- images ----
const uploading = reactive({}) // `${k}-${side}` -> true
const previews = reactive({}) // `${k}-${side}` -> local preview URL while uploading
async function pickImage(card, side, file) {
  if (!file) return
  if (!file.type.startsWith('image/')) return (error.value = `"${file.name}" is not an image.`)
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name))
    return (error.value = 'iPhone HEIC photos can\'t be read by most browsers. Use JPG/PNG (or screenshot it).')
  const key = `${card._k}-${side}`
  const preview = URL.createObjectURL(file) // show it instantly while it uploads
  previews[key] = preview
  uploading[key] = true
  error.value = ''
  try {
    card[`${side}_image`] = await uploadCardImage(file)
    touch()
  } catch (err) {
    error.value = err.message
  } finally {
    delete uploading[key]
    delete previews[key]
    URL.revokeObjectURL(preview)
  }
}
// Paste an image (Ctrl+V) while typing in a term/definition box → it goes into that side's image slot.
function onPaste(card, side, e) {
  const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'))
  if (!file) return
  e.preventDefault()
  pickImage(card, side, file)
}
function clearImage(card, side) {
  card[`${side}_image`] = null
  touch()
}

// ---- save ----
async function save(thenPractice = false) {
  error.value = ''
  if (!form.title.trim()) return (error.value = 'Give the set a title.')
  if (!filled.value) return (error.value = 'Add at least one card.')
  saving.value = true
  try {
    const id = await saveFlashcardSet(form, cards.value)
    dirty.value = false
    clearCache(s.value.slug)
    await reloadSubject()
    setTerm(s.value, form.term)
    router.push(
      thenPractice
        ? { name: 'flashcards-set', params: { subject: s.value.slug, set: id } }
        : { name: 'flashcards', params: { subject: s.value.slug } },
    )
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
async function removeSet() {
  if (!form.id || !confirm(`Delete "${form.title}" and all its cards?`)) return
  try {
    await deleteFlashcardSet(form.id)
    dirty.value = false
    clearCache(s.value.slug)
    await reloadSubject()
    router.push({ name: 'flashcards', params: { subject: s.value.slug } })
  } catch (err) {
    error.value = err.message
  }
}

// warn before leaving with unsaved changes
const beforeUnload = (e) => dirty.value && (e.preventDefault(), (e.returnValue = ''))
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeRouteLeave(() => !dirty.value || confirm('You have unsaved changes. Leave anyway?'))
</script>

<template>
  <div v-if="!user" class="rounded-xl border border-dashed border-line p-10 text-center text-muted">
    Only the site owner can edit flashcards.
  </div>
  <div v-else-if="!canEdit" class="rounded-xl border border-dashed border-accent/50 p-10 text-center">
    <p class="text-muted">Turn on Edit mode to edit this set.</p>
    <button class="mt-3 rounded-lg bg-accent px-4 py-2 font-semibold text-ink" @click="editMode.on = true">Turn on Edit mode</button>
  </div>

  <div v-else class="max-w-4xl mx-auto" @input="touch">
    <!-- header -->
    <div class="flex flex-wrap items-center gap-3 mb-5">
      <div>
        <RouterLink :to="{ name: 'flashcards', params: { subject: s.slug } }" class="font-mono text-xs text-muted hover:text-white">← All sets</RouterLink>
        <h2 class="font-display text-2xl font-bold">{{ form.id ? 'Edit flashcard set' : 'Create a new flashcard set' }}</h2>
      </div>
      <div class="ml-auto flex gap-2">
        <button class="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40" :disabled="saving" @click="save(false)">
          {{ form.id ? 'Save' : 'Create' }}
        </button>
        <button class="rounded-full px-4 py-2 text-sm font-semibold text-ink disabled:opacity-40" :style="{ background: s.color }" :disabled="saving" @click="save(true)">
          {{ form.id ? 'Save' : 'Create' }} and practice
        </button>
      </div>
    </div>

    <!-- set details -->
    <div class="space-y-2">
      <input v-model="form.title" placeholder="Title" class="w-full rounded-xl bg-panel border border-line px-4 py-3 font-semibold focus:border-white/40 focus:outline-none" />
      <textarea v-model="form.description" rows="2" placeholder="Add a description…" class="w-full rounded-xl bg-panel border border-line px-4 py-3 text-sm focus:border-white/40 focus:outline-none" />
      <div class="flex flex-wrap gap-2">
        <div class="inline-flex rounded-xl border border-line bg-panel p-1">
          <button
            v-for="t in TERMS"
            :key="t.key"
            type="button"
            class="rounded-lg px-3 py-1 text-sm font-semibold"
            :class="form.term === t.key ? 'text-ink' : 'text-muted hover:text-white'"
            :style="form.term === t.key ? { background: s.color } : {}"
            @click="form.term = t.key; form.module_id = ''; touch()"
          >{{ t.label }}</button>
        </div>
        <select v-model="form.module_id" class="rounded-xl border border-line bg-panel px-3 py-2 text-sm" @change="touch">
          <option value="">Lesson (optional)…</option>
          <option v-for="m in termModules" :key="m.id" :value="m.id">{{ m.title }}</option>
        </select>
      </div>
    </div>

    <!-- toolbar -->
    <div class="mt-5 mb-3 flex items-center gap-2">
      <button class="rounded-full border border-line px-4 py-1.5 text-sm hover:border-white/40" @click="showImport = true">+ Import</button>
      <span class="ml-auto font-mono text-xs text-muted">{{ filled }} cards</span>
    </div>

    <!-- cards -->
    <div class="space-y-3">
      <div
        v-for="(c, k) in cards"
        :key="c._k"
        :data-card="k"
        class="rounded-xl border bg-panel p-4 transition"
        :class="dragOver === k ? 'border-accent' : 'border-line'"
        @dragover.prevent="dragFrom !== null && (dragOver = k)"
        @dragleave="dragOver = null"
        @drop.prevent="onDrop(k)"
      >
        <div class="flex items-center mb-3">
          <span class="font-mono text-sm font-semibold">{{ k + 1 }}</span>
          <div class="ml-auto flex items-center gap-1">
            <button class="sm:hidden px-2 text-muted" title="Move up" @click="move(k, -1)">↑</button>
            <button class="sm:hidden px-2 text-muted" title="Move down" @click="move(k, 1)">↓</button>
            <span
              draggable="true"
              class="hidden sm:inline cursor-grab px-2 text-lg text-muted hover:text-white select-none"
              title="Drag to reorder"
              @dragstart="dragFrom = k"
              @dragend="dragFrom = dragOver = null"
            >≡</span>
            <button class="px-2 text-muted hover:text-red-300" title="Delete card" @click="removeCard(k)">🗑</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-[auto_1fr_1fr_auto] gap-3 items-start">
          <template v-for="side in ['front', 'back']" :key="side">
            <!-- term image goes left of the term; definition image goes right of the definition -->
            <ImageSlot
              v-if="side === 'front'"
              :url="previews[`${c._k}-front`] || c.front_image"
              :uploading="!!uploading[`${c._k}-front`]"
              label="term"
              @pick="(f) => pickImage(c, 'front', f)"
            />

            <div>
              <textarea
                v-model="c[side]"
                rows="1"
                :placeholder="side === 'front' ? 'Enter term' : 'Enter definition'"
                class="w-full resize-y rounded-lg border border-line bg-ink px-3 py-2 text-sm focus:border-white/40 focus:outline-none"
                @keydown.tab.exact="side === 'back' && k === cards.length - 1 && ($event.preventDefault(), addCard())"
                @paste="onPaste(c, side, $event)"
              />
              <div class="mt-1 flex items-center justify-between font-mono text-[10px] uppercase text-muted">
                <span>{{ side === 'front' ? 'Term' : 'Definition' }}</span>
                <button v-if="c[`${side}_image`]" class="normal-case text-red-300 hover:underline" @click="clearImage(c, side)">remove image</button>
              </div>
            </div>

            <ImageSlot
              v-if="side === 'back'"
              :url="previews[`${c._k}-back`] || c.back_image"
              :uploading="!!uploading[`${c._k}-back`]"
              label="definition"
              @pick="(f) => pickImage(c, 'back', f)"
            />
          </template>
        </div>
      </div>
    </div>

    <button class="mt-3 w-full rounded-xl border-2 border-dashed border-line py-4 font-semibold text-muted hover:border-white/40 hover:text-white" @click="addCard">
      + Add card
    </button>

    <div class="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
      <button v-if="form.id" class="text-sm text-red-300 hover:underline" @click="removeSet">Delete this set</button>
      <div class="ml-auto flex gap-2">
        <button class="rounded-full bg-white/10 px-5 py-2 font-semibold hover:bg-white/15 disabled:opacity-40" :disabled="saving" @click="save(false)">{{ saving ? 'Saving…' : form.id ? 'Save' : 'Create' }}</button>
        <button class="rounded-full px-5 py-2 font-semibold text-ink disabled:opacity-40" :style="{ background: s.color }" :disabled="saving" @click="save(true)">
          {{ form.id ? 'Save' : 'Create' }} and practice
        </button>
      </div>
    </div>

    <p v-if="error" class="fixed bottom-5 right-5 max-w-sm rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-2 text-sm text-red-200">{{ error }}</p>
    <ImportCardsModal v-if="showImport" @close="showImport = false" @import="onImport" />
  </div>
</template>
