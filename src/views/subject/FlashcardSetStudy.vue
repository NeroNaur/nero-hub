<script setup>
import { inject, computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { progress } from '@/lib/progress'
import { shuffle as shuffled } from '@/lib/grade'
import { user } from '@/lib/auth'

const subject = inject('subject')
const route = useRoute()
const router = useRouter()
const s = computed(() => subject.value)
const set = computed(() => s.value.sets.find((x) => x.id === route.params.set))
const prefs = progress.cardPrefs

// ---------- deck ----------
const order = ref([]) // card ids for this round
const i = ref(0)
const flipped = ref(false)
const roundDone = ref(false)
const roundStats = ref({ know: 0, learning: 0 })

const cardById = computed(() => Object.fromEntries((set.value?.flashcards || []).map((c) => [c.id, c])))
const pool = computed(() => (set.value?.flashcards || []).filter((c) => !prefs.starredOnly || progress.stars[c.id]))

function build({ onlyLearning = false } = {}) {
  let cards = pool.value
  if (prefs.track) cards = cards.filter((c) => (onlyLearning ? progress.flash[c.id] === 'again' : progress.flash[c.id] !== 'known'))
  const ids = cards.map((c) => c.id)
  order.value = prefs.shuffle ? shuffled(ids) : ids
  i.value = 0
  flipped.value = false
  roundDone.value = prefs.track && pool.value.length > 0 && ids.length === 0
  roundStats.value = { know: 0, learning: 0 }
}
build()
watch(() => [prefs.track, prefs.starredOnly, set.value?.id], () => build())

const card = computed(() => cardById.value[order.value[i.value]])
const knownCount = computed(() => pool.value.filter((c) => progress.flash[c.id] === 'known').length)
const learningCount = computed(() => pool.value.filter((c) => progress.flash[c.id] === 'again').length)

// which side is showing
const side = computed(() => {
  const termFirst = prefs.front === 'term'
  const showTerm = flipped.value ? !termFirst : termFirst
  return showTerm
    ? { label: 'Term', text: card.value?.front, image: card.value?.front_image }
    : { label: 'Definition', text: card.value?.back, image: card.value?.back_image }
})
const textSize = computed(() => {
  const n = (side.value.text || '').length
  return n > 220 ? 'text-base' : n > 120 ? 'text-lg' : n > 50 ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'
})

// ---------- actions ----------
function go(d) {
  stopPlay()
  const n = i.value + d
  if (n < 0) return
  if (n >= order.value.length) {
    if (prefs.track) roundDone.value = true
    return
  }
  i.value = n
  flipped.value = false
}
function flip() {
  if (card.value) flipped.value = !flipped.value
}
function mark(state) {
  if (!card.value) return
  progress.flash[card.value.id] = state === 'know' ? 'known' : 'again'
  roundStats.value[state]++
  if (i.value >= order.value.length - 1) roundDone.value = true
  else {
    i.value++
    flipped.value = false
  }
}
function toggleStar() {
  if (!card.value) return
  const id = card.value.id
  if (progress.stars[id]) delete progress.stars[id]
  else progress.stars[id] = true
}
function toggleShuffle() {
  prefs.shuffle = !prefs.shuffle
  const current = order.value[i.value]
  const rest = order.value.filter((id, k) => k !== i.value)
  order.value = prefs.shuffle ? [current, ...shuffled(rest)].filter(Boolean) : (set.value.flashcards.map((c) => c.id).filter((id) => order.value.includes(id)))
  i.value = prefs.shuffle ? 0 : Math.max(0, order.value.indexOf(current))
}
function restart() {
  for (const c of set.value.flashcards) {
    delete progress.flash[c.id]
    delete progress.stars[c.id]
  }
  showOptions.value = false
  build()
}
function askRestart() {
  if (window.confirm('Reset progress and stars for this set?')) restart()
}
const edit = () => user.value && router.push({ name: 'flashcards-edit', params: { subject: s.value.slug, set: set.value.id } })

// ---------- autoplay ----------
const playing = ref(false)
let playTimer
function startPlay() {
  playing.value = true
  playTimer = setInterval(() => {
    if (!flipped.value) flipped.value = true
    else if (i.value < order.value.length - 1) {
      i.value++
      flipped.value = false
    } else stopPlay()
  }, 3000)
}
function stopPlay() {
  playing.value = false
  clearInterval(playTimer)
}
const togglePlay = () => (playing.value ? stopPlay() : startPlay())

// ---------- text to speech ----------
const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
function speak() {
  if (!canSpeak || !side.value.text) return
  speechSynthesis.cancel()
  speechSynthesis.speak(new SpeechSynthesisUtterance(side.value.text))
}
watch([card, flipped], () => prefs.tts && speak())

// ---------- fullscreen ----------
const stage = ref(null)
const isFull = ref(false)
function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen()
  else stage.value?.requestFullscreen?.()
}
const onFull = () => (isFull.value = Boolean(document.fullscreenElement))

