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
	background-color: rgb(17 24 39);
	border-radius: 0 0 0.5rem 0.5rem;
	padding: 1rem;
}

.progress-bar {
	height: 0.5rem;
	background-color: rgb(55 65 81);
	border-radius: 9999px;
	margin-bottom: 1rem;
	cursor: pointer;
	position: relative;
}

.progress-fill {
	height: 100%;
	background-color: rgb(59 130 246);
	border-radius: 9999px;
	position: relative;
}

.progress-handle {
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	width: 0.75rem;
	height: 0.75rem;
	background-color: rgb(59 130 246);
	border-radius: 9999px;
}

.controls-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.controls-left {
	display: flex;
	gap: 0.5rem;
}

.controls-center {
	flex-grow: 1;
	text-align: center;
}

.time-display {
	font-size: 0.875rem;
	color: rgb(209 213 219);
}

.controls-right {
	display: flex;
	gap: 0.5rem;
}
</style>
