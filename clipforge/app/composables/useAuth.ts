import { ref, computed } from 'vue'
import type { User } from '@supabase/supabase-js'

// Global singleton state
const globalUser = ref<User | null>(null)
const globalLoading = ref(true)

export const useAuth = () => {
	const client = useSupabaseClient()

	const isAuthenticated = computed(() => !!globalUser.value)
	const userId = computed(() => globalUser.value?.id)

	const checkSession = async () => {
		try {
			const { data: { session } } = await client.auth.getSession()
			globalUser.value = session?.user ?? null
		} catch (error) {
			console.error('Error checking session:', error)
			globalUser.value = null
		} finally {
			globalLoading.value = false
		}
	}

	const signIn = async (email: string, password: string) => {
		try {
			const { data, error } = await client.auth.signInWithPassword({
				email,
				password
			})
			if (error) throw error
			globalUser.value = data.user
			// Refresh session to ensure persistence
			await checkSession()
			return { user: data.user, error: null }
		} catch (error: any) {
			return { user: null, error: error.message }
		}
	}

	const signUp = async (email: string, password: string) => {
		try {
			const { data, error } = await client.auth.signUp({
				email,
				password
			})
			if (error) throw error
			globalUser.value = data.user
			return { user: data.user, error: null }
		} catch (error: any) {
			return { user: null, error: error.message }
		}
	}

	const signOut = async () => {
		try {
			await client.auth.signOut()
			globalUser.value = null
			await navigateTo('/')
		} catch (error: any) {
			console.error('Error signing out:', error)
		}
	}

	const signInWithOAuth = async (provider: 'github' | 'google') => {
		try {
			const { error } = await client.auth.signInWithOAuth({
				provider,
				options: {
					redirectTo: `${window.location.origin}/auth/callback`
				}
			})
			if (error) throw error
		} catch (error: any) {
			console.error('Error with OAuth:', error)
			return error.message
		}
	}

	// Initialize on mount
	if (process.client && globalLoading.value) {
		checkSession()

		// Listen for auth changes
		client.auth.onAuthStateChange((_event, session) => {
			globalUser.value = session?.user ?? null
		})
	}

	return {
		user: globalUser,
		loading: globalLoading,
		isAuthenticated,
		userId,
		checkSession,
		signIn,
		signUp,
		signOut,
		signInWithOAuth
	}
}

