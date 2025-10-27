<template>
	<div class="media-library">
		<div
			class="drop-zone"
			:class="{ 'dragging': dragging }"
			@drop="handleDrop"
			@dragover="handleDragOver"
			@dragleave="handleDragLeave"
		>
			<div v-if="mediaFiles.length === 0" class="empty-state">
				<UIcon name="i-heroicons-photo" class="text-6xl text-gray-400 mb-4" />
				<p class="text-gray-500 mb-2">Drag and drop video files here</p>
				<p class="text-sm text-gray-400">or</p>
				<UButton @click="openFilePicker" variant="outline" class="mt-4">
					Browse Files
				</UButton>
			</div>

			<div v-else class="media-grid">
				<MediaThumbnail
					v-for="file in mediaFiles"
					:key="file.id"
					:file="file"
					:selected="selectedMedia?.id === file.id"
					@select="selectMedia(file.id)"
					@remove="removeMedia(file.id)"
				/>
			</div>
		</div>

		<input
			ref="fileInput"
			type="file"
			multiple
			accept="video/*"
			@change="handleFileSelect"
			class="hidden"
		>
	</div>
</template>

<script setup lang="ts">
const {
	mediaFiles,
	selectedMedia,
	dragging,
	handleDrop: handleDropImport,
	handleDragOver: handleDragOverImport,
	handleDragLeave: handleDragLeaveImport,
	selectMedia: selectMediaImport,
	removeMedia: removeMediaImport,
	importFiles
} = useMedia()

const fileInput = ref<HTMLInputElement | null>(null)

const handleDrop = handleDropImport
const handleDragOver = handleDragOverImport
const handleDragLeave = handleDragLeaveImport
const selectMedia = selectMediaImport
const removeMedia = removeMediaImport

const openFilePicker = () => {
	fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
	const target = event.target as HTMLInputElement
	const files = Array.from(target.files || [])
	
	if (files.length > 0) {
		await importFiles(files)
	}
	
	// Reset input
	if (target) {
		target.value = ''
	}
}
</script>

<style scoped>
.media-library {
	width: 100%;
	height: 100%;
}

.drop-zone {
	border: 2px dashed;
	border-color: rgb(209 213 219);
	border-radius: 0.5rem;
	padding: 2rem;
	transition: colors;
	min-height: 400px;
}

.drop-zone.dragging {
	border-color: rgb(59 130 246);
	background-color: rgb(239 246 255);
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 100%;
}

.media-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 1rem;
}

@media (min-width: 768px) {
	.media-grid {
		grid-template-columns: repeat(3, 1fr);
	}
}

@media (min-width: 1024px) {
	.media-grid {
		grid-template-columns: repeat(4, 1fr);
	}
}
</style>

