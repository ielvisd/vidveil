<template>
	<div class="recorder-page">
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
			<h1>Screen Recorder</h1>
			<div class="spacer" />
		</div>

		<!-- Main Content -->
		<div class="recorder-content">
			<div class="recording-area">
				<div v-if="!stream" class="start-prompt">
					<i class="i-heroicons-video-camera text-8xl text-gray-600" />
					<h2>Ready to Record</h2>
					<p>Click the record button below to start capturing your screen</p>
				</div>
				
				<video
					v-else
					ref="previewVideo"
					:srcObject="stream"
					autoplay
					muted
					class="preview-video"
				/>

				<div v-if="recordedBlob" class="playback-area">
					<h3>Recording Complete</h3>
					<video :src="blobUrl" controls class="playback-video" />
					<div class="recording-actions">
						<UButton 
							@click="saveRecording"
							color="primary"
							icon="i-heroicons-check"
						>
							Add to Project
						</UButton>
						<UButton 
							@click="discardRecording"
							variant="outline"
							icon="i-heroicons-trash"
						>
							Discard
						</UButton>
					</div>
				</div>
			</div>

			<!-- Recording Controls -->
			<div class="controls-area">
				<RecorderRecordingControls />
			</div>

			<!-- Options -->
			<div class="options-area">
				<div class="option-card">
					<h3>Recording Options</h3>
					<div class="option-list">
						<div class="option-item">
							<label>Source</label>
							<select class="option-select">
								<option>Full Screen</option>
								<option>Window</option>
								<option>Browser Tab</option>
							</select>
						</div>
						<div class="option-item">
							<label>Audio</label>
							<select class="option-select">
								<option>System Audio</option>
								<option>Microphone</option>
								<option>Both</option>
								<option>None</option>
							</select>
						</div>
						<div class="option-item">
							<label>Quality</label>
							<select class="option-select">
								<option>1080p (High)</option>
								<option>720p (Medium)</option>
								<option>480p (Low)</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const router = useRouter()
const { stream, isRecording, recordedBlob, startRecording, stopRecording } = useScreenCapture()
const { currentProject } = useProject()
const { addClip } = useClips()

const previewVideo = ref<HTMLVideoElement | null>(null)

const blobUrl = computed(() => {
	if (!recordedBlob.value) return ''
	return URL.createObjectURL(recordedBlob.value)
})

const saveRecording = async () => {
	if (!recordedBlob.value || !currentProject.value) return

	try {
		// Convert blob to file
		const file = new File([recordedBlob.value], `recording-${Date.now()}.webm`, {
			type: 'video/webm'
		})

		// Create object URL for the clip
		const src = URL.createObjectURL(file)

		// Add to project
		await addClip(currentProject.value.id, src, {
			name: file.name,
			duration: 0, // TODO: Get actual duration
			type: 'screen-recording'
		})

		// Navigate back to project
		await navigateTo(`/project/${currentProject.value.id}`)
	} catch (error) {
		console.error('Failed to save recording:', error)
	}
}

const discardRecording = () => {
	// Clear the recorded blob
	recordedBlob.value = null
}

const goBack = () => {
	if (currentProject.value) {
		router.push(`/project/${currentProject.value.id}`)
	} else {
		router.push('/projects')
	}
}

// Cleanup on unmount
onUnmounted(() => {
	if (stream.value) {
		stream.value.getTracks().forEach(track => track.stop())
	}
	if (blobUrl.value) {
		URL.revokeObjectURL(blobUrl.value)
	}
})
</script>

<style scoped>
.recorder-page {
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

.spacer {
	width: 80px;
}

.recorder-content {
	flex: 1;
	display: grid;
	grid-template-columns: 1fr 300px;
	grid-template-rows: 1fr auto;
	gap: 1.5rem;
	padding: 1.5rem;
	overflow: hidden;
}

.recording-area {
	grid-column: 1;
	grid-row: 1;
	background-color: rgb(31 41 55);
	border-radius: 0.5rem;
	border: 1px solid rgb(55 65 81);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	overflow: hidden;
	position: relative;
}

.start-prompt {
	text-align: center;
	color: rgb(107 114 128);
}

.start-prompt h2 {
	margin: 1rem 0 0.5rem 0;
	font-size: 1.5rem;
	font-weight: 600;
	color: white;
}

.start-prompt p {
	margin: 0;
	color: rgb(156 163 175);
}

.preview-video, .playback-video {
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
	border-radius: 0.5rem;
}

.playback-area {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	padding: 2rem;
	width: 100%;
}

.playback-area h3 {
	margin: 0 0 1rem 0;
	font-size: 1.25rem;
	font-weight: 600;
}

.recording-actions {
	display: flex;
	gap: 1rem;
	margin-top: 1rem;
}

.controls-area {
	grid-column: 1;
	grid-row: 2;
	display: flex;
	justify-content: center;
}

.options-area {
	grid-column: 2;
	grid-row: 1 / 3;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.option-card {
	background-color: rgb(31 41 55);
	border-radius: 0.5rem;
	border: 1px solid rgb(55 65 81);
	padding: 1.25rem;
}

.option-card h3 {
	margin: 0 0 1rem 0;
	font-size: 1rem;
	font-weight: 600;
}

.option-list {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.option-item {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.option-item label {
	font-size: 0.875rem;
	font-weight: 500;
	color: rgb(156 163 175);
}

.option-select {
	padding: 0.5rem;
	background-color: rgb(55 65 81);
	border: 1px solid rgb(75 85 99);
	border-radius: 0.375rem;
	color: white;
	font-size: 0.875rem;
}

.option-select:focus {
	outline: none;
	border-color: rgb(59 130 246);
}
</style>