// ---------- options ----------
const showOptions = ref(false)
const showKeys = ref(false)
const shortcuts = [
  ['Previous', '←'], ['Next', '→'], ['Play', 'P'], ['Flip', 'Space'], ['Star', 'S'], ['Edit', 'E'],
  ['Shuffle', 'H'], ['Audio', 'A'], ['Answer with term', 'T'], ['Answer with definition', 'D'],
]

function onKey(e) {
  if (e.key === 'Escape') return (showOptions.value = false)
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
  if (showOptions.value || roundDone.value) return
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  const map = {
    ArrowLeft: () => (prefs.track ? mark('learning') : go(-1)),
    ArrowRight: () => (prefs.track ? mark('know') : go(1)),
    ' ': flip,
    p: togglePlay,
    s: toggleStar,
    e: edit,
    h: toggleShuffle,
    a: speak,
    t: () => { prefs.front = 'term'; flipped.value = false },
    d: () => { prefs.front = 'definition'; flipped.value = false },
  }
  if (map[k]) {
    e.preventDefault()
    map[k]()
  }
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.addEventListener('fullscreenchange', onFull)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', onFull)
  stopPlay()
  if (canSpeak) speechSynthesis.cancel()
})
</script>

<template>
  <div v-if="!set" class="text-muted">Set not found. <RouterLink :to="{ name: 'flashcards', params: { subject: s.slug } }" class="text-accent">Back</RouterLink></div>

  <div v-else class="max-w-3xl mx-auto">
    <div class="flex items-start gap-3 mb-5">
      <div class="flex-1">
        <RouterLink :to="{ name: 'flashcards', params: { subject: s.slug } }" class="font-mono text-xs text-muted hover:text-white">← All sets</RouterLink>
        <h2 class="font-display text-2xl font-bold mt-1">{{ set.title }}</h2>
        <p v-if="set.description" class="text-sm text-muted">{{ set.description }}</p>
      </div>
      <RouterLink v-if="user" :to="{ name: 'flashcards-edit', params: { subject: s.slug, set: set.id } }" class="rounded-md border border-dashed border-accent/60 px-3 py-1 font-mono text-xs text-accent hover:bg-accent/10">✏️ Edit set</RouterLink>
    </div>

    <div ref="stage" class="flex flex-col" :class="isFull ? 'bg-ink p-6 sm:p-10 h-screen' : ''">
      <!-- empty -->
      <div v-if="!pool.length" class="rounded-2xl border border-dashed border-line p-10 text-center">
        <p class="font-display text-lg font-bold">{{ prefs.starredOnly ? 'No starred cards' : 'This set has no cards yet' }}</p>
        <button v-if="prefs.starredOnly" class="mt-3 text-sm text-muted underline" @click="prefs.starredOnly = false">Show all cards</button>
      </div>

      <!-- round summary (track progress) -->
      <div v-else-if="roundDone" class="rounded-2xl border border-line bg-panel p-8 text-center">
        <p class="font-display text-2xl font-bold">{{ learningCount ? 'Nice work, keep going' : 'You know them all 🎉' }}</p>
        <div class="mt-6 flex justify-center gap-8">
          <div><p class="font-display text-4xl font-bold" :style="{ color: s.color }">{{ knownCount }}</p><p class="text-sm text-muted">Know</p></div>
          <div><p class="font-display text-4xl font-bold text-orange-300">{{ learningCount }}</p><p class="text-sm text-muted">Still learning</p></div>
        </div>
        <div class="mt-6 flex flex-wrap justify-center gap-2">
          <button v-if="learningCount" class="rounded-lg px-5 py-2 font-semibold text-ink" :style="{ background: s.color }" @click="build({ onlyLearning: true })">
            Keep reviewing {{ learningCount }} still learning
          </button>
          <button class="rounded-lg border border-line px-5 py-2 text-sm" @click="restart">Restart flashcards</button>
        </div>
      </div>

      <template v-else-if="card">
        <!-- track progress counters -->
        <div v-if="prefs.track" class="flex justify-between mb-3 text-sm">
          <span class="rounded-full border border-orange-400/50 px-3 py-0.5 text-orange-300">{{ learningCount }} Still learning</span>
          <span class="rounded-full border px-3 py-0.5" :style="{ borderColor: s.color, color: s.color }">{{ knownCount }} Know</span>
        </div>

        <!-- card -->
        <button
          class="relative w-full rounded-2xl border bg-panel p-8 sm:p-12 text-center transition hover:border-white/30 flex flex-col items-center justify-center gap-5"
          :class="[isFull ? 'flex-1' : 'min-h-[340px] sm:min-h-[400px]', flipped ? 'border-white/20' : 'border-line']"
          :style="flipped ? { background: s.color + '10' } : {}"
          @click="flip"
        >
          <span class="absolute top-4 left-5 font-mono text-xs text-muted">{{ side.label }}</span>
          <span
            role="button"
            class="absolute top-3 right-4 text-xl leading-none transition"
            :class="progress.stars[card.id] ? 'text-yellow-300' : 'text-muted hover:text-white'"
            title="Star (S)"
            @click.stop="toggleStar"
          >{{ progress.stars[card.id] ? '★' : '☆' }}</span>
          <img v-if="side.image" :src="side.image" alt="" class="max-h-56 max-w-full rounded-lg object-contain" />
          <p v-if="side.text" class="leading-snug whitespace-pre-line" :class="[textSize, side.label === 'Term' ? 'font-display font-bold' : '']">{{ side.text }}</p>
          <span class="absolute bottom-3 font-mono text-[11px] text-muted">click or Space to flip</span>
        </button>

        <!-- track progress buttons -->
        <div v-if="prefs.track" class="mt-4 grid grid-cols-2 gap-3">
          <button class="rounded-xl border border-orange-400/50 py-3 font-semibold text-orange-300 hover:bg-orange-400/10" @click="mark('learning')">✕ Still learning</button>
          <button class="rounded-xl py-3 font-semibold text-ink" :style="{ background: s.color }" @click="mark('know')">✓ Know</button>
        </div>

        <!-- control bar -->
        <div class="mt-4 flex items-center gap-2">
          <button class="grid place-items-center size-11 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30" :disabled="i === 0" title="Previous (←)" @click="go(-1)">←</button>
          <span class="font-mono text-sm w-16 text-center">{{ i + 1 }} / {{ order.length }}</span>
          <button class="grid place-items-center size-11 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30" :disabled="!prefs.track && i >= order.length - 1" title="Next (→)" @click="go(1)">→</button>

          <div class="ml-auto flex items-center gap-1.5">
            <button class="grid place-items-center size-10 rounded-full hover:bg-white/10" :title="playing ? 'Pause (P)' : 'Play (P)'" @click="togglePlay">
              <svg v-if="!playing" class="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z" /></svg>
              <svg v-else class="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
            </button>
            <button
              class="grid place-items-center size-10 rounded-full transition"
              :class="prefs.shuffle ? 'ring-2 text-white' : 'hover:bg-white/10'"
              :style="prefs.shuffle ? { '--tw-ring-color': s.color, background: s.color + '25' } : {}"
              title="Shuffle (H)"
              @click="toggleShuffle"
            >
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
            </button>
            <button class="grid place-items-center size-10 rounded-full hover:bg-white/10" title="Options" @click="showOptions = true">
              <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
            </button>
            <button class="grid place-items-center size-10 rounded-full hover:bg-white/10" title="Fullscreen" @click="toggleFull">
              <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- options panel -->
    <div v-if="showOptions" class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" @click.self="showOptions = false">
      <div class="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-panel p-6">
        <div class="flex items-center mb-6">
          <h3 class="font-display text-2xl font-bold">Options</h3>
          <button class="ml-auto grid place-items-center size-9 rounded-full bg-white/10 hover:bg-white/20" @click="showOptions = false">✕</button>
        </div>

        <label class="flex items-center gap-4 py-3 cursor-pointer">
          <div class="flex-1">
            <p class="font-semibold">Track progress</p>
            <p class="text-sm text-muted">Sort cards into what you know and what you're still learning. Turn off to quickly flip through.</p>
          </div>
          <input v-model="prefs.track" type="checkbox" class="toggle" />
        </label>
        <label class="flex items-center gap-4 py-3 cursor-pointer">
          <p class="flex-1 font-semibold">Study only starred terms</p>
          <input v-model="prefs.starredOnly" type="checkbox" class="toggle" />
        </label>
        <div class="flex items-center gap-4 py-3">
          <p class="flex-1 font-semibold">Front</p>
          <select v-model="prefs.front" class="rounded-full border border-line bg-ink px-4 py-1.5 text-sm" @change="flipped = false">
            <option value="term">Term</option>
            <option value="definition">Definition</option>
          </select>
        </div>

        <div class="border-t border-line mt-2 py-3">
          <button class="flex w-full items-center font-semibold" @click="showKeys = !showKeys">
            Keyboard shortcuts <span class="ml-auto text-sm" :style="{ color: s.color }">{{ showKeys ? 'Hide ▴' : 'View ▾' }}</span>
          </button>
          <div v-if="showKeys" class="mt-3 grid grid-cols-2 gap-x-6">
            <div v-for="[label, key] in shortcuts" :key="label" class="flex items-center justify-between border-b border-line py-2 text-sm">
              <span>{{ label }}</span><kbd class="rounded border border-white/30 px-1.5 font-mono text-xs">{{ key }}</kbd>
            </div>
          </div>
          <p class="mt-2 text-xs text-muted">With Track progress on, ← marks "Still learning" and → marks "Know".</p>
        </div>

        <label class="flex items-center gap-4 border-t border-line py-3 cursor-pointer" :class="!canSpeak && 'opacity-40'">
          <div class="flex-1">
            <p class="font-semibold">Text to speech</p>
            <p class="text-xs text-muted">Reads each card aloud. Press A any time to hear the current side.</p>
          </div>
          <input v-model="prefs.tts" type="checkbox" class="toggle" :disabled="!canSpeak" />
        </label>

        <button class="border-t border-line w-full py-4 text-left font-semibold text-red-300 hover:text-red-200" @click="askRestart">
          Restart Flashcards
        </button>
      </div>
    </div>
  </div>
</template>
