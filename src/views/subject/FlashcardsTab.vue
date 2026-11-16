<script setup>
import { inject, computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { progress } from '@/lib/progress'
import { shuffle } from '@/lib/grade'
import ModulePicker from '@/components/ModulePicker.vue'
import EmptyContent from '@/components/EmptyContent.vue'

const subject = inject('subject')
const route = useRoute()
const router = useRouter()
const s = computed(() => subject.value)

const moduleSlug = ref(route.query.m || '')
const hideKnown = ref(false)
const deck = ref([])
const i = ref(0)
const flipped = ref(false)

function build(doShuffle = false) {
  const mod = s.value.modules.find((m) => m.slug === moduleSlug.value)
  let cards = mod ? mod.flashcards.map((c) => ({ ...c, module_id: mod.id })) : s.value.flashcards
  if (hideKnown.value) cards = cards.filter((c) => progress.flash[c.id] !== 'known')
  deck.value = doShuffle ? shuffle(cards) : cards
  i.value = 0
  flipped.value = false
}
build()
watch([moduleSlug, hideKnown], () => {
  router.replace({ query: moduleSlug.value ? { m: moduleSlug.value } : {} })
  build()
})

const card = computed(() => deck.value[i.value])
const knownCount = computed(() => deck.value.filter((c) => progress.flash[c.id] === 'known').length)

function move(d) {
  if (!deck.value.length) return
  i.value = (i.value + d + deck.value.length) % deck.value.length
  flipped.value = false
}
function mark(state) {
  if (!card.value) return
  progress.flash[card.value.id] = state
  move(1)
}
function onKey(e) {
  if (e.target.tagName === 'SELECT') return
  if (e.key === ' ') { e.preventDefault(); flipped.value = !flipped.value }
  if (e.key === 'ArrowRight') move(1)
  if (e.key === 'ArrowLeft') move(-1)
  if (e.key === '1') mark('again')
  if (e.key === '2') mark('known')
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <EmptyContent v-if="!s.flashcards.length" what="flashcards" />
  <div v-else class="max-w-2xl mx-auto">
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <ModulePicker v-model="moduleSlug" :modules="s.modules.filter((m) => m.flashcards.length)" />
      <label class="flex items-center gap-2 text-sm text-muted"><input v-model="hideKnown" type="checkbox" class="accent-current" /> Hide known</label>
      <button class="ml-auto rounded-lg border border-line px-3 py-2 text-sm hover:border-white/40" @click="build(true)">Shuffle</button>
    </div>

    <div v-if="!card" class="rounded-2xl border border-dashed border-line p-10 text-center">
      <p class="font-display text-lg font-bold">All cards known 🎉</p>
      <button class="mt-3 text-sm text-muted underline" @click="hideKnown = false">Show all again</button>
    </div>

    <template v-else>
      <button
        class="relative w-full aspect-[3/2] [perspective:1200px]"
        @click="flipped = !flipped"
      >
        <div
          class="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]"
          :class="flipped ? '[transform:rotateY(180deg)]' : ''"
        >
          <div class="absolute inset-0 grid place-items-center rounded-2xl border border-line bg-panel p-8 [backface-visibility:hidden]">
            <span class="absolute top-4 left-5 font-mono text-xs text-muted">{{ s.moduleById[card.module_id]?.title }}</span>
            <p class="font-display text-2xl sm:text-3xl font-bold text-center">{{ card.front }}</p>
            <span class="absolute bottom-4 font-mono text-xs text-muted">tap or Space to flip</span>
          </div>
          <div
            class="absolute inset-0 grid place-items-center rounded-2xl border p-8 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            :style="{ borderColor: s.color, background: s.color + '14' }"
          >
            <p class="text-lg sm:text-xl text-center leading-relaxed whitespace-pre-line">{{ card.back }}</p>
          </div>
        </div>
      </button>

      <div class="mt-4 flex items-center gap-2">
        <button class="rounded-lg border border-line px-3 py-2 text-sm" @click="move(-1)">←</button>
        <span class="font-mono text-xs text-muted">{{ i + 1 }} / {{ deck.length }} · {{ knownCount }} known</span>
        <div class="ml-auto flex gap-2">
          <button class="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10" @click="mark('again')">Again</button>
          <button class="rounded-lg px-4 py-2 text-sm font-semibold text-ink" :style="{ background: s.color }" @click="mark('known')">Got it</button>
        </div>
        <button class="rounded-lg border border-line px-3 py-2 text-sm" @click="move(1)">→</button>
      </div>
      <p class="mt-4 font-mono text-[11px] text-muted hidden sm:block">Keys: Space flip · ← → move · 1 again · 2 got it</p>
    </template>
  </div>
</template>
