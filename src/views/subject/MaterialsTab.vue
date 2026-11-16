<script setup>
import { inject, computed, ref } from 'vue'
import { TERMS } from '@/lib/api'
import { KINDS } from '@/lib/materials'
import { canEdit } from '@/lib/editMode'
import MaterialsList from '@/components/MaterialsList.vue'

const subject = inject('subject')
const s = computed(() => subject.value)
const termFilter = ref('all')
const kindFilter = ref('all')

const groups = computed(() =>
  TERMS.filter((t) => termFilter.value === 'all' || termFilter.value === t.key)
    .map((t) => ({
      ...t,
      lessons: s.value.modules
        .filter((m) => m.term === t.key)
        .map((m) => ({ m, items: m.materials.filter((x) => kindFilter.value === 'all' || x.kind === kindFilter.value) }))
        .filter((l) => l.items.length || (canEdit.value && kindFilter.value === 'all')),
    }))
    .filter((g) => g.lessons.length),
)
const total = computed(() => s.value.modules.reduce((n, m) => n + m.materials.length, 0))
const countKind = (k) => s.value.modules.reduce((n, m) => n + m.materials.filter((x) => k === 'all' || x.kind === k).length, 0)
const chip = 'rounded-full border px-3 py-1 text-xs font-semibold transition'
</script>

<template>
  <p v-if="s.needsMaterials" class="mb-6 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
    Materials need <code>supabase/004_lesson_materials.sql</code> to be run in Supabase.
  </p>

  <div class="mb-3 flex flex-wrap gap-1.5">
    <button
      v-for="t in [{ key: 'all', label: 'All terms' }, ...TERMS]"
      :key="t.key"
      :class="[chip, termFilter === t.key ? 'border-transparent text-ink' : 'border-line text-muted hover:text-white']"
      :style="termFilter === t.key ? { background: s.color } : {}"
      @click="termFilter = t.key"
    >{{ t.label }}</button>
  </div>
  <div class="mb-8 flex flex-wrap gap-1.5">
    <button
      v-for="k in [{ key: 'all', label: 'All types', icon: '' }, ...KINDS]"
      :key="k.key"
      :class="[chip, kindFilter === k.key ? 'border-white bg-white/10 text-white' : 'border-line text-muted hover:text-white']"
      @click="kindFilter = k.key"
    >{{ k.icon }} {{ k.label }} <span class="font-mono opacity-60">{{ countKind(k.key) }}</span></button>
  </div>

  <div v-if="!groups.length" class="rounded-xl border border-dashed border-line p-10 text-center">
    <p class="font-display text-lg font-bold">{{ total ? 'Nothing matches this filter' : 'No materials yet' }}</p>
    <p v-if="!total" class="mt-2 text-sm text-muted">PDFs, docs, slides and video links for each lesson will show up here.</p>
  </div>

  <section v-for="g in groups" :key="g.key" class="mb-10">
    <h2 class="mb-4 flex items-center gap-3 font-display text-2xl font-bold">
      <span class="rounded-lg px-3 py-0.5 text-base text-ink" :style="{ background: s.color }">{{ g.label }}</span>
    </h2>
    <div class="space-y-6 border-l-2 border-line pl-4 sm:pl-6">
      <div v-for="l in g.lessons" :key="l.m.id">
        <div class="mb-2 flex items-baseline gap-3">
          <h3 class="font-semibold">{{ l.m.title }}</h3>
          <RouterLink :to="{ name: 'study', params: { subject: s.slug, module: l.m.slug } }" class="font-mono text-xs text-muted hover:text-white">notes →</RouterLink>
        </div>
        <MaterialsList :subject="s" :module="l.m" :items="l.items" />
      </div>
    </div>
  </section>
</template>
