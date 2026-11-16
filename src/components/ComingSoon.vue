<script setup>
defineProps({ title: String, note: String })
</script>

<template>
  <div class="rounded-xl border border-dashed border-line p-10 text-center">
    <p class="font-display text-xl font-bold">{{ title }}</p>
    <p class="text-muted text-sm mt-2">{{ note }}</p>
  </div>
</template>
