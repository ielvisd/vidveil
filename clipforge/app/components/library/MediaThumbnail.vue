<template>
	<div
		class="media-thumbnail"
		:class="{ 'selected': selected }"
		@click="$emit('select')"
	>
		<div class="thumbnail-container">
			<img v-if="file.thumbnail" :src="file.thumbnail" :alt="file.name" />
			<div v-else class="placeholder">
				<UIcon name="i-heroicons-video-camera" class="text-4xl text-gray-400" />
			</div>

			<div class="overlay">
				<UButton
					@click.stop="$emit('remove')"
					icon="i-heroicons-trash"
					size="sm"
					color="red"
					variant="solid"
				/>
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
	@apply cursor-pointer rounded-lg overflow-hidden bg-gray-100 hover:bg-gray-200 transition-all;
}

.media-thumbnail.selected {
	@apply ring-2 ring-blue-500;
}

.thumbnail-container {
	@apply relative aspect-video bg-gray-900;
}

.thumbnail-container img {
	@apply w-full h-full object-cover;
}

.placeholder {
	@apply w-full h-full flex items-center justify-center;
}

.overlay {
	@apply absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-60 transition-all flex items-center justify-center;
}

.duration {
	@apply absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded;
}

.info {
	@apply p-3;
}

.filename {
	@apply text-sm font-medium truncate;
}

.filesize {
	@apply text-xs text-gray-500;
}
</style>

