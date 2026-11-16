<script setup>
import { inject, computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { renderMarkdown } from '@/lib/markdown'
import { progress } from '@/lib/progress'
import EmptyContent from '@/components/EmptyContent.vue'
import MaterialsList from '@/components/MaterialsList.vue'
import { canEdit } from '@/lib/editMode'
import TermPicker from '@/components/TermPicker.vue'
import { modulesInTerm } from '@/lib/api'
import { currentTerm } from '@/lib/term'

const subject = inject('subject')
const route = useRoute()
const router = useRouter()
const s = computed(() => subject.value)
const mods = computed(() => modulesInTerm(s.value, currentTerm(s.value)))

const current = computed(
  () => mods.value.find((m) => m.slug === route.params.module) || mods.value[0],
)
const idx = computed(() => mods.value.indexOf(current.value))
const html = computed(() =>
  (current.value?.reviews || [])
    .map((r) => (r.title ? `# ${r.title}\n\n` : '') + r.content)
    .map(renderMarkdown),
)

watchEffect(() => {
  if (current.value) progress.last[s.value.slug] = { module: current.value.slug }
})
const go = (m) => router.replace({ name: 'study', params: { subject: s.value.slug, module: m.slug } })
</script>

<template>
  <TermPicker :subject="s" />
  <EmptyContent v-if="!mods.length" what="lessons in this term" />
  <div v-else class="grid gap-8 lg:grid-cols-[220px_1fr]">
    <aside class="lg:sticky lg:top-20 self-start">
      <select class="lg:hidden w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm" :value="current.slug" @change="go(mods.find((m) => m.slug === $event.target.value))">
        <option v-for="m in mods" :key="m.id" :value="m.slug">{{ m.title }}</option>
      </select>
      <ol class="hidden lg:block space-y-1">
        <li v-for="(m, i) in mods" :key="m.id">
          <button
            class="w-full text-left rounded-lg px-3 py-2 text-sm transition"
            :class="m.id === current.id ? 'bg-white/10 text-white' : 'text-muted hover:text-white'"
            @click="go(m)"
          >
            <span class="font-mono text-xs mr-2">{{ String(i + 1).padStart(2, '0') }}</span>{{ m.title }}
          </button>
        </li>
      </ol>
    </aside>

    <article>
      <h2 class="font-display text-2xl font-bold mb-6">{{ current.title }}</h2>
      <section v-if="current.materials?.length || canEdit" class="mb-8 rounded-2xl border border-line p-4">
        <p class="mb-3 font-mono text-xs text-muted">📎 MATERIALS</p>
        <MaterialsList :subject="s" :module="current" />
      </section>
      <EmptyContent v-if="!html.length" what="notes for this module" />
      <div v-for="(h, i) in html" :key="i" class="prose-nh mb-10" v-html="h" />

      <div class="flex justify-between border-t border-line pt-6 mt-6 text-sm">
        <button v-if="idx > 0" class="text-muted hover:text-white" @click="go(mods[idx - 1])">← {{ mods[idx - 1].title }}</button>
        <span v-else />
        <button v-if="idx < mods.length - 1" class="text-muted hover:text-white" @click="go(mods[idx + 1])">{{ mods[idx + 1].title }} →</button>
      </div>
    </article>
  </div>
</template>
