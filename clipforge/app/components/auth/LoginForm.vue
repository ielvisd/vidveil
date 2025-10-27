<template>
	<UCard>
		<template #header>
			<h2 class="text-2xl font-bold">Sign In to ClipForge</h2>
		</template>

		<UFormGroup label="Email" name="email" class="mb-4">
			<UInput v-model="email" type="email" placeholder="your@email.com" />
		</UFormGroup>

		<UFormGroup label="Password" name="password" class="mb-4">
			<UInput v-model="password" type="password" placeholder="••••••••" />
		</UFormGroup>

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
	const { user, error: err } = await signIn(email.value, password.value)
	
	if (err) {
		error.value = err
	} else {
		await navigateTo('/library')
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
	const { user, error: err } = await signUp(email.value, password.value)
	
	if (err) {
		error.value = err
	} else {
		await navigateTo('/library')
	}
	
	loading.value = false
}

const handleOAuth = async (provider: 'github' | 'google') => {
	await signInWithOAuth(provider)
}
</script>

