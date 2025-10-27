<template>
	<UContainer>
		<div class="library-page">
			<div class="header">
				<h1 class="text-3xl font-bold">Media Library</h1>
				<UButton @click="handleAddToProject" :disabled="!canAddToProject" icon="i-heroicons-plus">
					Add to Project
				</UButton>
			</div>

			<div class="stats">
				<UCard>
					<p class="text-sm text-gray-500">Total Files</p>
					<p class="text-2xl font-bold">{{ mediaCount }}</p>
				</UCard>
				<UCard>
					<p class="text-sm text-gray-500">Total Size</p>
					<p class="text-2xl font-bold">{{ formatFileSize(totalSize) }}</p>
				</UCard>
			</div>

			<MediaLibrary />
		</div>
	</UContainer>
</template>

<script setup lang="ts">
definePageMeta({
	requiresAuth: true
})

const { mediaFiles, selectedMedia, mediaCount, totalSize, clearMedia } = useMedia()
const { currentProject, updateProject } = useProject()

const canAddToProject = computed(() => {
	return selectedMedia.value !== null && currentProject.value !== null
})

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes'
	
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const handleAddToProject = async () => {
	if (!selectedMedia.value || !currentProject.value) return

	// Add clip to project logic would go here
	// For now just navigate back
	await navigateTo('/editor')
}
</script>

<style scoped>
.library-page {
	@apply py-8;
}

.header {
	@apply flex justify-between items-center mb-6;
}

.stats {
	@apply grid grid-cols-2 gap-4 mb-6;
}
</style>

