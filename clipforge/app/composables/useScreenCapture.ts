import { ref } from 'vue'

export const useScreenCapture = () => {
	const screenStream = ref<MediaStream | null>(null)
	const webcamStream = ref<MediaStream | null>(null)
	const isRecording = ref(false)
	const includeWebcam = ref(true)
	const recordedScreenBlob = ref<Blob | null>(null)
	const recordedWebcamBlob = ref<Blob | null>(null)
	const error = ref<string | null>(null)
	
	let screenRecorder: MediaRecorder | null = null
	let webcamRecorder: MediaRecorder | null = null
	let screenChunks: Blob[] = []
	let webcamChunks: Blob[] = []

	const startRecording = async () => {
		try {
			error.value = null
			screenChunks = []
			webcamChunks = []

			// Request screen capture
			const displayStream = await navigator.mediaDevices.getDisplayMedia({
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

	const stopRecording = () => {
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
		error,
		startRecording,
		stopRecording,
		reset,
		captureFrame
	}
}
