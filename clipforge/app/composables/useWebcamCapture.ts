import { ref } from 'vue'

export const useWebcamCapture = () => {
	const isRecording = ref(false)
	const stream = ref<MediaStream | null>(null)
	const error = ref<string | null>(null)

	const startWebcam = async () => {
		try {
			error.value = null

			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: {
					width: { ideal: 1280 },
					height: { ideal: 720 },
					facingMode: 'user'
				},
				audio: true
			})

			stream.value = mediaStream
			isRecording.value = true

			return mediaStream
		} catch (err: any) {
			error.value = err.message
			throw err
		}
	}

	const stopWebcam = () => {
		if (stream.value) {
			stream.value.getTracks().forEach(track => track.stop())
			stream.value = null
		}
		isRecording.value = false
	}

	const applyPipMask = async (
		videoElement: HTMLVideoElement,
		shape: string = 'circle'
	) => {
		// Apply clip-path based on shape
		const maskType = shape.toLowerCase()
		
		if (maskType === 'circle') {
			videoElement.style.clipPath = 'circle(50% at 50% 50%)'
		} else if (maskType === 'square') {
			videoElement.style.clipPath = 'inset(0)'
		} else if (maskType === 'heart') {
			videoElement.style.clipPath = 'path("M12,21.35l-1.45-1.32C5.4,15.36,2,12.27,2,8.5 C2,5.41,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.08C13.09,3.81,14.76,3,16.5,3 C19.58,3,22,5.41,22,8.5c0,3.77-3.4,6.86-8.55,11.53L12,21.35z")'
		}
	}

	return {
		isRecording,
		stream,
		error,
		startWebcam,
		stopWebcam,
		applyPipMask
	}
}

