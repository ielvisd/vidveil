<template>
	<UContainer class="editor-page">
		<div class="editor-layout">
		<!-- Video Preview -->
		<div class="preview-section">
			<div v-if="currentClip" class="video-preview-container">
				<video :src="currentClip.src" controls class="video-preview" />
			</div>
			<div v-else class="empty-preview">
				<p>No video selected</p>
			</div>
		</div>

			<!-- Timeline -->
			<div class="timeline-section">
				<LibraryMediaLibrary ref="mediaLibrary" />
				<div class="timeline-container">
					<p>Timeline coming soon...</p>
				</div>
			</div>

			<!-- Controls -->
			<div class="controls-section">
				<div class="controls-row">
					<UButton @click="recordScreen" icon="i-heroicons-video-camera" variant="outline">
						Screen
					</UButton>
					<UButton @click="recordWebcam" icon="i-heroicons-camera" variant="outline">
						Webcam
					</UButton>
					<UButton @click="openLibrary" icon="i-heroicons-folder-open" variant="outline">
						Import
					</UButton>
					<UButton @click="exportVideo" :disabled="!canExport" color="primary">
						Export
					</UButton>
				</div>
			</div>
		</div>
	</UContainer>
</template>

<script setup lang="ts">
definePageMeta({
	layout: 'default'
})

const currentClip = ref<any>(null)
const totalDuration = ref(0)
const canExport = ref(false)

const mediaLibrary = ref()

const openLibrary = () => {
	navigateTo('/library')
}

const recordScreen = () => {
	navigateTo('/recorder')
}

const recordWebcam = async () => {
	// TODO: Start webcam recording
}

const exportVideo = () => {
	// TODO: Open export dialog
}

onMounted(() => {
	// Initialize editor
	console.log('Editor mounted')
})
</script>

<style scoped>
.editor-page {
	height: 100vh;
	overflow: hidden;
}

.editor-layout {
	display: flex;
	flex-direction: column;
	height: 100%;
}

.preview-section {
	flex: 1;
	background-color: rgb(17 24 39);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem;
}

.empty-preview {
	color: rgb(156 163 175);
	font-size: 1.5rem;
}

.timeline-section {
	height: 200px;
	background-color: rgb(31 41 55);
	border-top: 1px solid rgb(55 65 81);
	padding: 1rem;
	display: flex;
	align-items: center;
	justify-content: center;
}

.video-preview-container {
	width: 100%;
	height: 100%;
}

.video-preview {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.controls-section {
	padding: 1rem;
	background-color: rgb(17 24 39);
	border-top: 1px solid rgb(55 65 81);
}

.controls-row {
	display: flex;
	gap: 0.5rem;
	justify-content: center;
}
</style>

