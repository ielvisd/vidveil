import { ref, computed } from 'vue'

export const useZoom = () => {
	const zoomLevel = ref(1) // pixels per second
	const viewportWidth = ref(1920) // pixels

	const minZoom = 0.1
	const maxZoom = 10
	const zoomStep = 0.1

	const pixelsPerSecond = computed(() => zoomLevel.value)
	const secondsPerPixel = computed(() => 1 / zoomLevel.value)

	const setZoom = (level: number) => {
		zoomLevel.value = Math.max(minZoom, Math.min(maxZoom, level))
	}

	const zoomIn = () => {
		zoomLevel.value = Math.min(maxZoom, zoomLevel.value + zoomStep)
	}

	const zoomOut = () => {
		zoomLevel.value = Math.max(minZoom, zoomLevel.value - zoomStep)
	}

	const resetZoom = () => {
		zoomLevel.value = 1
	}

	const setZoomToFit = (duration: number) => {
		// Fit entire video in viewport
		zoomLevel.value = viewportWidth.value / duration
	}

	const setZoomToSelection = (startTime: number, endTime: number) => {
		// Fit selection in viewport
		const duration = endTime - startTime
		if (duration > 0) {
			zoomLevel.value = viewportWidth.value / duration
		}
	}

	const timeToPosition = (time: number): number => {
		return time * pixelsPerSecond.value
	}

	const positionToTime = (position: number): number => {
		return position * secondsPerPixel.value
	}

	const setViewportWidth = (width: number) => {
		viewportWidth.value = width
	}

	return {
		zoomLevel,
		viewportWidth,
		pixelsPerSecond,
		secondsPerPixel,
		minZoom,
		maxZoom,
		setZoom,
		zoomIn,
		zoomOut,
		resetZoom,
		setZoomToFit,
		setZoomToSelection,
		timeToPosition,
		positionToTime,
		setViewportWidth
	}
}

