import { ref, computed } from 'vue'
import type { User } from '@supabase/supabase-js'

export const useAuth = () => {
	const client = useSupabaseClient()
	const user = ref<User | null>(null)
	const loading = ref(true)

	const isAuthenticated = computed(() => !!user.value)
	const userId = computed(() => user.value?.id)

	const checkSession = async () => {
		try {
			const { data: { session } } = await client.auth.getSession()
			user.value = session?.user ?? null
		} catch (error) {
			console.error('Error checking session:', error)
			user.value = null
		} finally {
			loading.value = false
		}
	}

	const signIn = async (email: string, password: string) => {
		try {
			const { data, error } = await client.auth.signInWithPassword({
				email,
				password
			})
			if (error) throw error
			user.value = data.user
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
			user.value = data.user
			return { user: data.user, error: null }
		} catch (error: any) {
			return { user: null, error: error.message }
		}
	}

	const signOut = async () => {
		try {
			await client.auth.signOut()
			user.value = null
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
	if (process.client) {
		checkSession()

		// Listen for auth changes
		client.auth.onAuthStateChange((_event, session) => {
			user.value = session?.user ?? null
		})
	}

	return {
		user,
		loading,
		isAuthenticated,
		userId,
		checkSession,
		signIn,
		signUp,
		signOut,
		signInWithOAuth
	}
}

