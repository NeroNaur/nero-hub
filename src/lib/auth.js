import { ref } from 'vue'
import { supabase } from './supabase'

export const user = ref(null)
if (supabase) {
  supabase.auth.getSession().then(({ data }) => (user.value = data.session?.user ?? null))
  supabase.auth.onAuthStateChange((_e, session) => (user.value = session?.user ?? null))
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}
export const signOut = () => supabase.auth.signOut()
