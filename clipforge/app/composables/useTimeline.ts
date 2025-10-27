import { ref, computed } from 'vue'
import type { Clip } from '~/types/project'

export const useTimeline = () => {
	const currentTime = ref(0)
	const duration = ref(0)
	const playhead = ref(0)
	const zoomLevel = ref(1)
	const isPlaying = ref(false)

	const playheadPercent = computed(() => {
		if (duration.value === 0) return 0
		return (playhead.value / duration.value) * 100
	})

	const totalDuration = computed(() => {
		return duration.value
	})

	const setCurrentTime = (time: number) => {
		currentTime.value = Math.max(0, Math.min(time, duration.value))
		playhead.value = currentTime.value
	}

	const setPlayhead = (time: number) => {
		playhead.value = Math.max(0, Math.min(time, duration.value))
	}

	const setDuration = (dur: number) => {
		duration.value = dur
	}

	const play = () => {
		isPlaying.value = true
	}

	const pause = () => {
		isPlaying.value = false
	}

	const stop = () => {
		isPlaying.value = false
		currentTime.value = 0
		playhead.value = 0
	}

	const seek = (time: number) => {
		setCurrentTime(time)
	}

	const zoomIn = () => {
		zoomLevel.value = Math.min(zoomLevel.value * 1.5, 10)
	}

	const zoomOut = () => {
		zoomLevel.value = Math.max(zoomLevel.value / 1.5, 0.1)
	}

	const resetZoom = () => {
		zoomLevel.value = 1
	}

	const snapToGrid = (time: number, gridSize: number = 1) => {
		return Math.round(time / gridSize) * gridSize
	}

	return {
		currentTime,
		duration,
		playhead,
		zoomLevel,
		isPlaying,
		playheadPercent,
		totalDuration,
		setCurrentTime,
		setPlayhead,
		setDuration,
		play,
		pause,
		stop,
		seek,
		zoomIn,
		zoomOut,
		resetZoom,
		snapToGrid
	}
}

