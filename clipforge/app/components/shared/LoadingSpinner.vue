<template>
	<div class="loading-spinner" :class="size">
		<div class="spinner"></div>
		<p v-if="message" class="loading-message">{{ message }}</p>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	size?: 'sm' | 'md' | 'lg'
	message?: string
}>()
</script>

<style scoped>
.loading-spinner {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1rem;
}

.spinner {
	border: 3px solid rgb(75 85 99);
	border-top-color: rgb(59 130 246);
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
}

.loading-spinner.sm .spinner {
	width: 24px;
	height: 24px;
	border-width: 2px;
}

.loading-spinner.md .spinner {
	width: 48px;
	height: 48px;
}

.loading-spinner.lg .spinner {
	width: 64px;
	height: 64px;
	border-width: 4px;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

.loading-message {
	font-size: 0.875rem;
	color: rgb(156 163 175);
	margin: 0;
}
</style>

