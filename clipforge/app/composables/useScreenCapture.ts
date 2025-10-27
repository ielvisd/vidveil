import { ref } from 'vue'

export const useScreenCapture = () => {
	const isRecording = ref(false)
	const stream = ref<MediaStream | null>(null)
	const error = ref<string | null>(null)
	const recordedBlob = ref<Blob | null>(null)

	const startRecording = async (source?: string) => {
		try {
			error.value = null

			const displayMedia = await navigator.mediaDevices.getDisplayMedia({
				video: {
					mediaSource: source as any,
					width: { ideal: 1920 },
					height: { ideal: 1080 }
				},
				audio: true
			})

			stream.value = displayMedia
			isRecording.value = true

			// Handle stream ended
			displayMedia.getVideoTracks()[0].addEventListener('ended', () => {
				stopRecording()
			})

			return displayMedia
		} catch (err: any) {
			error.value = err.message
			throw err
		}
	}

	const stopRecording = () => {
		if (stream.value) {
			stream.value.getTracks().forEach(track => track.stop())
			stream.value = null
		}
		isRecording.value = false
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
		isRecording,
		stream,
		error,
		recordedBlob,
		startRecording,
		stopRecording,
		captureFrame
	}
}

