import { ref, computed } from 'vue'
import type { Ref } from 'vue'

// Global playhead state shared between player and timeline
const globalPlayheadPosition = ref(0)
const globalIsPlaying = ref(false)

export const usePlayer = () => {
	const videoElement = ref<HTMLVideoElement | null>(null)
	const currentTime = globalPlayheadPosition
	const playheadPosition = globalPlayheadPosition
	const duration = ref(0)
	const isPlaying = globalIsPlaying
	const isLoaded = ref(false)

	const progress = computed(() => {
		if (duration.value === 0) return 0
		return (currentTime.value / duration.value) * 100
	})

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	let rafId: number | null = null
	let lastUpdateTime = 0
	const UPDATE_INTERVAL_MS = 16 // ~60fps (1000/60 ≈ 16ms)

	const updatePlayhead = () => {
		if (!videoElement.value) return

		const now = performance.now()
		if (now - lastUpdateTime >= UPDATE_INTERVAL_MS || !videoElement.value.paused) {
			globalPlayheadPosition.value = videoElement.value.currentTime
			lastUpdateTime = now
		}

		// Continue animation frame loop only if playing
		if (!videoElement.value.paused && !videoElement.value.ended) {
			rafId = requestAnimationFrame(updatePlayhead)
		}
	}

	const startUpdateLoop = () => {
		if (rafId === null && videoElement.value && !videoElement.value.paused) {
			rafId = requestAnimationFrame(updatePlayhead)
		}
	}

	const stopUpdateLoop = () => {
		if (rafId !== null) {
			cancelAnimationFrame(rafId)
			rafId = null
		}
	}

	const initializePlayer = (element: HTMLVideoElement) => {
		videoElement.value = element

		// Listen to events
		element.addEventListener('loadedmetadata', () => {
			duration.value = element.duration || 0
			isLoaded.value = true
			globalPlayheadPosition.value = 0
		})

		// Use requestAnimationFrame for smooth 60fps updates during playback
		element.addEventListener('play', () => {
			globalIsPlaying.value = true
			startUpdateLoop()
		})

		element.addEventListener('pause', () => {
			globalIsPlaying.value = false
			stopUpdateLoop()
			// Final update when paused
			globalPlayheadPosition.value = element.currentTime
		})

		element.addEventListener('ended', () => {
			globalIsPlaying.value = false
			stopUpdateLoop()
			globalPlayheadPosition.value = element.duration || 0
		})

		// Fallback: still listen to timeupdate for scrubbing/seek operations
		element.addEventListener('timeupdate', () => {
			if (element.paused) {
				globalPlayheadPosition.value = element.currentTime
			}
		})

		// Handle seeking (user scrubbing)
		element.addEventListener('seeking', () => {
			globalPlayheadPosition.value = element.currentTime
		})

		return element
	}

	const play = () => {
		videoElement.value?.play()
	}

	const pause = () => {
		videoElement.value?.pause()
	}

	const togglePlay = () => {
		if (isPlaying.value) {
			pause()
		} else {
			play()
		}
	}

	const seek = (time: number) => {
		if (videoElement.value) {
			// Stop update loop temporarily during seek
			const wasPlaying = !videoElement.value.paused
			if (wasPlaying) {
				stopUpdateLoop()
			}
			
			videoElement.value.currentTime = time
			globalPlayheadPosition.value = time
			lastUpdateTime = performance.now()
			
			// Resume update loop if it was playing
			if (wasPlaying) {
				startUpdateLoop()
			}
		}
	}

	const setPlayheadPosition = (time: number) => {
		globalPlayheadPosition.value = time
		lastUpdateTime = performance.now()
		if (videoElement.value) {
			videoElement.value.currentTime = time
		}
	}

	const seekBy = (seconds: number) => {
		if (videoElement.value) {
			videoElement.value.currentTime += seconds
		}
	}

	const goToStart = () => {
		if (videoElement.value) {
			videoElement.value.currentTime = 0
		}
	}

	const goToEnd = () => {
		if (videoElement.value && duration.value) {
			videoElement.value.currentTime = duration.value
		}
	}

	const setVolume = (volume: number) => {
		if (videoElement.value) {
			videoElement.value.volume = Math.max(0, Math.min(1, volume))
		}
	}

	const toggleMute = () => {
		if (videoElement.value) {
			videoElement.value.muted = !videoElement.value.muted
		}
	}

	const setPlaybackRate = (rate: number) => {
		if (videoElement.value) {
			videoElement.value.playbackRate = rate
		}
	}

	const destroy = () => {
		stopUpdateLoop()
		videoElement.value = null
		isLoaded.value = false
	}

	return {
		videoElement,
		currentTime,
		playheadPosition,
		duration,
		isPlaying,
		isLoaded,
		progress,
		formatTime,
		initializePlayer,
		play,
		pause,
		togglePlay,
		seek,
		setPlayheadPosition,
		seekBy,
		goToStart,
		goToEnd,
		setVolume,
		toggleMute,
		setPlaybackRate,
		destroy
	}
}

