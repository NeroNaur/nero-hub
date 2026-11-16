<script setup>
import { ref, watch } from 'vue'
import { user, signIn, signOut } from '@/lib/auth'
import { editMode } from '@/lib/editMode'
import { listSubjectsAdmin, saveSubject, deleteSubject, subjectFileStats, clearCache } from '@/lib/api'
import { slugify } from '@/lib/importFormat'

const mock = import.meta.env.VITE_MOCK === '1'

// ---- login ----
const email = ref('')
const password = ref('')
const loginError = ref('')
const busy = ref(false)
async function login() {
  loginError.value = ''
  busy.value = true
  try {
    await signIn(email.value, password.value)
  } catch (e) {
    loginError.value = e.message
  } finally {
    busy.value = false
  }
}

// ---- subjects ----
const subjects = ref([])
const error = ref('')
const flash = ref('')
async function load() {
  try {
    subjects.value = (await listSubjectsAdmin()).map((s) => ({ ...s, _dirty: false }))
  } catch (e) {
    error.value = e.message
  }
}
watch(user, (u) => u && !mock && load(), { immediate: true })

const palette = ['#e11d48', '#0ea5e9', '#f59e0b', '#16a34a', '#7c3aed', '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1']
const defaultTerm = 'Second Semester SY 2026-2027'

function addSubject() {
  subjects.value.push({
    id: null,
    slug: '',
    code: '',
    name: '',
    term: subjects.value.at(-1)?.term || defaultTerm,
    color: palette[subjects.value.length % palette.length],
    sort_order: subjects.value.length + 1,
    modules: [{ count: 0 }],
    _dirty: true,
  })
}

async function save(s) {
  error.value = ''
  if (!s.name.trim()) return (error.value = 'Give the subject a name.')
  if (!s.id) s.slug = slugify(s.name)
  if (!s.slug) return (error.value = 'That name needs at least one letter or number.')
  try {
    const row = await saveSubject(s)
    Object.assign(s, row, { _dirty: false })
    clearCache()
    flash.value = `Saved ${s.name}`
    setTimeout(() => (flash.value = ''), 2000)
  } catch (e) {
    error.value = /duplicate|unique/i.test(e.message) ? 'A subject with that name already exists.' : e.message
  }
}

async function remove(s, i) {
  if (!s.id) return subjects.value.splice(i, 1)
  const n = s.modules?.[0]?.count || 0
  const f = await subjectFileStats(s.id)
  const files = f.count ? ` and ${f.count} uploaded file${f.count === 1 ? '' : 's'} (${(f.bytes / 1048576).toFixed(1)} MB)` : ''
  const typed = prompt(
    `Delete "${s.name}"?\n\nThis permanently deletes its ${n} lesson(s), all questions, notes, flashcard sets${files}.\n\nType the subject name to confirm:`,
  )
  if (typed?.trim() !== s.name) return
  try {
    await deleteSubject(s.id)
    subjects.value.splice(i, 1)
    clearCache()
  } catch (e) {
    error.value = e.message
  }
}

const input = 'w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm focus:border-white/40 focus:outline-none'
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <p class="font-mono text-xs text-accent mb-2">ADMIN</p>
    <h1 class="font-display text-3xl font-bold tracking-tight mb-8">{{ user ? 'Subjects' : 'Log in' }}</h1>

    <p v-if="mock" class="text-muted">Admin is disabled in mock mode.</p>

    <!-- Login -->
    <form v-else-if="!user" class="rounded-2xl border border-line bg-panel p-6 space-y-4 max-w-sm" @submit.prevent="login">
      <p class="text-sm text-muted">Owner login. Classmates don't need an account; they can use everything without logging in.</p>
      <input v-model="email" type="email" required placeholder="Email" class="w-full rounded-lg border border-line bg-ink px-3 py-2" />
      <input v-model="password" type="password" required placeholder="Password" class="w-full rounded-lg border border-line bg-ink px-3 py-2" />
      <p v-if="loginError" class="text-sm text-red-300">{{ loginError }}</p>
      <button :disabled="busy" class="w-full rounded-lg bg-accent py-2 font-semibold text-ink disabled:opacity-50">Log in</button>
    </form>

    <template v-else>
      <div class="rounded-xl border border-line bg-panel p-4 mb-8 text-sm text-muted">
        To add or edit <span class="text-white">lessons</span> and <span class="text-white">flashcards</span>, turn on
        <button class="font-semibold text-accent underline" @click="editMode.on = true">Edit mode</button>
        and open a subject. This page is for <span class="text-white">subjects</span> only.
      </div>

      <div class="space-y-3">
        <div
          v-for="(s, i) in subjects"
          :key="s.id || 'new' + i"
          class="rounded-xl border bg-panel p-4"
          :class="s._dirty ? 'border-amber-400/50' : 'border-line'"
          @input="s._dirty = true"
        >
          <div class="grid gap-3 sm:grid-cols-[1fr_130px]">
            <label class="text-xs text-muted">Subject name<input v-model="s.name" placeholder="e.g. Art Appreciation" :class="input" class="mt-1" /></label>
            <label class="text-xs text-muted">Code<input v-model="s.code" placeholder="e.g. ARTAPP" :class="input" class="mt-1 font-mono" /></label>
          </div>
          <div class="grid gap-3 sm:grid-cols-[1fr_90px] mt-3">
            <label class="text-xs text-muted">Semester label<input v-model="s.term" :class="input" class="mt-1" /></label>
            <label class="text-xs text-muted">Order<input v-model.number="s.sort_order" type="number" :class="input" class="mt-1" /></label>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-1.5">
            <span class="text-xs text-muted mr-1">Color</span>
            <button
              v-for="c in palette"
              :key="c"
              class="size-6 rounded-full border-2 transition"
              :class="s.color === c ? 'border-white scale-110' : 'border-transparent'"
              :style="{ background: c }"
              @click="s.color = c; s._dirty = true"
            />
            <input v-model="s.color" type="color" class="size-7 cursor-pointer rounded bg-transparent" title="Custom color" />
          </div>
          <div class="mt-4 flex items-center gap-3 text-sm">
            <span class="font-mono text-xs text-muted">{{ s.id ? `/${s.slug} · ${s.modules?.[0]?.count || 0} lessons` : 'new subject' }}</span>
            <RouterLink v-if="s.id" :to="{ name: 'hallway', params: { subject: s.slug } }" class="text-muted underline hover:text-white">Open</RouterLink>
            <button class="ml-auto text-red-300 hover:underline" @click="remove(s, i)">Delete</button>
            <button class="rounded-lg bg-accent px-4 py-1.5 font-semibold text-ink disabled:opacity-40" :disabled="!s._dirty" @click="save(s)">
              {{ s.id ? 'Save' : 'Create subject' }}
            </button>
          </div>
        </div>
      </div>

      <button class="mt-3 w-full rounded-xl border-2 border-dashed border-line py-4 font-semibold text-muted hover:border-white/40 hover:text-white" @click="addSubject">
        + Add subject
      </button>

      <button class="mt-10 text-sm text-muted underline hover:text-white" @click="signOut">Log out</button>

      <div class="fixed bottom-5 right-5 space-y-2 text-sm">
        <p v-if="flash" class="rounded-lg border border-green-500/40 bg-green-500/20 px-4 py-2 text-green-200">{{ flash }}</p>
        <p v-if="error" class="max-w-sm rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-2 text-red-200">{{ error }}</p>
      </div>
    </template>
  </div>
</template>
