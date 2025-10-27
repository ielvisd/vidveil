<template>
	<div class="callback-page">
		<div class="spinner" v-if="processing">
			<p>Completing sign-in...</p>
		</div>
		<div v-else-if="error" class="error">
			<UAlert color="red" :title="error" />
			<UButton to="/login" class="mt-4">Back to Login</UButton>
		</div>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	layout: 'blank'
})

const route = useRoute()
const processing = ref(true)
const error = ref('')

onMounted(async () => {
	try {
		const supabase = useSupabaseClient()
		
		// Get hash from URL (Supabase OAuth redirect)
		const hash = route.hash
		
		if (hash) {
			// Parse the hash for tokens
			const params = new URLSearchParams(hash.substring(1))
			const access_token = params.get('access_token')
			const refresh_token = params.get('refresh_token')
			
			if (access_token) {
				// Set the session using the tokens
				const { data, error: sessionError } = await supabase.auth.setSession({
					access_token,
					refresh_token: refresh_token || ''
				})
				
				if (sessionError) throw sessionError
				
				// Redirect to projects after successful auth
				await navigateTo('/projects')
				return
			}
		}
		
		// Try to get session
		const { data: { session }, error: sessionError } = await supabase.auth.getSession()
		
		if (sessionError) throw sessionError
		
		if (session) {
			await navigateTo('/projects')
		} else {
			error.value = 'No session found'
		}
	} catch (err: any) {
		error.value = err.message || 'Failed to complete sign-in'
		console.error('Callback error:', err)
	} finally {
		processing.value = false
	}
})
</script>

<style scoped>
.callback-page {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.spinner {
	text-align: center;
	color: white;
}

.error {
	text-align: center;
	color: white;
}
</style>

