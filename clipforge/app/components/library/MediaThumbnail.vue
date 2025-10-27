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
					class="delete-btn"
				>
					🗑️
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
	cursor: pointer;
	border-radius: 0.5rem;
	overflow: hidden;
	background-color: rgb(243 244 246);
	transition: all 0.2s;
}

.media-thumbnail:hover {
	background-color: rgb(229 231 235);
}

.media-thumbnail.selected {
	box-shadow: 0 0 0 2px rgb(59 130 246);
}

.thumbnail-container {
	position: relative;
	aspect-ratio: 16 / 9;
	background-color: rgb(17 24 39);
}

.thumbnail-container img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.placeholder {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.overlay {
	position: absolute;
	inset: 0;
	background-color: rgba(0, 0, 0, 0);
	transition: background-color 0.2s;
	display: flex;
	align-items: center;
	justify-content: center;
}

.media-thumbnail:hover .overlay {
	background-color: rgba(0, 0, 0, 0.6);
}

.delete-btn {
	padding: 0.25rem 0.5rem;
	background-color: rgb(220 38 38);
	color: white;
	border-radius: 0.25rem;
	border: none;
	cursor: pointer;
	font-size: 0.875rem;
}

.delete-btn:hover {
	background-color: rgb(185 28 28);
}

.duration {
	position: absolute;
	bottom: 0.5rem;
	right: 0.5rem;
	background-color: rgba(0, 0, 0, 0.75);
	color: white;
	font-size: 0.75rem;
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
}

.info {
	padding: 0.75rem;
}

.filename {
	font-size: 0.875rem;
	font-weight: 500;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
}

.filesize {
	font-size: 0.75rem;
	color: rgb(107 114 128);
}
</style>
