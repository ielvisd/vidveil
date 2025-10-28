<template>
	<UCard>
		<template #header>
			<h2 class="text-2xl font-bold">Sign In to VidVeil</h2>
		</template>

		<div class="form-field">
			<label class="label">Email</label>
			<UInput v-model="email" type="email" placeholder="your@email.com" class="mb-4" />
		</div>

		<div class="form-field">
			<label class="label">Password</label>
			<UInput v-model="password" type="password" placeholder="••••••••" class="mb-4" />
		</div>

		<div class="flex gap-2">
			<UButton @click="handleSignIn" :loading="loading" block>
				Sign In
			</UButton>
			<UButton @click="handleSignUp" :loading="loading" block variant="outline">
				Sign Up
			</UButton>
		</div>

		<div class="mt-4">
			<div class="text-center text-sm text-gray-500 mb-2">Or continue with:</div>
			<div class="flex gap-2">
				<UButton @click="handleOAuth('github')" icon="i-simple-icons-github" block>
					GitHub
				</UButton>
				<UButton @click="handleOAuth('google')" icon="i-simple-icons-google" block>
					Google
				</UButton>
			</div>
		</div>

		<UAlert v-if="error" color="red" :title="error" />
	</UCard>
</template>

<style scoped>
.label {
	display: block;
	font-weight: 500;
	margin-bottom: 0.5rem;
	color: rgb(17 24 39);
}

.form-field {
	margin-bottom: 1rem;
}
</style>


<script setup lang="ts">
const { signIn, signUp, signInWithOAuth } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleSignIn = async () => {
	if (!email.value || !password.value) {
		error.value = 'Please fill in all fields'
		return
	}

	loading.value = true
	error.value = ''
	
	const result = await signIn(email.value, password.value)
	
	if (result.error) {
		error.value = result.error
	} else {
		await navigateTo('/projects')
	}
	
	loading.value = false
}

const handleSignUp = async () => {
	if (!email.value || !password.value) {
		error.value = 'Please fill in all fields'
		return
	}

	loading.value = true
	error.value = ''
	
	const result = await signUp(email.value, password.value)
	
	if (result.error) {
		error.value = result.error
	} else {
		await navigateTo('/projects')
	}
	
	loading.value = false
}

const handleOAuth = async (provider: 'github' | 'google') => {
	loading.value = true
	error.value = ''
	
	try {
		await signInWithOAuth(provider)
	} catch (err: any) {
		error.value = err.message || 'OAuth sign-in failed'
	}
	
	loading.value = false
}
</script>

