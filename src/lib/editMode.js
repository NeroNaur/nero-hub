// Edit mode: only meaningful when logged in. OFF = see the site like a classmate.
import { reactive, computed, watch } from 'vue'
import { user } from './auth'

const KEY = 'nero-hub:edit'
let saved = false
try {
  saved = localStorage.getItem(KEY) === '1'
} catch {
  /* ignore */
}
export const editMode = reactive({ on: saved })
watch(
  () => editMode.on,
  (v) => {
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  },
)
export const canEdit = computed(() => Boolean(user.value) && editMode.on)
