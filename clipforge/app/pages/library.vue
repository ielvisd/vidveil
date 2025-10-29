<template>
	<div class="library-page min-h-screen bg-black flex flex-col">
		<!-- Top Bar -->
		<div class="bg-zinc-900/50 border-b border-zinc-800 px-4 md:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<UButton 
						@click="goBack" 
						icon="i-lucide-arrow-left" 
						variant="ghost"
						size="sm"
						class="text-gray-300 hover:text-pink-500"
					>
						<span class="hidden sm:inline">Back</span>
					</UButton>
					<div>
						<h1 class="text-xl md:text-2xl font-bold text-white">Media Library</h1>
						<p class="text-sm text-gray-400 hidden sm:block">Browse and select media files</p>
					</div>
				</div>
				<UButton 
					@click="handleAddToProject" 
					:disabled="!canAddToProject || adding"
					:loading="adding"
					color="primary"
					size="sm"
					icon="i-lucide-plus"
				>
					<span class="hidden sm:inline">{{ adding ? 'Adding...' : 'Add to Project' }}</span>
					<span class="sm:hidden">Add</span>
				</UButton>
			</div>
		</div>

		<!-- Stats -->
		<div class="grid grid-cols-3 gap-4 px-4 md:px-6 lg:px-8 py-6 bg-zinc-900/30 border-b border-zinc-800">
			<UCard class="bg-zinc-900/50 border-zinc-800 text-center">
				<div class="text-xs text-gray-400 mb-1">Total Files</div>
				<div class="text-2xl md:text-3xl font-bold text-white">{{ mediaCount }}</div>
			</UCard>
			<UCard class="bg-zinc-900/50 border-zinc-800 text-center">
				<div class="text-xs text-gray-400 mb-1">Total Size</div>
				<div class="text-2xl md:text-3xl font-bold text-white">{{ formatFileSize(totalSize) }}</div>
			</UCard>
			<UCard class="bg-zinc-900/50 border-zinc-800 text-center" :class="{ 'border-pink-500/50': selectedMedia }">
				<div class="text-xs text-gray-400 mb-1">Selected</div>
				<div class="text-2xl md:text-3xl font-bold" :class="selectedMedia ? 'text-pink-500' : 'text-white'">{{ selectedMedia ? '1' : '0' }}</div>
			</UCard>
		</div>

		<!-- Media Library Component -->
		<div class="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-6">
			<LibraryMediaLibrary />
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect, onMounted } from 'vue'
import LibraryMediaLibrary from '~/components/library/MediaLibrary.vue'

const route = useRoute()
const router = useRouter()

const { mediaFiles, selectedMedia, mediaCount, totalSize } = useMedia()
const { currentProject, selectProject } = useProject()
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

// Load project from query param if provided (e.g., when coming from editor)
onMounted(async () => {
	const projectId = route.query.project as string | undefined
	
	if (projectId && !currentProject.value) {
		console.log('📋 Loading project from query param:', projectId)
		await selectProject(projectId)
	}
})

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 B'
	
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

const adding = ref(false)

const handleAddToProject = async () => {
	if (!selectedMedia.value || !currentProject.value || adding.value) return

	adding.value = true
	try {
		await addClip(currentProject.value.id, selectedMedia.value.src, {
			name: selectedMedia.value.name,
			duration: selectedMedia.value.duration || 0,
			fileSize: selectedMedia.value.size || 0,
			...selectedMedia.value.metadata
		})
		
		// Navigate back to the project editor
		await navigateTo(`/project/${currentProject.value.id}`)
	} catch (error) {
		console.error('Failed to add clip:', error)
	} finally {
		adding.value = false
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

