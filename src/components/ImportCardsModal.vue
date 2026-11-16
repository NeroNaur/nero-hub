<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['close', 'import'])
const text = ref('')
const termSep = ref('tab') // tab | comma | custom
const termCustom = ref('')
const cardSep = ref('newline') // newline | semicolon | custom
const cardCustom = ref('')

const sepOf = (kind, custom) => ({ tab: '\t', comma: ',', newline: '\n', semicolon: ';' })[kind] ?? custom

const cards = computed(() => {
  const ts = sepOf(termSep.value, termCustom.value)
  const cs = sepOf(cardSep.value, cardCustom.value)
  if (!text.value.trim() || !ts || !cs) return []
  return text.value
    .split(cs)
    .map((chunk) => chunk.replace(/\r/g, ''))
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const at = chunk.indexOf(ts)
      return at < 0
        ? { front: chunk.trim(), back: '' }
        : { front: chunk.slice(0, at).trim(), back: chunk.slice(at + ts.length).trim() }
    })
})

// Let Tab type a real tab in the box (so you can type "term<Tab>definition").
function onKeydown(e) {
  if (e.key !== 'Tab') return
  e.preventDefault()
  const el = e.target
  const { selectionStart: a, selectionEnd: b } = el
  text.value = text.value.slice(0, a) + '\t' + text.value.slice(b)
  requestAnimationFrame(() => (el.selectionStart = el.selectionEnd = a + 1))
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" @click.self="emit('close')">
    <div class="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-line bg-panel p-6">
      <div class="flex items-start mb-3">
        <p class="text-sm"><span class="font-semibold">Import your data.</span> <span class="text-muted">Copy and paste your data here (from Word, Excel, Google Docs, etc.)</span></p>
        <button class="ml-auto grid place-items-center size-8 rounded-full bg-white/10 hover:bg-white/20" @click="emit('close')">✕</button>
      </div>
      <textarea
        v-model="text"
        rows="8"
        spellcheck="false"
        :placeholder="'Word 1\tDefinition 1\nWord 2\tDefinition 2\nWord 3\tDefinition 3'"
        class="w-full rounded-lg border border-white/30 bg-ink p-3 font-mono text-sm focus:border-white/60 focus:outline-none"
        @keydown="onKeydown"
      />

      <div class="mt-4 grid sm:grid-cols-2 gap-6 text-sm">
        <fieldset>
          <legend class="font-semibold mb-2">Between term and definition</legend>
          <label class="flex items-center gap-2 py-1"><input v-model="termSep" type="radio" value="tab" /> Tab</label>
          <label class="flex items-center gap-2 py-1"><input v-model="termSep" type="radio" value="comma" /> Comma</label>
          <label class="flex items-center gap-2 py-1">
            <input v-model="termSep" type="radio" value="custom" />
            <input v-model="termCustom" placeholder="Custom" class="rounded border border-line bg-ink px-2 py-1 w-40" @focus="termSep = 'custom'" />
          </label>
        </fieldset>
        <fieldset>
          <legend class="font-semibold mb-2">Between cards</legend>
          <label class="flex items-center gap-2 py-1"><input v-model="cardSep" type="radio" value="newline" /> New line</label>
          <label class="flex items-center gap-2 py-1"><input v-model="cardSep" type="radio" value="semicolon" /> Semicolon</label>
          <label class="flex items-center gap-2 py-1">
            <input v-model="cardSep" type="radio" value="custom" />
            <input v-model="cardCustom" placeholder="Custom" class="rounded border border-line bg-ink px-2 py-1 w-40" @focus="cardSep = 'custom'" />
          </label>
        </fieldset>
      </div>

      <div class="mt-5">
        <p class="font-display text-lg font-bold">Preview <span class="text-sm font-normal text-muted">{{ cards.length }} cards</span></p>
        <p v-if="!cards.length" class="text-sm text-muted">Nothing to preview yet.</p>
        <div v-else class="mt-2 max-h-64 overflow-y-auto space-y-1.5">
          <div v-for="(c, k) in cards" :key="k" class="grid grid-cols-[2rem_1fr_1fr] gap-3 rounded-lg bg-ink px-3 py-2 text-sm">
            <span class="font-mono text-xs text-muted">{{ k + 1 }}</span>
            <span>{{ c.front || '—' }}</span>
            <span :class="c.back ? '' : 'text-red-300'">{{ c.back || '(no definition)' }}</span>
          </div>
        </div>
      </div>

      <div class="mt-5 flex justify-end">
        <button class="rounded-lg bg-accent px-5 py-2 font-semibold text-ink disabled:opacity-40" :disabled="!cards.length" @click="emit('import', cards)">
          Import {{ cards.length || '' }} cards
        </button>
      </div>
    </div>
  </div>
</template>
