import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

export const usePlayer = () => {
	const player = ref<Plyr | null>(null)
	const videoElement = ref<HTMLVideoElement | null>(null)
	const currentTime = ref(0)
	const duration = ref(0)
	const isPlaying = ref(false)
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

	const initializePlayer = (element: HTMLVideoElement) => {
		videoElement.value = element
		
		player.value = new Plyr(element, {
			controls: [
				'play-large',
				'play',
				'progress',
				'current-time',
				'duration',
				'mute',
				'volume',
				'settings',
				'pip',
				'airplay',
				'fullscreen'
			],
			keyboard: { global: true },
			tooltips: { controls: true, seek: true }
		})

		// Listen to events
		element.addEventListener('loadedmetadata', () => {
			duration.value = element.duration || 0
			isLoaded.value = true
		})

		element.addEventListener('timeupdate', () => {
			currentTime.value = element.currentTime
		})

		element.addEventListener('play', () => {
			isPlaying.value = true
		})

		element.addEventListener('pause', () => {
			isPlaying.value = false
		})

		element.addEventListener('ended', () => {
			isPlaying.value = false
		})

		return player.value
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
		if (player.value) {
			player.value.destroy()
			player.value = null
		}
		videoElement.value = null
		isLoaded.value = false
	}

	return {
		player,
		videoElement,
		currentTime,
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
		seekBy,
		goToStart,
		goToEnd,
		setVolume,
		toggleMute,
		setPlaybackRate,
		destroy
	}
}

