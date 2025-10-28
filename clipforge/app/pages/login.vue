<template>
	<div class="login-page">
		<div class="login-container">
			<h1 class="title">ClipForge</h1>
			<p class="subtitle">Sign in to start editing</p>

			<AuthLoginForm />
		</div>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	layout: 'blank'
})
</script>

<style scoped>
.login-page {
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container {
	max-width: 400px;
	width: 100%;
	padding: 2rem;
}

.title {
	font-size: 3rem;
	font-weight: bold;
	color: white;
	text-align: center;
	margin-bottom: 0.5rem;
}

.subtitle {
	font-size: 1.25rem;
	color: rgba(255, 255, 255, 0.9);
	text-align: center;
	margin-bottom: 2rem;
}
</style>

