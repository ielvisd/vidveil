<template>
	<div class="library-page">
		<!-- Top Bar -->
		<div class="top-bar">
			<UButton 
				@click="goBack" 
				icon="i-heroicons-arrow-left" 
				variant="ghost"
				size="sm"
			>
				Back
			</UButton>
			<h1>Media Library</h1>
			<UButton 
				@click="handleAddToProject" 
				:disabled="!canAddToProject"
				color="primary"
				size="sm"
			>
				Add to Project
			</UButton>
		</div>

		<!-- Stats -->
		<div class="stats-container">
			<div class="stat-card">
				<div class="stat-label">Total Files</div>
				<div class="stat-value">{{ mediaCount }}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Total Size</div>
				<div class="stat-value">{{ formatFileSize(totalSize) }}</div>
			</div>
			<div class="stat-card">
				<div class="stat-label">Selected</div>
				<div class="stat-value">{{ selectedMedia ? '1' : '0' }}</div>
			</div>
		</div>

		<!-- Media Library Component -->
		<div class="library-content">
			<LibraryMediaLibrary />
		</div>
	</div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const { mediaFiles, selectedMedia, mediaCount, totalSize } = useMedia()
const { currentProject } = useProject()
const { addClip } = useClips()

const canAddToProject = computed(() => {
	return selectedMedia.value !== null && currentProject.value !== null
})

// Debug logging
watchEffect(() => {
	console.log('Library - currentProject:', currentProject.value?.id, currentProject.value?.name)
	console.log('Library - selectedMedia:', selectedMedia.value?.name)
	console.log('Library - canAddToProject:', canAddToProject.value)
})

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B'
	
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const handleAddToProject = async () => {
	if (!selectedMedia.value || !currentProject.value) return

	try {
		await addClip(currentProject.value.id, selectedMedia.value.src, {
			name: selectedMedia.value.name,
			duration: selectedMedia.value.duration || 0,
			...selectedMedia.value.metadata
		})
		
		// Navigate back to the project editor
		await navigateTo(`/project/${currentProject.value.id}`)
	} catch (error) {
		console.error('Failed to add clip:', error)
	}
}

const goBack = () => {
	if (currentProject.value) {
		router.push(`/project/${currentProject.value.id}`)
	} else {
		router.push('/projects')
	}
}
</script>

<style scoped>
.library-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: rgb(17 24 39);
	color: white;
	overflow: hidden;
}

.top-bar {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 0.75rem 1.5rem;
	background-color: rgb(31 41 55);
	border-bottom: 1px solid rgb(55 65 81);
}

.top-bar h1 {
	flex: 1;
	font-size: 1.125rem;
	font-weight: 600;
	margin: 0;
}

.stats-container {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 1rem;
	padding: 1.5rem;
	background-color: rgb(17 24 39);
}

.stat-card {
	background-color: rgb(31 41 55);
	border-radius: 0.5rem;
	padding: 1.25rem;
	border: 1px solid rgb(55 65 81);
}

.stat-label {
	font-size: 0.875rem;
	color: rgb(156 163 175);
	margin-bottom: 0.5rem;
}

.stat-value {
	font-size: 1.875rem;
	font-weight: 700;
	color: white;
}

.library-content {
	flex: 1;
	overflow-y: auto;
	padding: 0 1.5rem 1.5rem 1.5rem;
}
</style>
