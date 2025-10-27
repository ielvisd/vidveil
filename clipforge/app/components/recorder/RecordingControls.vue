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
	padding: 1.5rem;
}

.controls-center {
	display: flex;
	justify-content: center;
}

.recording-indicator {
	margin-top: 1rem;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	justify-content: center;
}

.pulse-dot {
	width: 0.75rem;
	height: 0.75rem;
	background-color: rgb(239 68 68);
	border-radius: 9999px;
	animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
	0%, 100% {
		opacity: 1;
	}
	50% {
		opacity: 0.5;
	}
}

.time {
	font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
	font-size: 1.125rem;
}
</style>

