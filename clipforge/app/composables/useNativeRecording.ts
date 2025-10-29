import { ref } from 'vue'

export interface ScreenInfo {
	id: string
	name: string
	width: number
	height: number
	is_primary: boolean
}

export const useNativeRecording = () => {
	const availableScreens = ref<ScreenInfo[]>([])
	const isRecording = ref(false)
	const recordingPath = ref<string | null>(null)
	const error = ref<string | null>(null)
	const loading = ref(false)

	// Check if running in Tauri
	const isTauri = () => {
		return typeof window !== 'undefined' && '__TAURI__' in window
	}

	/**
	 * Get list of available screens/displays
	 */
	const getScreens = async (): Promise<ScreenInfo[]> => {
		if (!isTauri()) {
			error.value = 'Native recording only available in desktop app'
			return []
		}

		try {
			loading.value = true
			error.value = null

			const { invoke } = await import('@tauri-apps/api/core')
			const screens = await invoke<ScreenInfo[]>('get_available_screens')
			
			availableScreens.value = screens
			return screens
		} catch (err: any) {
			error.value = err.message || 'Failed to get screens'
			console.error('Failed to get screens:', err)
			return []
		} finally {
			loading.value = false
		}
	}

	/**
	 * Start native screen recording
	 */
	const startRecording = async (
		screenId: string,
		includeAudio: boolean = true,
		outputPath?: string,
		includeWebcam: boolean = false,
		pipShape?: number,
		pipX?: number,
		pipY?: number,
		pipSize?: number
	): Promise<string | null> => {
		if (!isTauri()) {
			error.value = 'Native recording only available in desktop app'
			return null
		}

		try {
			loading.value = true
			error.value = null

			// Generate output path if not provided
			const path = outputPath || `/tmp/vidveil-recording-${Date.now()}.mp4`

			const { invoke } = await import('@tauri-apps/api/core')
			const resultPath = await invoke<string>('start_screen_recording', {
				screenId,
				includeAudio,
				includeWebcam: includeWebcam || false,
				pipShape: pipShape || 0,
				pipX: pipX || 0.8,
				pipY: pipY || 0.8,
				pipSize: pipSize || 0.2,
				outputPath: path
			})

			isRecording.value = true
			recordingPath.value = resultPath

			return resultPath
		} catch (err: any) {
			error.value = err.message || 'Failed to start recording'
			console.error('Failed to start recording:', err)
			isRecording.value = false
			return null
		} finally {
			loading.value = false
		}
	}

	/**
	 * Stop native screen recording
	 */
	const stopRecording = async (): Promise<string | null> => {
		if (!isTauri()) {
			error.value = 'Native recording only available in desktop app'
			return null
		}

		try {
			loading.value = true
			error.value = null

			const { invoke } = await import('@tauri-apps/api/core')
			const path = await invoke<string>('stop_screen_recording')

			isRecording.value = false
			const finalPath = path || recordingPath.value
			recordingPath.value = null

			return finalPath
		} catch (err: any) {
			error.value = err.message || 'Failed to stop recording'
			console.error('Failed to stop recording:', err)
			return null
		} finally {
			loading.value = false
		}
	}

	/**
	 * Check recording status
	 */
	const checkRecordingStatus = async (): Promise<boolean> => {
		if (!isTauri()) {
			return false
		}

		try {
			const { invoke } = await import('@tauri-apps/api/core')
			const recording = await invoke<boolean>('is_recording')
			isRecording.value = recording
			return recording
		} catch (err) {
			console.error('Failed to check recording status:', err)
			return false
		}
	}

	/**
	 * Check screen recording permission status
	 */
	const checkScreenRecordingPermission = async (screenId: string): Promise<boolean> => {
		if (!isTauri()) {
			// In browser mode, permissions are handled by getUserMedia/getDisplayMedia
			return true
		}

		try {
			const { invoke } = await import('@tauri-apps/api/core')
			const granted = await invoke<boolean>('check_screen_recording_permission', {
				screenId
			})
			return granted
		} catch (err: any) {
			console.error('Failed to check screen recording permission:', err)
			error.value = err.message || 'Failed to check permission'
			return false
		}
	}

	return {
		// State
		availableScreens,
		isRecording,
		recordingPath,
		error,
		loading,

		// Methods
		getScreens,
		startRecording,
		stopRecording,
		checkRecordingStatus,
		checkScreenRecordingPermission,
		isTauri
	}
}




