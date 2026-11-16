<script setup>
import { ref, computed, onMounted } from 'vue'
import { user, signIn, signOut } from '@/lib/auth'
import { listSubjectsWithModules, importModule, deleteModule, clearCache } from '@/lib/api'
import { parseImport, slugify } from '@/lib/importFormat'
import ModuleEditor from '@/components/ModuleEditor.vue'

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
    await loadSubjects()
  } catch (e) {
    loginError.value = e.message
  } finally {
    busy.value = false
  }
}

// ---- subjects ----
const subjects = ref([])
async function loadSubjects() {
  try {
    subjects.value = await listSubjectsWithModules()
  } catch (e) {
    log.value.push({ ok: false, text: e.message })
  }
}
onMounted(() => !mock && loadSubjects())

// ---- tabs ----
const tab = ref('file') // file | notes | manage
const log = ref([])

// ---- import file ----
const text = ref('')
const replace = ref(true)
const parsed = computed(() => (text.value.trim() ? parseImport(text.value) : null))
const targetSubject = computed(() => subjects.value.find((s) => s.slug === parsed.value?.subject))

function onFile(e) {
  const f = e.target.files?.[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = () => (text.value = String(reader.result))
  reader.readAsText(f)
  e.target.value = ''
}

async function runImport() {
  const p = parsed.value
  if (!p || p.errors.length || !targetSubject.value) return
  busy.value = true
  log.value = []
  for (const m of p.modules) {
    try {
      await importModule(targetSubject.value.id, m, { replace: replace.value })
      log.value.push({ ok: true, text: `✓ ${m.title} — ${m.notes.length} notes, ${m.questions.length} questions, ${m.flashcards.length} cards` })
    } catch (e) {
      log.value.push({ ok: false, text: `✗ ${m.title}: ${e.message}` })
    }
  }
  clearCache(p.subject)
  await loadSubjects()
  busy.value = false
}

// ---- notes only ----
const nSubject = ref('')
const nModuleSlug = ref('') // '' = new module
const nTitle = ref('')
const nText = ref('')
const nModules = computed(() => subjects.value.find((s) => s.slug === nSubject.value)?.modules || [])

async function saveNotes() {
  const subj = subjects.value.find((s) => s.slug === nSubject.value)
  if (!subj || !nText.value.trim()) return
  const existing = nModules.value.find((m) => m.slug === nModuleSlug.value)
  const title = existing ? existing.title : nTitle.value.trim()
  if (!title) return
  busy.value = true
  log.value = []
  try {
    await importModule(
      subj.id,
      {
        slug: existing ? existing.slug : slugify(title),
        title,
        summary: null,
        order: existing ? existing.sort_order : nModules.value.length + 1,
        notes: [{ title: null, content: nText.value }],
        questions: [],
        flashcards: [],
      },
      { replace: true },
    )
    log.value.push({ ok: true, text: `✓ Notes saved to ${subj.name} → ${title}` })
    nText.value = ''
    clearCache(subj.slug)
    await loadSubjects()
  } catch (e) {
    log.value.push({ ok: false, text: `✗ ${e.message}` })
  } finally {
    busy.value = false
  }
}

// ---- manage ----
const editing = ref(null) // { subject, moduleId }
async function closeEditor() {
  editing.value = null
  await loadSubjects()
}
async function remove(subj, m) {
  if (!confirm(`Delete "${m.title}" from ${subj.name}? This removes its notes, questions and flashcards.`)) return
  try {
    await deleteModule(m.id)
    clearCache(subj.slug)
    await loadSubjects()
  } catch (e) {
    alert(e.message)
  }
}

const example = `{
  "subject": "art-appreciation",
  "modules": [
    {
      "title": "Lesson 1: Defining Art",
      "summary": "One-line summary",
      "order": 1,
      "notes": [{ "title": "Defining Art", "content": "Markdown **notes** here" }],
      "questions": [
        { "type": "mcq", "prompt": "…", "choices": ["A", "B", "C"], "answer": "B", "explanation": "…" },
        { "type": "true_false", "prompt": "…", "answer": true },
        { "type": "identification", "prompt": "…", "answer": ["main answer", "accepted alt"] },
        { "type": "enumeration", "prompt": "…", "answer": ["item 1", ["item 2", "alt"], "item 3"] }
      ],
      "flashcards": [{ "front": "Term", "back": "Definition" }]
    }
  ]
}`
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <p class="font-mono text-xs text-accent mb-2">ADMIN</p>
    <h1 class="font-display text-3xl font-bold tracking-tight mb-8">Import content</h1>

    <p v-if="mock" class="text-muted">Admin is disabled in mock mode.</p>

    <!-- Login -->
    <form v-else-if="!user" class="rounded-2xl border border-line bg-panel p-6 space-y-4 max-w-sm" @submit.prevent="login">
      <p class="text-sm text-muted">Owner login. Classmates don't need this; they can use everything else without an account.</p>
      <input v-model="email" type="email" required placeholder="Email" class="w-full rounded-lg border border-line bg-ink px-3 py-2" />
      <input v-model="password" type="password" required placeholder="Password" class="w-full rounded-lg border border-line bg-ink px-3 py-2" />
      <p v-if="loginError" class="text-sm text-red-300">{{ loginError }}</p>
      <button :disabled="busy" class="w-full rounded-lg bg-accent py-2 font-semibold text-ink disabled:opacity-50">Log in</button>
    </form>

    <template v-else>
      <div class="flex items-center gap-3 mb-6 text-sm">
        <span class="text-muted">Signed in as {{ user.email }}</span>
        <button class="ml-auto text-muted underline hover:text-white" @click="signOut">Sign out</button>
      </div>

      <div class="flex gap-1 border-b border-line mb-6">
        <button
          v-for="t in [{ k: 'file', l: 'Import file' }, { k: 'notes', l: 'Paste notes only' }, { k: 'manage', l: 'Manage modules' }]"
          :key="t.k"
          class="px-4 py-2 -mb-px border-b-2 text-sm"
          :class="tab === t.k ? 'border-accent text-white' : 'border-transparent text-muted hover:text-white'"
          @click="tab = t.k; log = []; editing = null"
        >{{ t.l }}</button>
      </div>

      <!-- Import file -->
      <section v-if="tab === 'file'" class="space-y-4">
        <p class="text-sm text-muted">Upload the <code class="font-mono">.json</code> file Claude gives you, or paste its contents.</p>
        <label class="inline-block cursor-pointer rounded-lg border border-line px-4 py-2 text-sm hover:border-white/40">
          Choose file…
          <input type="file" accept=".json,application/json" class="hidden" @change="onFile" />
        </label>
        <textarea v-model="text" rows="10" spellcheck="false" placeholder="…or paste JSON here" class="w-full rounded-xl border border-line bg-ink p-4 font-mono text-xs" />

        <div v-if="parsed" class="rounded-xl border border-line bg-panel p-4 text-sm space-y-2">
          <template v-if="parsed.errors.length">
            <p class="font-semibold text-red-300">Fix these first:</p>
            <ul class="list-disc pl-5 text-red-200/90 space-y-1"><li v-for="e in parsed.errors" :key="e">{{ e }}</li></ul>
          </template>
          <template v-else>
            <p v-if="!targetSubject" class="text-red-300">Unknown subject "{{ parsed.subject }}". Valid: {{ subjects.map((s) => s.slug).join(', ') }}</p>
            <template v-else>
              <p class="font-semibold">→ {{ targetSubject.name }}</p>
              <p v-for="m in parsed.modules" :key="m.slug" class="font-mono text-xs text-muted">
                {{ m.title }} · {{ m.notes.length }} notes · {{ m.questions.length }} Q · {{ m.flashcards.length }} cards
                <span v-if="targetSubject.modules.some((x) => x.slug === m.slug)" class="text-amber-300">(updates existing)</span>
              </p>
            </template>
          </template>
        </div>

        <label class="flex items-center gap-2 text-sm text-muted">
          <input v-model="replace" type="checkbox" /> Replace existing content of the same module (recommended)
        </label>
        <button
          class="rounded-lg bg-accent px-5 py-2 font-semibold text-ink disabled:opacity-40"
          :disabled="busy || !parsed || parsed.errors.length > 0 || !targetSubject"
          @click="runImport"
        >{{ busy ? 'Importing…' : 'Import' }}</button>

        <details class="text-sm">
          <summary class="cursor-pointer text-muted hover:text-white">File format</summary>
          <pre class="mt-2 rounded-xl border border-line bg-ink p-4 font-mono text-xs overflow-x-auto">{{ example }}</pre>
        </details>
      </section>

      <!-- Notes only -->
      <section v-else-if="tab === 'notes'" class="space-y-4">
        <p class="text-sm text-muted">No questions, just notes. Paste raw text and it shows under Study as-is. Existing questions in that module are kept.</p>
        <div class="grid sm:grid-cols-2 gap-3">
          <select v-model="nSubject" class="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <option value="" disabled>Subject…</option>
            <option v-for="s in subjects" :key="s.id" :value="s.slug">{{ s.name }}</option>
          </select>
          <select v-model="nModuleSlug" :disabled="!nSubject" class="rounded-lg border border-line bg-panel px-3 py-2 text-sm">
            <option value="">+ New module</option>
            <option v-for="m in nModules" :key="m.id" :value="m.slug">{{ m.title }}</option>
          </select>
        </div>
        <input v-if="!nModuleSlug" v-model="nTitle" placeholder="New module title, e.g. Lesson 2: Assumptions of Art" class="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm" />
        <textarea v-model="nText" rows="14" placeholder="Paste notes…" class="w-full rounded-xl border border-line bg-ink p-4 text-sm" />
        <button
          class="rounded-lg bg-accent px-5 py-2 font-semibold text-ink disabled:opacity-40"
          :disabled="busy || !nSubject || !nText.trim() || (!nModuleSlug && !nTitle.trim())"
          @click="saveNotes"
        >Save notes</button>
      </section>

      <!-- Manage -->
      <ModuleEditor v-else-if="editing" :module-id="editing.moduleId" :subject="editing.subject" @back="closeEditor" />
      <section v-else class="space-y-6">
        <div v-for="s in subjects" :key="s.id">
          <p class="font-semibold mb-2">{{ s.name }}</p>
          <p v-if="!s.modules.length" class="text-sm text-muted">No modules.</p>
          <div v-for="m in s.modules" :key="m.id" class="flex items-center gap-3 border-t border-line py-2 text-sm">
            <span class="font-mono text-xs text-muted w-6">{{ m.sort_order }}</span>
            <span class="flex-1">{{ m.title }}</span>
            <button class="text-xs text-accent hover:underline" @click="editing = { subject: s, moduleId: m.id }">Edit</button>
            <button class="text-xs text-red-300 hover:underline" @click="remove(s, m)">Delete</button>
          </div>
        </div>
      </section>

      <div v-if="log.length" class="mt-6 rounded-xl border border-line bg-panel p-4 font-mono text-xs space-y-1">
        <p v-for="(l, i) in log" :key="i" :class="l.ok ? 'text-green-300' : 'text-red-300'">{{ l.text }}</p>
      </div>
    </template>
  </div>
</template>
