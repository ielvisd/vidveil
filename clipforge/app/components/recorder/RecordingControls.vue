<template>
	<div class="recording-controls">
		<div class="controls-center">
			<UButton
				v-if="!isRecording"
				@click="handleStart"
				color="red"
				size="xl"
				icon="i-heroicons-video-camera"
			>
				Start Recording
			</UButton>
			<UButton
				v-else
				@click="handleStop"
				color="red"
				size="xl"
				icon="i-heroicons-stop"
			>
				Stop Recording
			</UButton>
		</div>

		<div v-if="isRecording" class="recording-indicator">
			<div class="pulse-dot" />
			<span>Recording...</span>
			<span class="time">{{ formatTime(elapsedTime) }}</span>
		</div>

		<UAlert v-if="error" color="red" :title="error" />
	</div>
</template>

<script setup lang="ts">
const { isRecording, startRecording, stopRecording, error: recordingError } = useScreenCapture()

const elapsedTime = ref(0)
const timerInterval = ref<NodeJS.Timeout | null>(null)
const error = computed(() => recordingError.value)

const handleStart = async () => {
	try {
		await startRecording()
		elapsedTime.value = 0
		timerInterval.value = setInterval(() => {
			elapsedTime.value++
		}, 1000)
	} catch (err) {
		console.error('Failed to start recording:', err)
	}
}

const handleStop = () => {
	stopRecording()
	if (timerInterval.value) {
		clearInterval(timerInterval.value)
		timerInterval.value = null
	}
}

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

onUnmounted(() => {
	if (timerInterval.value) {
		clearInterval(timerInterval.value)
	}
})
</script>

<style scoped>
.recording-controls {
	p-6;
}

.controls-center {
	flex justify-center;
}

.recording-indicator {
	mt-4 flex items-center gap-3 justify-center;
}

.pulse-dot {
	w-3 h-3 bg-red-500 rounded-full animate-pulse;
}

.time {
	font-mono text-lg;
}
</style>

