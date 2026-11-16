<script setup>
import { inject, computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { ui } from '@/lib/ui'
import { renderMarkdown } from '@/lib/markdown'

const subject = inject('subject')
const s = computed(() => subject.value)

const presets = { focus: 25, short: 5, long: 15 }
const phase = ref('focus')
const minutes = ref({ ...presets })
const endsAt = ref(null)
const left = ref(presets.focus * 60)
const rounds = ref(0)
const moduleSlug = ref('')
let tick

const running = computed(() => endsAt.value !== null)
const mm = computed(() => String(Math.floor(left.value / 60)).padStart(2, '0'))
const ss = computed(() => String(left.value % 60).padStart(2, '0'))
const notes = computed(() => {
  const m = s.value.modules.find((x) => x.slug === moduleSlug.value)
  return m ? m.reviews.map((r) => renderMarkdown((r.title ? `# ${r.title}\n\n` : '') + r.content)) : []
})
const baseTitle = document.title

function setPhase(p) {
  pause()
  phase.value = p
  left.value = minutes.value[p] * 60
}
function start() {
  endsAt.value = Date.now() + left.value * 1000
  tick = setInterval(update, 250)
}
function pause() {
  clearInterval(tick)
  endsAt.value = null
  document.title = baseTitle
}
function update() {
  left.value = Math.max(0, Math.round((endsAt.value - Date.now()) / 1000))
  document.title = `${mm.value}:${ss.value} · ${phase.value === 'focus' ? 'Focus' : 'Break'}`
  if (left.value === 0) {
    pause()
    beep()
    if (phase.value === 'focus') {
      rounds.value++
      setPhase(rounds.value % 4 === 0 ? 'long' : 'short')
    } else setPhase('focus')
  }
}
function beep() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator()
    o.frequency.value = 880
    o.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.4)
  } catch { /* audio blocked */ }
}
function onKey(e) {
  if (e.key === 'Escape' && ui.focus) ui.focus = false
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  pause()
  ui.focus = false
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="grid gap-8" :class="notes.length ? 'lg:grid-cols-[340px_1fr]' : ''">
    <div class="rounded-2xl border border-line bg-panel p-6 text-center self-start lg:sticky lg:top-6">
      <div class="flex justify-center gap-1 mb-6">
        <button
          v-for="(label, p) in { focus: 'Focus', short: 'Short break', long: 'Long break' }"
          :key="p"
          class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
          :class="phase === p ? 'bg-white/10 text-white' : 'text-muted hover:text-white'"
          @click="setPhase(p)"
        >{{ label }}</button>
      </div>
      <p class="font-mono text-7xl font-semibold tabular-nums" :style="{ color: phase === 'focus' ? s.color : '#e7e7ee' }">{{ mm }}:{{ ss }}</p>
      <p class="font-mono text-xs text-muted mt-2">Round {{ rounds + 1 }} · long break every 4</p>
      <div class="mt-6 flex justify-center gap-2">
        <button v-if="!running" class="rounded-lg px-6 py-2 font-semibold text-ink" :style="{ background: s.color }" @click="start">Start</button>
        <button v-else class="rounded-lg border border-line px-6 py-2 font-semibold" @click="pause">Pause</button>
        <button class="rounded-lg border border-line px-4 py-2 text-sm text-muted" @click="setPhase(phase)">Reset</button>
      </div>

      <div class="mt-6 border-t border-line pt-4 space-y-3 text-left text-sm">
        <label class="flex items-center gap-2">
          <input v-model="ui.focus" type="checkbox" />
          Distraction-free mode <span class="font-mono text-xs text-muted">(Esc to exit)</span>
        </label>
        <label class="block">
          <span class="text-muted text-xs">Notes beside the timer</span>
          <select v-model="moduleSlug" class="mt-1 w-full rounded-lg border border-line bg-ink px-3 py-2">
            <option value="">None</option>
            <option v-for="m in s.modules" :key="m.id" :value="m.slug">{{ m.title }}</option>
          </select>
        </label>
        <div class="grid grid-cols-3 gap-2">
          <label v-for="(v, p) in minutes" :key="p" class="text-xs text-muted">
            {{ p }} (min)
            <input v-model.number="minutes[p]" type="number" min="1" :disabled="running" class="mt-1 w-full rounded border border-line bg-ink px-2 py-1 text-white" @change="!running && phase === p && setPhase(p)" />
          </label>
        </div>
      </div>
    </div>

    <article v-if="notes.length">
      <div v-for="(h, i) in notes" :key="i" class="prose-nh mb-10" v-html="h" />
    </article>
  </div>
</template>
