import { ref, watchEffect } from 'vue'

// Re-runs fn whenever reactive deps it reads (e.g. route params) change.
export function useAsync(fn) {
  const data = ref(null)
  const loading = ref(true)
  const error = ref(null)
  watchEffect(async (onCleanup) => {
    let stale = false
    onCleanup(() => (stale = true))
    loading.value = true
    error.value = null
    try {
      const result = await fn()
      if (!stale) data.value = result
    } catch (e) {
      if (!stale) error.value = e
    } finally {
      if (!stale) loading.value = false
    }
  })
  return { data, loading, error }
}
