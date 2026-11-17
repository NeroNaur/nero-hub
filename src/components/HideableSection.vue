<script setup>
// A Hallway section the owner can show/hide for everyone (saved per subject).
import { computed, inject, ref } from 'vue'
import { canEdit } from '@/lib/editMode'
import { saveSubjectSettings, clearCache } from '@/lib/api'

const props = defineProps({ subject: Object, id: String, label: String })
const reloadSubject = inject('reloadSubject')
const hidden = computed(() => props.subject.settings?.hallway?.[props.id] === false)
const busy = ref(false)

async function toggle() {
  busy.value = true
  const settings = JSON.parse(JSON.stringify(props.subject.settings || {})) // plain copy (Vue proxies can't be structuredClone'd)
  settings.hallway ||= {}
  settings.hallway[props.id] = hidden.value // was hidden → show (true), was shown → hide (false)
  try {
    await saveSubjectSettings(props.subject.id, settings)
    clearCache(props.subject.slug)
    await reloadSubject()
  } catch (e) {
    alert(e.message)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section v-if="!hidden || canEdit" class="relative mb-8" :class="hidden && 'rounded-xl border border-dashed border-line p-3 opacity-40'">
    <div v-if="canEdit" class="mb-2 flex items-center gap-2">
      <span class="font-mono text-[11px] uppercase text-muted">{{ label }}</span>
      <span v-if="hidden" class="rounded bg-white/10 px-1.5 font-mono text-[10px] uppercase">Hidden</span>
      <button
        class="ml-auto rounded-md border border-dashed border-accent/60 px-2 py-0.5 font-mono text-[11px] text-accent hover:bg-accent/10 disabled:opacity-50"
        :disabled="busy"
        :title="hidden ? 'Show this section to everyone' : 'Hide this section from everyone'"
        @click="toggle"
      >{{ hidden ? '👁 Show' : '🙈 Hide' }}</button>
    </div>
    <slot />
  </section>
</template>
