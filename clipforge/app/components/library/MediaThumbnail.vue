<template>
	<div
		class="media-thumbnail"
		:class="{ 'selected': selected }"
		@click="$emit('select')"
	>
		<div class="thumbnail-container">
			<img v-if="file.thumbnail" :src="file.thumbnail" :alt="file.name" />
			<div v-else class="placeholder">
				<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
			</svg>
			</div>

			<div class="overlay">
				<button
					@click.stop="$emit('remove')"
					class="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
				>
					<UIcon name="i-heroicons-trash" class="w-4 h-4" />
				</button>
			</div>

			<div v-if="file.duration" class="duration">
				{{ formatDuration(file.duration) }}
			</div>
		</div>

		<div class="info">
			<p class="filename" :title="file.name">{{ file.name }}</p>
			<p class="filesize">{{ formatFileSize(file.size) }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	file: any
	selected?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
	select: []
	remove: []
}>()

const formatDuration = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (bytes: number): string => {
	if (bytes === 0) return '0 Bytes'
	
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
</script>

<style scoped>
.media-thumbnail {
	cursor-pointer rounded-lg overflow-hidden bg-gray-100 hover:bg-gray-200 transition-all;
}

.media-thumbnail.selected {
	ring-2 ring-blue-500;
}

.thumbnail-container {
	relative aspect-video bg-gray-900;
}

.thumbnail-container img {
	w-full h-full object-cover;
}

.placeholder {
	w-full h-full flex items-center justify-center;
}

.overlay {
	absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-60 transition-all flex items-center justify-center;
}

.duration {
	absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 border-radius: 0.25rem;
}

.info {
	p-3;
}

.filename {
	text-sm font-medium truncate;
}

.filesize {
	text-xs text-gray-500;
}
</style>

