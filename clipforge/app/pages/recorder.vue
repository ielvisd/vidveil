<template>
	<UContainer>
		<div class="recorder-page">
			<h1 class="text-3xl font-bold mb-6">Screen Recorder</h1>

			<RecordingControls />

			<div v-if="stream" class="recording-preview mt-8">
				<VideoPreview :src="blobUrl" />
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
	@apply py-8;
}

.recording-preview {
	@apply w-full max-w-4xl mx-auto;
}
</style>

