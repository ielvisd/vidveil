export interface Shortcut {
	key: string
	ctrl?: boolean
	shift?: boolean
	alt?: boolean
	action: string
}

export const shortcuts: Shortcut[] = [
	{ key: ' ', action: 'togglePlay' },
	{ key: 'ArrowLeft', action: 'rewind' },
	{ key: 'ArrowRight', action: 'forward' },
	{ key: 'i', ctrl: true, action: 'setInPoint' },
	{ key: 'o', ctrl: true, action: 'setOutPoint' },
	{ key: 'Delete', action: 'deleteSelected' },
	{ key: 'Delete', shift: true, action: 'deleteAndLeaveGap' },
	{ key: 'z', ctrl: true, action: 'undo' },
	{ key: 'z', ctrl: true, shift: true, action: 'redo' },
	{ key: 's', action: 'split' },
	{ key: 'c', ctrl: true, action: 'copy' },
	{ key: 'v', ctrl: true, action: 'paste' },
	{ key: 'd', ctrl: true, action: 'duplicate' }
]

export const useKeyboardShortcuts = (handlers: Record<string, () => void>) => {
	const pressedKeys = ref<Set<string>>(new Set())

	const handleKeyDown = (event: KeyboardEvent) => {
		pressedKeys.value.add(event.key.toLowerCase())

		const matches = shortcuts.filter(shortcut => {
			const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase()
			const ctrlMatch = !shortcut.ctrl || event.ctrlKey || event.metaKey
			const shiftMatch = !shortcut.shift || event.shiftKey
			const altMatch = !shortcut.alt || event.altKey

			return keyMatch && ctrlMatch && shiftMatch && altMatch
		})

		if (matches.length > 0) {
			const match = matches[0]
			const handler = handlers[match.action]
			if (handler) {
				event.preventDefault()
				handler()
			}
		}
	}

	const handleKeyUp = (event: KeyboardEvent) => {
		pressedKeys.value.delete(event.key.toLowerCase())
	}

	onMounted(() => {
		window.addEventListener('keydown', handleKeyDown)
		window.addEventListener('keyup', handleKeyUp)
	})

	onUnmounted(() => {
		window.removeEventListener('keydown', handleKeyDown)
		window.removeEventListener('keyup', handleKeyUp)
	})

	return {
		pressedKeys: readonly(pressedKeys)
	}
}

