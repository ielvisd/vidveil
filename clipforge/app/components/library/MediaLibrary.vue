<template>
	<div class="media-library">
		<!-- File upload drop zone - always visible for drag and drop -->
		<UFileUpload
			v-model="uploadedFiles"
			accept="video/*"
			multiple
			icon="i-heroicons-photo"
			:label="mediaFiles.length === 0 ? 'Drag and drop video files here' : 'Drop more files to add'"
			:description="mediaFiles.length === 0 ? 'or click to browse' : undefined"
			variant="area"
			:interactive="true"
			:file-delete="false"
			class="w-full drop-zone"
			:class="{ 'has-files': mediaFiles.length > 0 }"
			@update:model-value="handleFilesChanged"
		>
			<template #files>
				<!-- Empty slot to hide default file display -->
			</template>
		</UFileUpload>

		<!-- Custom media grid when files exist -->
		<div v-if="mediaFiles.length > 0" class="media-grid">
			<LibraryMediaThumbnail
				v-for="file in mediaFiles"
				:key="file.id"
				:file="file"
				:selected="selectedMedia?.id === file.id"
				@select="selectMedia(file.id)"
				@remove="removeMedia(file.id)"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
const {
	mediaFiles,
	selectedMedia,
	selectMedia: selectMediaImport,
	removeMedia: removeMediaImport,
	importFiles
} = useMedia()

const uploadedFiles = ref<File[]>([])

const selectMedia = selectMediaImport
const removeMedia = removeMediaImport

const handleFilesChanged = async (files: File | File[] | null | undefined) => {
	if (!files) {
		uploadedFiles.value = []
		return
	}

	const fileArray = Array.isArray(files) ? files : [files]
	
	// Filter out already processed files by checking name and size
	const existingFiles = new Set(
		mediaFiles.value.map(f => `${f.name}-${f.size}`)
	)
	
	const newFiles = fileArray.filter(file => {
		const fileKey = `${file.name}-${file.size}`
		return !existingFiles.has(fileKey)
	})

	if (newFiles.length > 0) {
		await importFiles(newFiles)
	}
	
	// Clear uploadedFiles so FileUpload doesn't display files
	// We show them in our custom MediaThumbnail grid instead
	uploadedFiles.value = []
}
</script>

<style scoped>
.media-library {
	width: 100%;
	height: 100%;
}

.drop-zone {
	transition: all 0.2s;
}

.drop-zone.has-files {
	margin-bottom: 1rem;
}

/* When files exist, make the drop zone more compact */
:deep(.has-files .ui-file-upload__base) {
	min-height: 120px;
}

.media-grid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 1rem;
	width: 100%;
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

