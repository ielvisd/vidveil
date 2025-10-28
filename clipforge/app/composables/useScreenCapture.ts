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

					// Merge webcam audio with screen stream
					if (displayStream.getAudioTracks().length > 0) {
						const audioContext = new AudioContext()
						const screenAudio = audioContext.createMediaStreamSource(displayStream)
						const webcamAudio = audioContext.createMediaStreamSource(camStream)
						const destination = audioContext.createMediaStreamDestination()
						
						screenAudio.connect(destination)
						webcamAudio.connect(destination)
						
						// Replace screen audio track with merged audio
						displayStream.getAudioTracks().forEach(track => displayStream.removeTrack(track))
						destination.stream.getAudioTracks().forEach(track => displayStream.addTrack(track))
					}
				} catch (err) {
					console.warn('Webcam access denied, continuing with screen only:', err)
					includeWebcam.value = false
				}
			}

			// Setup screen recorder
			screenRecorder = new MediaRecorder(displayStream, {
				mimeType: 'video/webm;codecs=vp9',
				videoBitsPerSecond: 2500000
			})

			screenRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					screenChunks.push(event.data)
				}
			}

			screenRecorder.onstop = () => {
				recordedScreenBlob.value = new Blob(screenChunks, { type: 'video/webm' })
			}

			// Setup webcam recorder if available
			if (webcamStream.value) {
				webcamRecorder = new MediaRecorder(webcamStream.value, {
					mimeType: 'video/webm;codecs=vp9',
					videoBitsPerSecond: 1500000
				})

				webcamRecorder.ondataavailable = (event) => {
					if (event.data.size > 0) {
						webcamChunks.push(event.data)
					}
				}

				webcamRecorder.onstop = () => {
					recordedWebcamBlob.value = new Blob(webcamChunks, { type: 'video/webm' })
				}

				webcamRecorder.start(1000)
			}

			screenRecorder.start(1000)
			isRecording.value = true

			// Stop recording when user stops sharing screen
			displayStream.getVideoTracks()[0].addEventListener('ended', () => {
				stopRecording()
			})

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
