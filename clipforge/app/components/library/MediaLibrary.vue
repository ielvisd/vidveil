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
	@apply w-full h-full;
}

.drop-zone {
	@apply border-2 border-dashed border-gray-300 rounded-lg p-8 transition-colors;
	min-height: 400px;
}

.drop-zone.dragging {
	@apply border-blue-500 bg-blue-50;
}

.empty-state {
	@apply flex flex-col items-center justify-center h-full;
}

.media-grid {
	@apply grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4;
}
</style>

