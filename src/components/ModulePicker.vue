<script setup>
defineProps({ modules: Array, allLabel: { type: String, default: 'All modules' } })
const model = defineModel({ type: String, default: '' })
</script>

<template>
  <select
    v-model="model"
    class="rounded-lg border border-line bg-panel px-3 py-2 text-sm focus:border-accent focus:outline-none"
  >
    <option value="">{{ allLabel }}</option>
    <option v-for="m in modules" :key="m.id" :value="m.slug">{{ m.title }}</option>
  </select>
</template>
