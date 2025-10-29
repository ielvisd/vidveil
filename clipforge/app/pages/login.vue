<template>
	<div class="login-page min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
		<!-- Background gradients -->
		<div class="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-black to-black" />
		<div class="absolute top-0 right-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
		<div class="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
		
		<UContainer class="relative z-10 px-4">
			<UCard class="max-w-md w-full mx-auto bg-zinc-900/90 backdrop-blur-md border-zinc-800 shadow-2xl">
				<template #header>
					<div class="text-center">
						<div class="flex items-center justify-center gap-3 mb-4">
							<UIcon name="i-lucide-video" class="w-10 h-10 text-pink-500" />
							<h1 class="text-4xl font-bold text-white">VidVeil</h1>
						</div>
						<p class="text-gray-400 text-lg">Sign in to start editing</p>
					</div>
				</template>
				
				<div class="py-6">
					<AuthLoginForm />
				</div>
			</UCard>
		</UContainer>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	layout: 'blank'
})
</script>

