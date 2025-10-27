<template>
	<div class="player-controls">
		<div class="progress-bar" @click="handleSeek">
			<div class="progress-fill" :style="{ width: `${progressPercent}%` }">
				<div class="progress-handle" />
			</div>
		</div>

		<div class="controls-row">
			<div class="controls-left">
				<UButton
					@click="$emit('play')"
					icon="i-heroicons-play"
					variant="ghost"
					size="sm"
					:disabled="!canPlay"
				/>
				<UButton
					@click="$emit('pause')"
					icon="i-heroicons-pause"
					variant="ghost"
					size="sm"
					:disabled="!canPause"
				/>
				<UButton
					@click="$emit('previous')"
					icon="i-heroicons-arrow-uturn-left"
					variant="ghost"
					size="sm"
				/>
				<UButton
					@click="$emit('next')"
					icon="i-heroicons-arrow-uturn-right"
					variant="ghost"
					size="sm"
				/>
			</div>

			<div class="controls-center">
				<span class="time-display">
					{{ formatTime(currentTime) }} / {{ formatTime(duration) }}
				</span>
			</div>

			<div class="controls-right">
				<UButton
					icon="i-heroicons-arrows-pointing-out"
					variant="ghost"
					size="sm"
					@click="toggleFullscreen"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	currentTime: number
	duration: number
	isPlaying: boolean
}

const props = defineProps<Props>()

defineEmits<{
	play: []
	pause: []
	seek: [time: number]
	previous: []
	next: []
}>()

const progressPercent = computed(() => {
	if (props.duration === 0) return 0
	return (props.currentTime / props.duration) * 100
})

const canPlay = computed(() => !props.isPlaying)
const canPause = computed(() => props.isPlaying)

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

const handleSeek = (event: MouseEvent) => {
	const progressBar = event.currentTarget as HTMLElement
	const rect = progressBar.getBoundingClientRect()
	const percent = (event.clientX - rect.left) / rect.width
	const newTime = percent * props.duration
	
	// Emit would be handled by parent
	// For now we just calculate the time
}

const toggleFullscreen = () => {
	if (document.fullscreenElement) {
		document.exitFullscreen()
	} else {
		document.documentElement.requestFullscreen()
	}
}
</script>

<style scoped>
.player-controls {
	bg-gray-900 rounded-b-lg p-4;
}

.progress-bar {
	h-2 bg-gray-700 rounded-full mb-4 cursor-pointer relative;
}

.progress-fill {
	h-full bg-blue-500 rounded-full relative;
}

.progress-handle {
	absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 border-radius: 9999px;
}

.controls-row {
	flex items-center justify-between;
}

.controls-left {
	flex gap-2;
}

.controls-center {
	flex-grow text-center;
}

.time-display {
	text-sm text-gray-300;
}

.controls-right {
	flex gap-2;
}
</style>

