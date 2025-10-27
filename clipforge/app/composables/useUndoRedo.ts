export const useUndoRedo = <T = any>() => {
	const history = ref<T[]>([])
	const currentIndex = ref(-1)
	const maxHistory = 50

	const canUndo = computed(() => currentIndex.value > 0)
	const canRedo = computed(() => currentIndex.value < history.value.length - 1)

	const addState = (state: T) => {
		// Remove any states after current index
		if (currentIndex.value < history.value.length - 1) {
			history.value = history.value.slice(0, currentIndex.value + 1)
		}

		// Add new state
		history.value.push(state)

		// Limit history size
		if (history.value.length > maxHistory) {
			history.value.shift()
		} else {
			currentIndex.value++
		}
	}

	const undo = (): T | null => {
		if (!canUndo.value) return null
		currentIndex.value--
		return history.value[currentIndex.value]
	}

	const redo = (): T | null => {
		if (!canRedo.value) return null
		currentIndex.value++
		return history.value[currentIndex.value]
	}

	const clearHistory = () => {
		history.value = []
		currentIndex.value = -1
	}

	return {
		canUndo,
		canRedo,
		addState,
		undo,
		redo,
		clearHistory,
		currentState: computed(() => history.value[currentIndex.value] || null)
	}
}

