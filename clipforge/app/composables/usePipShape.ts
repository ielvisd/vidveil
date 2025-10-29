import { ref, computed, nextTick } from 'vue'
import type { PredefinedShape } from '~/utils/shapes'
import { suggestPiPPosition, getRecommendedPipSize } from '~/utils/positioning'

export interface PipShapeConfig {
	shape: PredefinedShape
	width: number
	height: number
	x: number // Position percentage (0-100)
	y: number // Position percentage (0-100)
	borderColor?: string
	borderWidth?: number
	shadow?: boolean
}

// Global PiP shape state
const globalPipConfig = ref<PipShapeConfig | null>(null)

export const usePipShape = () => {
	const pipConfig = globalPipConfig
	const webcamClipId = ref<string | null>(null)
	const isActive = computed(() => pipConfig.value !== null)

	const applyShape = async (shape: PredefinedShape, clipId?: string, videoElement?: HTMLVideoElement) => {
		if (clipId) {
			webcamClipId.value = clipId
		}

		// Determine PiP size - use recommended size if video element available
		let pipWidth = 200
		let pipHeight = 200
		
		if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
			const recommendedSize = getRecommendedPipSize(videoElement.videoWidth, videoElement.videoHeight)
			pipWidth = recommendedSize.width
			pipHeight = recommendedSize.height
		}

		// Auto-position PiP using smart positioning
		let x = window.innerWidth - pipWidth - 50 // Default bottom-right
		let y = window.innerHeight - pipHeight - 50

		if (videoElement && videoElement.readyState >= 2) {
			try {
				// Use lightweight mode for faster analysis (500ms timeout)
				const suggestedPosition = await suggestPiPPosition(
					videoElement, 
					{ width: pipWidth, height: pipHeight },
					{ lightweight: true, timeout: 500 }
				)
				x = suggestedPosition.x
				y = suggestedPosition.y
				console.log('✅ Smart PiP positioning applied:', { x, y })
			} catch (error) {
				console.warn('⚠️ Smart positioning failed, using default position:', error)
				// Fallback to bottom-right corner
			}
		}

		globalPipConfig.value = {
			shape,
			width: pipWidth,
			height: pipHeight,
			x,
			y,
			borderColor: '#ffffff',
			borderWidth: 3,
			shadow: true
		}

		console.log('Applied PiP shape:', shape, 'to webcam clip:', clipId, 'at position:', { x, y })
	}

	const setWebcamClip = (clipId: string) => {
		webcamClipId.value = clipId
	}

	const updatePosition = (x: number, y: number) => {
		if (globalPipConfig.value) {
			globalPipConfig.value.x = x
			globalPipConfig.value.y = y
		}
	}

	const updateSize = (width: number, height: number) => {
		if (globalPipConfig.value) {
			globalPipConfig.value.width = width
			globalPipConfig.value.height = height
		}
	}

	const updateBorder = (color: string, width: number) => {
		if (globalPipConfig.value) {
			globalPipConfig.value.borderColor = color
			globalPipConfig.value.borderWidth = width
		}
	}

	const toggleShadow = () => {
		if (globalPipConfig.value) {
			globalPipConfig.value.shadow = !globalPipConfig.value.shadow
		}
	}

	const clearShape = () => {
		globalPipConfig.value = null
	}

	const getShapeCSS = (): string => {
		if (!globalPipConfig.value) return ''

		const { shape } = globalPipConfig.value

		if (shape === 'rounded') {
			return 'border-radius: 50%;'
		}

		if (shape === 'circle') {
			return 'clip-path: circle(50% at 50% 50%);'
		}

		if (shape === 'square') {
			return 'clip-path: inset(0 0 0 0);'
		}

		if (shape === 'heart') {
			return 'clip-path: path("M 50,20 C 50,20 30,5 20,15 C 10,25 10,40 20,50 C 30,60 50,80 50,80 C 50,80 70,60 80,50 C 90,40 90,25 80,15 C 70,5 50,20 50,20 Z");'
		}

		if (shape === 'star') {
			return 'clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);'
		}

		if (shape === 'hexagon') {
			return 'clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);'
		}

		return ''
	}

	const removePip = () => {
		globalPipConfig.value = null
		webcamClipId.value = null
	}

	return {
		pipConfig,
		webcamClipId,
		isActive,
		applyShape,
		setWebcamClip,
		updatePosition,
		updateSize,
		updateBorder,
		toggleShadow,
		clearShape,
		removePip,
		getShapeCSS
	}
}

