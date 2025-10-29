import { ref } from 'vue'
import { useRecordingWindow } from './useRecordingWindow'

// Check if running in Tauri
const isTauri = () => {
	return typeof window !== 'undefined' && '__TAURI__' in window
}

// Polyfill for getDisplayMedia in Tauri
const getDisplayMediaPolyfill = async (constraints: any) => {
	if (isTauri()) {
		// In Tauri, we need to use a workaround
		// Try to access the API through electron-like methods or use window.open
		try {
			// Attempt 1: Direct access (works in some Tauri webviews)
			if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
				return await navigator.mediaDevices.getDisplayMedia(constraints)
			}
			
			// Attempt 2: Use getUserMedia as fallback (won't capture screen, but won't crash)
			console.warn('⚠️ getDisplayMedia not available in Tauri, using getUserMedia fallback')
			throw new Error('Screen recording is not available in desktop mode. Please use browser mode (bun run dev) for recording.')
		} catch (err) {
			throw new Error('Screen recording requires browser mode. Run: bun run dev')
		}
	} else {
		// Browser mode - use standard API
		return await navigator.mediaDevices.getDisplayMedia(constraints)
	}
}

export const useScreenCapture = () => {
	const screenStream = ref<MediaStream | null>(null)
	const webcamStream = ref<MediaStream | null>(null)
	const isRecording = ref(false)
	const includeWebcam = ref(false)
	const recordedScreenBlob = ref<Blob | null>(null)
	const recordedWebcamBlob = ref<Blob | null>(null)
	const recordedScreenBlobUrl = ref<string | null>(null)
	const recordedWebcamBlobUrl = ref<string | null>(null)
	const error = ref<string | null>(null)
	
	// Recording window management
	const { setupRecordingMode, teardownRecordingMode } = useRecordingWindow()
	
	let screenRecorder: MediaRecorder | null = null
	let webcamRecorder: MediaRecorder | null = null
	let screenChunks: Blob[] = []
	let webcamChunks: Blob[] = []

	const startRecording = async () => {
		try {
			error.value = null
			screenChunks = []
			webcamChunks = []

		// Check if in Tauri - use native recording
		if (isTauri()) {
			const { invoke } = await import('@tauri-apps/api/core')
			const { getScreens, startRecording: startNative, checkScreenRecordingPermission } = (await import('./useNativeRecording')).useNativeRecording()
			
			try {
				// Get available screens
				const screens = await getScreens()
				
				if (screens.length === 0) {
					throw new Error('No screens available for recording')
				}
				
				// Use primary screen or first available
				const primaryScreen = screens.find(s => s.is_primary) || screens[0]
				
				// Check permissions BEFORE starting recording
				console.log('🔍 Checking screen recording permissions...')
				const hasPermission = await checkScreenRecordingPermission(primaryScreen.id)
				
				if (!hasPermission) {
					const errorMsg = 'Screen recording permission not granted. Please check System Settings > Privacy & Security > Screen Recording and ensure VidVeil is enabled. You may need to restart the app after granting permission.'
					error.value = errorMsg
					throw new Error(errorMsg)
				}
				
				console.log('✅ Screen recording permission confirmed')
				
				// Generate output path in Movies folder
				const timestamp = Date.now()
				const homeDir = '/Users/' + (await invoke('get_username') as string).trim()
				const recordingsDir = `${homeDir}/Movies/VidVeil`
				
				// Create directory if it doesn't exist
				await invoke('create_recordings_directory', { path: recordingsDir })
				
				const outputPath = `${recordingsDir}/recording-${timestamp}.mp4`
				
				// Start native recording (this will wait for AVFoundation to initialize)
				console.log('🎬 Starting native recording...')
				console.log('📷 Include webcam:', includeWebcam.value)
				
				// Don't set isRecording yet - wait for actual confirmation
				const resultPath = await startNative(primaryScreen.id, true, outputPath, includeWebcam.value)
				
				if (!resultPath) {
					throw new Error('Failed to start native recording')
				}
				
				// Wait a bit more for AVFoundation to fully initialize
				await new Promise(resolve => setTimeout(resolve, 1000))
				
				// Now set isRecording AFTER we're confident it's actually recording
				isRecording.value = true
				console.log('✅ Native recording started successfully:', resultPath)
				
				// Setup recording mode: minimize window, register global shortcut, show notification
				// Only do this AFTER permissions are confirmed (so permission dialog can appear if needed)
				try {
					await setupRecordingMode(() => {
						// Callback to stop recording when shortcut is pressed
						stopRecording()
					})
					console.log('✅ Window minimized and shortcuts registered')
				} catch (err) {
					console.warn('⚠️ Failed to setup recording window mode:', err)
					// Continue anyway - recording is still active, just won't auto-minimize
				}
				
				return
			} catch (err: any) {
				console.error('Failed to start native recording:', err)
				error.value = err.message || 'Failed to start native recording'
				throw err
			}
		}

			// Request screen capture
			const displayStream = await getDisplayMediaPolyfill({
				video: {
					cursor: 'always',
					displaySurface: 'monitor'
				} as any,
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					sampleRate: 44100
				} as any
			})

			screenStream.value = displayStream

			// Request webcam if enabled
			if (includeWebcam.value) {
				try {
					const camStream = await navigator.mediaDevices.getUserMedia({
						video: {
							width: { ideal: 1280 },
							height: { ideal: 720 },
							facingMode: 'user'
						},
						audio: {
							echoCancellation: true,
							noiseSuppression: true,
							sampleRate: 44100
						}
					})
					webcamStream.value = camStream

					// Merge webcam audio (microphone) with screen audio
					try {
						const hasScreenAudio = displayStream.getAudioTracks().length > 0
						const hasMicAudio = camStream.getAudioTracks().length > 0
						
						console.log('🎙️ Audio setup:', { hasScreenAudio, hasMicAudio })
						
						// Only mix if we have both audio sources
						if (hasScreenAudio && hasMicAudio) {
							const audioContext = new AudioContext()
							const destination = audioContext.createMediaStreamDestination()
							
							// Create gain nodes to prevent clipping and improve quality
							const screenGain = audioContext.createGain()
							const micGain = audioContext.createGain()
							
							// Reduce screen audio slightly, boost mic
							screenGain.gain.value = 0.7  // 70% system audio
							micGain.gain.value = 1.2     // 120% microphone (clearer voice)
							
							// Connect screen audio
							const screenSource = audioContext.createMediaStreamSource(displayStream)
							screenSource.connect(screenGain)
							screenGain.connect(destination)
							console.log('🔊 Added screen audio (70% volume)')
							
							// Connect microphone audio
							const micSource = audioContext.createMediaStreamSource(camStream)
							micSource.connect(micGain)
							micGain.connect(destination)
							console.log('🎤 Added microphone audio (120% volume for clarity)')
							
							// Replace screen audio tracks with merged audio
							displayStream.getAudioTracks().forEach(track => {
								displayStream.removeTrack(track)
								track.stop()
							})
							destination.stream.getAudioTracks().forEach(track => displayStream.addTrack(track))
							
							console.log('✅ Audio mixing complete - voice should be clear!')
						} else if (hasMicAudio) {
							// No screen audio, just use microphone
							console.log('🎤 Using microphone audio only (no system audio)')
							camStream.getAudioTracks().forEach(track => displayStream.addTrack(track.clone()))
						} else {
							console.log('🔇 No audio sources available')
						}
					} catch (audioErr) {
						console.warn('⚠️ Audio mixing failed:', audioErr)
						// Fallback: just add microphone track if available
						if (camStream.getAudioTracks().length > 0) {
							console.log('📎 Fallback: Adding microphone track directly')
							camStream.getAudioTracks().forEach(track => displayStream.addTrack(track.clone()))
						}
					}
				} catch (err) {
					console.warn('Webcam access denied, continuing with screen only:', err)
					includeWebcam.value = false
				}
			}

		// Determine best codec - fallback to vp8 if vp9 not supported
		const getSupportedMimeType = () => {
			const types = [
				'video/webm;codecs=vp9,opus',
				'video/webm;codecs=vp8,opus',
				'video/webm;codecs=vp9',
				'video/webm;codecs=vp8',
				'video/webm'
			]
			for (const type of types) {
				if (MediaRecorder.isTypeSupported(type)) {
					console.log('✅ Using codec:', type)
					return type
				}
			}
			return 'video/webm'
		}

		const mimeType = getSupportedMimeType()

		// Setup screen recorder
		screenRecorder = new MediaRecorder(displayStream, {
			mimeType,
			videoBitsPerSecond: 2500000
		})

		screenRecorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				screenChunks.push(event.data)
				console.log('📦 Screen chunk:', event.data.size, 'bytes')
			}
		}

		screenRecorder.onstop = () => {
			const blob = new Blob(screenChunks, { type: mimeType })
			console.log('🎬 Screen recording complete:', (blob.size / 1024 / 1024).toFixed(2), 'MB')
			recordedScreenBlob.value = blob
		}

		screenRecorder.onerror = (event: any) => {
			console.error('❌ Screen recorder error:', event.error)
		}

		// Setup webcam recorder if available
		if (webcamStream.value) {
			webcamRecorder = new MediaRecorder(webcamStream.value, {
				mimeType,
				videoBitsPerSecond: 1500000
			})

			webcamRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					webcamChunks.push(event.data)
					console.log('📦 Webcam chunk:', event.data.size, 'bytes')
				}
			}

			webcamRecorder.onstop = () => {
				const blob = new Blob(webcamChunks, { type: mimeType })
				console.log('📷 Webcam recording complete:', (blob.size / 1024 / 1024).toFixed(2), 'MB')
				recordedWebcamBlob.value = blob
			}

			webcamRecorder.onerror = (event: any) => {
				console.error('❌ Webcam recorder error:', event.error)
			}

			webcamRecorder.start(1000)
		}

		screenRecorder.start(1000)
		isRecording.value = true

		// Setup recording mode: minimize window, register global shortcut, show notification
		try {
			await setupRecordingMode(() => {
				// Callback to stop recording when shortcut is pressed
				stopRecording()
			})
		} catch (err) {
			console.warn('⚠️ Failed to setup recording window mode:', err)
			// Continue anyway - recording is still active
		}

		// Stop recording when user stops sharing screen
		const videoTrack = displayStream.getVideoTracks()[0]
		if (videoTrack) {
			videoTrack.addEventListener('ended', () => {
				stopRecording()
			})
		}

		} catch (err: any) {
			error.value = err.message || 'Failed to start recording'
			console.error('Recording error:', err)
			stopRecording()
		}
	}

	const stopRecording = async () => {
		// Handle native recording stop (Tauri)
		if (isTauri()) {
			try {
				const { invoke } = await import('@tauri-apps/api/core')
				const { stopRecording: stopNative } = (await import('./useNativeRecording')).useNativeRecording()
				const outputPath = await stopNative()
				
				if (outputPath) {
					console.log('✅ Native recording stopped:', outputPath)
					
					// Wait a moment for AVFoundation to finalize the file
					await new Promise(resolve => setTimeout(resolve, 500))
					
					// For native recordings, we keep the file on disk instead of IndexedDB
					// The file already exists at outputPath - no need to duplicate it
					console.log('✅ Native recording saved to disk:', outputPath)
					console.log('📁 File location: ~/Movies/VidVeil/')
					
					// Create blob URLs for preview/playback from separate recording files
					try {
						// Wait for the files to be fully written (with retry logic)
						console.log('⏳ Waiting for files to be written...')
						let fileReadSuccessful = false
						const maxRetries = 5
						
						for (let attempt = 0; attempt < maxRetries && !fileReadSuccessful; attempt++) {
							try {
								await new Promise(resolve => setTimeout(resolve, 2000 + (attempt * 1000)))
								
								console.log(`🔍 Attempt ${attempt + 1}/${maxRetries}: Checking if screen file exists:`, outputPath)
								
								// Read screen recording
								const fileBytes = await invoke('read_video_file', { filePath: outputPath }) as number[]
								
								// Verify file was read successfully
								if (!fileBytes || fileBytes.length === 0) {
									console.warn(`⚠️ Screen file is empty (attempt ${attempt + 1}/${maxRetries}), retrying...`)
									continue
								}
								
								console.log(`✅ Read ${fileBytes.length} bytes from screen recording file`)
								
								const blob = new Blob([new Uint8Array(fileBytes)], { type: 'video/mp4' })
								
								// Verify blob size
								if (blob.size === 0) {
									console.warn(`⚠️ Screen blob is empty (attempt ${attempt + 1}/${maxRetries}), retrying...`)
									continue
								}
								
								console.log(`✅ Created blob with size: ${(blob.size / 1024 / 1024).toFixed(2)} MB, type: ${blob.type}`)
								
								// Set the blob - this will trigger the watch handler in recorder.vue
								recordedScreenBlob.value = blob
								
								// Also set the blob URL directly (for compatibility)
								recordedScreenBlobUrl.value = URL.createObjectURL(blob)
								
								console.log('📹 Screen recording blob size:', (blob.size / 1024 / 1024).toFixed(2), 'MB')
								console.log('📹 Screen blob URL created:', recordedScreenBlobUrl.value.substring(0, 50) + '...')
								fileReadSuccessful = true
							} catch (readErr: any) {
								console.error(`❌ Failed to read screen file (attempt ${attempt + 1}/${maxRetries}):`, {
									message: readErr.message,
									stack: readErr.stack,
									outputPath
								})
								if (attempt < maxRetries - 1) {
									console.warn(`⚠️ Retrying in ${2000 + (attempt * 1000)}ms...`)
									continue
								} else {
									throw readErr
								}
							}
						}
						
						if (!fileReadSuccessful) {
							const errorMsg = 'Failed to read screen recording file after multiple attempts. The file may be corrupted or still being written.'
							console.error('❌', errorMsg, { outputPath, maxRetries })
							throw new Error(errorMsg)
						}
						
						// Try to read webcam recording if it exists
						const webcamPath = outputPath.replace('.mp4', '-webcam.mp4')
						try {
							console.log('🔍 Checking if webcam file exists:', webcamPath)
							const webcamBytes = await invoke('read_video_file', { filePath: webcamPath }) as number[]
							
							if (webcamBytes && webcamBytes.length > 0) {
								const webcamBlob = new Blob([new Uint8Array(webcamBytes)], { type: 'video/mp4' })
								
								if (webcamBlob.size > 0) {
									recordedWebcamBlob.value = webcamBlob
									recordedWebcamBlobUrl.value = URL.createObjectURL(webcamBlob)
									
									console.log('📹 Webcam blob size:', (webcamBlob.size / 1024 / 1024).toFixed(2), 'MB')
									console.log('✅ Both recordings ready for preview')
								} else {
									console.warn('📷 Webcam blob is empty, skipping')
									recordedWebcamBlob.value = null
									recordedWebcamBlobUrl.value = ''
								}
							} else {
								throw new Error('Webcam file is empty')
							}
						} catch (webcamErr: any) {
							console.log('📷 No webcam recording found (this is normal if webcam was disabled):', webcamErr.message)
							recordedWebcamBlob.value = null
							recordedWebcamBlobUrl.value = ''
						}
						
						console.log('✅ Recording ready for preview')
						
					} catch (err: any) {
						console.error('❌ Failed to create preview:', {
							message: err.message,
							stack: err.stack,
							outputPath,
							hasOutputPath: !!outputPath
						})
						
						// Set screen blob to null if read failed, so UI can show appropriate error
						recordedScreenBlob.value = null
						recordedScreenBlobUrl.value = ''
						
						// Don't throw - the file still exists on disk even if preview fails
						console.warn('⚠️ Preview failed but recording may be saved to:', outputPath)
						
						// Try to check if file exists using file system
						try {
							const fileInfo = await invoke('get_file_info', { filePath: outputPath })
							console.log('📁 File info:', fileInfo)
						} catch (fsErr: any) {
							console.error('❌ File system check failed:', {
								message: fsErr.message,
								outputPath
							})
						}
						
						// Set error message for UI
						error.value = `Failed to load preview: ${err.message}. The recording may still be saved at ${outputPath}`
					}
				}
				
				isRecording.value = false
				
				// Teardown recording mode: restore window, unregister shortcut
				try {
					await teardownRecordingMode()
				} catch (err) {
					console.warn('⚠️ Failed to teardown recording window mode:', err)
				}
				
				return outputPath
			} catch (err: any) {
				console.error('Failed to stop native recording:', err)
				error.value = err.message || 'Failed to stop recording'
				isRecording.value = false
				
				// Teardown even on error
				try {
					await teardownRecordingMode()
				} catch (teardownErr) {
					console.warn('⚠️ Failed to teardown recording window mode:', teardownErr)
				}
				
				return null
			}
		}
		
		// Browser mode recording stop
		if (screenRecorder && screenRecorder.state !== 'inactive') {
			screenRecorder.stop()
		}

		if (webcamRecorder && webcamRecorder.state !== 'inactive') {
			webcamRecorder.stop()
		}

		// Stop all tracks
		if (screenStream.value) {
			screenStream.value.getTracks().forEach(track => track.stop())
		}

		if (webcamStream.value) {
			webcamStream.value.getTracks().forEach(track => track.stop())
		}

		isRecording.value = false
		
		// Teardown recording mode: restore window, unregister shortcut
		try {
			await teardownRecordingMode()
		} catch (err) {
			console.warn('⚠️ Failed to teardown recording window mode:', err)
		}
	}

	const reset = () => {
		recordedScreenBlob.value = null
		recordedWebcamBlob.value = null
		screenChunks = []
		webcamChunks = []
		error.value = null
	}

	const captureFrame = async (videoElement: HTMLVideoElement): Promise<Blob | null> => {
		const canvas = document.createElement('canvas')
		canvas.width = videoElement.videoWidth
		canvas.height = videoElement.videoHeight

		const ctx = canvas.getContext('2d')
		if (!ctx) return null

		ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
		return new Promise(resolve => {
			canvas.toBlob(resolve, 'image/png')
		})
	}

	return {
		screenStream,
		webcamStream,
		isRecording,
		includeWebcam,
		recordedScreenBlob,
		recordedWebcamBlob,
		recordedScreenBlobUrl,
		recordedWebcamBlobUrl,
		error,
		startRecording,
		stopRecording,
		reset,
		captureFrame
	}
}
