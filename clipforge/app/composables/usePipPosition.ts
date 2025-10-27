import { ref, computed } from 'vue'
import { suggestPiPPosition, Position, positions } from '~/utils/positioning'
import type { PipConfig } from './usePipMask'

export const usePipPosition = () => {
	const suggestedPosition = ref<Position>({ x: 100, y: 100 })
	const isAutoPositioning = ref(true)
	const dragOffset = ref({ x: 0, y: 0 })

	const cornerPositions = computed(() => positions)

	const autoPosition = async (videoElement: HTMLVideoElement, pipSize: { width: number; height: number }) => {
		if (!isAutoPositioning.value) return

		try {
			const position = await suggestPiPPosition(videoElement, pipSize)
			suggestedPosition.value = position
			return position
		} catch (error) {
			console.error('Auto positioning failed:', error)
			// Fallback to bottom-right
			suggestedPosition.value = positions[3]
			return suggestedPosition.value
		}
	}

	const setPosition = (position: Position) => {
		suggestedPosition.value = position
		isAutoPositioning.value = false
	}

	const resetToSuggested = () => {
		isAutoPositioning.value = true
	}

	const dragStart = (event: MouseEvent, currentPosition: Position) => {
		dragOffset.value = {
			x: event.clientX - currentPosition.x,
			y: event.clientY - currentPosition.y
		}
	}

	const handleDrag = (event: MouseEvent): Position => {
		return {
			x: event.clientX - dragOffset.value.x,
			y: event.clientY - dragOffset.value.y
		}
	}

	const constrainToBounds = (
		position: Position,
		pipSize: { width: number; height: number },
		containerSize: { width: number; height: number }
	): Position => {
		return {
			x: Math.max(0, Math.min(position.x, containerSize.width - pipSize.width)),
			y: Math.max(0, Math.min(position.y, containerSize.height - pipSize.height))
		}
	}

	return {
		suggestedPosition,
		isAutoPositioning,
		cornerPositions,
		autoPosition,
		setPosition,
		resetToSuggested,
		dragStart,
		handleDrag,
		constrainToBounds
	}
}

