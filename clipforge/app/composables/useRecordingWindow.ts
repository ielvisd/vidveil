import { ref } from 'vue'

/**
 * Composables for managing window state during recording
 * - Auto-minimize when recording starts
 * - Auto-restore when recording stops
 * - Global keyboard shortcut (Cmd/Ctrl+Shift+S)
 * - System tray integration
 */

const STOP_SHORTCUT = 'CommandOrControl+Shift+S' // Works on Mac (Cmd) and Windows/Linux (Ctrl)

export const useRecordingWindow = () => {
	const isMinimized = ref(false)
	const globalShortcutRegistered = ref(false)
	const stopRecordingCallback = ref<(() => void) | null>(null)
	const trayListenerRegistered = ref(false)
	const trayUnlisten = ref<(() => void) | null>(null)

	/**
	 * Minimize the app window
	 */
	const minimizeWindow = async () => {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) {
			return
		}

		try {
			// Try using the command first (more reliable)
			const { invoke } = await import('@tauri-apps/api/core')
			await invoke('minimize_window')
			isMinimized.value = true
			console.log('✅ Window minimized')
		} catch (error) {
			// Fallback to direct window API
			try {
				const { getCurrentWindow } = await import('@tauri-apps/api/window')
				const appWindow = getCurrentWindow()
				await appWindow.minimize()
				isMinimized.value = true
				console.log('✅ Window minimized (fallback)')
			} catch (fallbackError) {
				console.error('Failed to minimize window:', fallbackError)
			}
		}
	}

	/**
	 * Restore/show the app window
	 */
	const restoreWindow = async () => {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) {
			return
		}

		try {
			const { getCurrentWindow } = await import('@tauri-apps/api/window')
			const appWindow = getCurrentWindow()
			
			// Show the window first
			await appWindow.show()
			
			// Unminimize if minimized
			await appWindow.unminimize()
			
			// Bring to front and focus
			await appWindow.setFocus()
			
			// Small delay to ensure window is fully visible before continuing
			await new Promise(resolve => setTimeout(resolve, 100))
			
			isMinimized.value = false
			console.log('✅ Window restored and focused')
		} catch (error) {
			console.error('❌ Failed to restore window:', error)
			// Try fallback: use invoke command
			try {
				const { invoke } = await import('@tauri-apps/api/core')
				await invoke('show_window')
				console.log('✅ Window restored (fallback)')
			} catch (fallbackError) {
				console.error('❌ Fallback window restore also failed:', fallbackError)
			}
		}
	}

	/**
	 * Register global keyboard shortcut for stopping recording
	 */
	const registerGlobalShortcut = async (onStop: () => void) => {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) {
			return
		}

		try {
			const { register, unregister, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut')

			// Unregister any existing shortcut first
			if (globalShortcutRegistered.value) {
				await unregisterAll()
			}

			// Register the stop shortcut
			await register(STOP_SHORTCUT, async () => {
				console.log('🛑 Global shortcut pressed - stopping recording')
				// Call stop recording (this will also restore via teardownRecordingMode)
				await onStop()
				// Ensure window is restored (in case teardown didn't complete)
				await restoreWindow()
			})

			globalShortcutRegistered.value = true
			stopRecordingCallback.value = onStop
			console.log('✅ Global shortcut registered:', STOP_SHORTCUT)
		} catch (error) {
			console.error('Failed to register global shortcut:', error)
		}
	}

	/**
	 * Unregister global shortcut
	 */
	const unregisterGlobalShortcut = async () => {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) {
			return
		}

		if (!globalShortcutRegistered.value) {
			return
		}

		try {
			const { unregister, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut')
			// Try to unregister specific shortcut first, then unregister all as fallback
			try {
				await unregister(STOP_SHORTCUT)
			} catch {
				// If specific unregister fails, unregister all
				await unregisterAll()
			}
			globalShortcutRegistered.value = false
			stopRecordingCallback.value = null
			console.log('✅ Global shortcut unregistered')
		} catch (error) {
			console.error('Failed to unregister global shortcut:', error)
		}
	}

	/**
	 * Show notification when recording starts
	 */
	const showRecordingStartedNotification = async () => {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) {
			return
		}

		try {
			const { sendNotification } = await import('@tauri-apps/plugin-notification')
			
			await sendNotification({
				title: 'Recording Started',
				body: `Press ${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Shift+S to stop`,
				icon: undefined, // Use default app icon
				sound: 'default'
			})
		} catch (error) {
			console.error('Failed to show notification:', error)
		}
	}

	/**
	 * Setup: minimize window, register shortcut, show notification
	 */
	const setupRecordingMode = async (onStop: () => void) => {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) {
			return
		}

		try {
			// CRITICAL: Register callback FIRST before setting up tray listener
			// This ensures the callback is available when the tray event fires
			stopRecordingCallback.value = onStop
			
			// Register global shortcut (also sets the callback, but we set it above first)
			await registerGlobalShortcut(onStop)
			
			// Setup tray listener AFTER callback is registered
			await setupTrayListener(onStop)
			
			// Minimize window
			await minimizeWindow()
			
			// Show notification
			await showRecordingStartedNotification()
		} catch (err) {
			console.error('❌ Failed to setup recording mode:', err)
			throw err
		}
	}

	/**
	 * Teardown: restore window, unregister shortcut, cleanup tray listener
	 */
	const teardownRecordingMode = async () => {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) {
			return
		}

		try {
			// Cleanup tray listener
			await cleanupTrayListener()
			
			// Unregister global shortcut
			await unregisterGlobalShortcut()
			
			// Clear callback
			stopRecordingCallback.value = null
			
			// Restore window
			await restoreWindow()
		} catch (err) {
			console.error('❌ Failed to teardown recording mode:', err)
		}
	}

	/**
	 * Setup tray event listener
	 * Must be called AFTER stopRecordingCallback is set
	 */
	const setupTrayListener = async (onStop: () => void) => {
		if (typeof window === 'undefined' || !('__TAURI__' in window)) {
			return
		}

		// Prevent multiple registrations
		if (trayListenerRegistered.value) {
			console.log('⚠️ Tray listener already registered, skipping')
			return
		}

		try {
			const { listen } = await import('@tauri-apps/api/event')
			
			// Listen for tray "stop recording" event
			const unlisten = await listen('tray-stop-recording', async () => {
				console.log('🛑 Tray menu stop recording clicked')
				if (stopRecordingCallback.value) {
					// Call stop recording (this will also restore via teardownRecordingMode)
					await stopRecordingCallback.value()
					// Ensure window is restored (in case teardown didn't complete)
					await restoreWindow()
				} else {
					console.warn('⚠️ Tray stop recording clicked but callback is null')
					// Try calling the passed callback as fallback
					await onStop()
					// Ensure window is restored
					await restoreWindow()
				}
			})
			
			trayUnlisten.value = unlisten
			trayListenerRegistered.value = true
			console.log('✅ Tray listener registered')
		} catch (err) {
			console.error('Failed to setup tray event listener:', err)
		}
	}

	/**
	 * Cleanup tray listener
	 */
	const cleanupTrayListener = async () => {
		if (trayUnlisten.value) {
			try {
				trayUnlisten.value()
				trayUnlisten.value = null
				trayListenerRegistered.value = false
				console.log('✅ Tray listener cleaned up')
			} catch (err) {
				console.error('Failed to cleanup tray listener:', err)
			}
		}
	}

	// No need for onMounted/onUnmounted here since this is called from useScreenCapture
	// The composable is called when needed, not per-component

	return {
		isMinimized,
		setupRecordingMode,
		teardownRecordingMode,
		minimizeWindow,
		restoreWindow
	}
}

