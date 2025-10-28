import { ref } from 'vue'

// Check if running in Tauri
const isTauri = () => {
	return typeof window !== 'undefined' && '__TAURI__' in window
}

export const useRecorderBridge = () => {
	const isProcessing = ref(false)

	/**
	 * Send recording complete event from recorder window to main window
	 */
	const sendRecordingComplete = async (
		screenBlob: Blob,
		webcamBlob: Blob | null,
		projectId: string
	) => {
		if (!isTauri()) {
			console.warn('sendRecordingComplete called in non-Tauri environment')
			return
		}

		try {
			isProcessing.value = true
			
			// Import Tauri APIs dynamically
			const { emit } = await import('@tauri-apps/api/event')
			
			// Convert blobs to base64 for transfer
			const screenBase64 = await blobToBase64(screenBlob)
			const webcamBase64 = webcamBlob ? await blobToBase64(webcamBlob) : null

			// Emit event to main window
			await emit('recording-complete', {
				projectId,
				screenData: screenBase64,
				webcamData: webcamBase64,
				screenSize: screenBlob.size,
				webcamSize: webcamBlob?.size || 0,
				timestamp: Date.now()
			})

			console.log('✅ Recording sent to main window')
		} catch (err) {
			console.error('Failed to send recording:', err)
			throw err
		} finally {
			isProcessing.value = false
		}
	}

	/**
	 * Listen for recording complete events in main window
	 */
	const listenForRecordings = (callback: (data: any) => void) => {
		if (!isTauri()) {
			console.warn('listenForRecordings called in non-Tauri environment')
			return
		}

		// Import Tauri APIs dynamically
		import('@tauri-apps/api/event').then(({ listen }) => {
			listen('recording-complete', (event) => {
				console.log('📥 Received recording from recorder window')
				callback(event.payload)
			})
		})
	}

	/**
	 * Convert Blob to base64 string
	 */
	const blobToBase64 = (blob: Blob): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.onloadend = () => {
				const result = reader.result as string
				// Remove data URL prefix
				const base64 = result.split(',')[1] || ''
				if (!base64) {
					reject(new Error('Failed to convert blob to base64'))
					return
				}
				resolve(base64)
			}
			reader.onerror = reject
			reader.readAsDataURL(blob)
		})
	}

	/**
	 * Convert base64 string back to Blob
	 */
	const base64ToBlob = (base64: string, mimeType: string = 'video/webm'): Blob => {
		const byteCharacters = atob(base64)
		const byteNumbers = new Array(byteCharacters.length)
		
		for (let i = 0; i < byteCharacters.length; i++) {
			byteNumbers[i] = byteCharacters.charCodeAt(i)
		}
		
		const byteArray = new Uint8Array(byteNumbers)
		return new Blob([byteArray], { type: mimeType })
	}

	return {
		isProcessing,
		sendRecordingComplete,
		listenForRecordings,
		base64ToBlob
	}
}

