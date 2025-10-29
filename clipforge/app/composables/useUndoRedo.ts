import type { Clip } from '~/types/project'

export interface HistoryState {
	clips: Clip[]
	timestamp: number
	action: string
}

export const useUndoRedo = () => {
	const history = ref<HistoryState[]>([])
	const currentIndex = ref(-1)
	const maxHistory = 50

	const canUndo = computed(() => currentIndex.value > 0)
	const canRedo = computed(() => currentIndex.value < history.value.length - 1)

	const addState = (clips: Clip[], action: string = 'edit') => {
		// Remove any states after current index (when user performs new action after undo)
		if (currentIndex.value < history.value.length - 1) {
			history.value = history.value.slice(0, currentIndex.value + 1)
		}

		// Deep clone clips array to avoid reference issues
		const clonedClips = clips.map(clip => ({
			...clip,
			metadata: { ...clip.metadata },
			pip_config: clip.pip_config ? { ...clip.pip_config } : undefined
		}))

		// Add new state
		history.value.push({
			clips: clonedClips,
			timestamp: Date.now(),
			action
		})

		// Limit history size
		if (history.value.length > maxHistory) {
			history.value.shift()
		} else {
			currentIndex.value++
		}
	}

	const undo = (): Clip[] | null => {
		if (!canUndo.value) return null
		currentIndex.value--
		return history.value[currentIndex.value]?.clips || null
	}

	const redo = (): Clip[] | null => {
		if (!canRedo.value) return null
		currentIndex.value++
		return history.value[currentIndex.value]?.clips || null
	}

	const clearHistory = () => {
		history.value = []
		currentIndex.value = -1
	}

	const getCurrentState = (): Clip[] | null => {
		return history.value[currentIndex.value]?.clips || null
	}

	return {
		canUndo,
		canRedo,
		addState,
		undo,
		redo,
		clearHistory,
		getCurrentState,
		currentState: computed(() => history.value[currentIndex.value] || null),
		historySize: computed(() => history.value.length),
		currentIndex: computed(() => currentIndex.value)
	}
}

