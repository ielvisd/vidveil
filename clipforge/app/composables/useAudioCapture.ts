import { ref } from 'vue'

export const useAudioCapture = () => {
	const isRecording = ref(false)
	const stream = ref<MediaStream | null>(null)
	const audioLevel = ref(0)
	const error = ref<string | null>(null)

	const startRecording = async () => {
		try {
			error.value = null

			const audioStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					echoCancellation: true,
					noiseSuppression: true,
					autoGainControl: true
				}
			})

			stream.value = audioStream
			isRecording.value = true

			// Monitor audio levels
			const audioContext = new AudioContext()
			const analyser = audioContext.createAnalyser()
			const microphone = audioContext.createMediaStreamSource(audioStream)
			microphone.connect(analyser)

			analyser.fftSize = 256
			const bufferLength = analyser.frequencyBinCount
			const dataArray = new Uint8Array(bufferLength)

			const updateLevel = () => {
				analyser.getByteFrequencyData(dataArray)
				const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
				audioLevel.value = average
				
				if (isRecording.value) {
					requestAnimationFrame(updateLevel)
				}
			}

			updateLevel()

			return audioStream
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
		audioLevel.value = 0
	}

	return {
		isRecording,
		stream,
		audioLevel,
		error,
		startRecording,
		stopRecording
	}
}

