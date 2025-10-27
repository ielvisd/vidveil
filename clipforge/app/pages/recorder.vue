<template>
	<UContainer>
		<div class="recorder-page">
			<h1 class="text-3xl font-bold mb-6">Screen Recorder</h1>

			<RecorderRecordingControls />

			<div v-if="stream" class="recording-preview mt-8">
				<video :src="blobUrl" controls class="preview-video" />
			</div>
		</div>
	</UContainer>
</template>

<script setup lang="ts">
const { stream, isRecording } = useScreenCapture()

const blobUrl = computed(() => {
	if (!stream.value) return ''
	return URL.createObjectURL(stream.value as any)
})

watch(() => stream.value, () => {
	if (stream.value) {
		console.log('Stream active:', stream.value)
	}
})
</script>

<style scoped>
.recorder-page {
	padding-top: 2rem;
	padding-bottom: 2rem;
}

.recording-preview {
	width: 100%;
	max-width: 56rem;
	margin: 0 auto;
	margin-top: 2rem;
}

.preview-video {
	width: 100%;
	border-radius: 0.5rem;
}
</style>

