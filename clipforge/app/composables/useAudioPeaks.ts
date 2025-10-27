export const useAudioPeaks = () => {
	const peaks = ref<number[]>([])
	const audioContext = ref<AudioContext | null>(null)

	const loadAudioFile = async (url: string): Promise<number[]> => {
		try {
			const response = await fetch(url)
			const arrayBuffer = await response.arrayBuffer()
			
			audioContext.value = new AudioContext()
			const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
			
			const channelData = audioBuffer.getChannelData(0)
			const sampleRate = audioBuffer.sampleRate
			const samples = audioBuffer.length
			const binSize = Math.floor(samples / 100) // 100 bins
			
			const newPeaks: number[] = []
			for (let i = 0; i < 100; i++) {
				let sum = 0
				for (let j = 0; j < binSize; j++) {
					const idx = i * binSize + j
					if (idx < samples) {
						sum += Math.abs(channelData[idx])
					}
				}
				newPeaks.push(sum / binSize)
			}
			
			peaks.value = newPeaks
			return newPeaks
		} catch (error) {
			console.error('Failed to load audio file:', error)
			return []
		}
	}

	const getPeakAtTime = (time: number, duration: number): number => {
		if (peaks.value.length === 0) return 0
		
		const index = Math.floor((time / duration) * peaks.value.length)
		return peaks.value[index] || 0
	}

	const getAveragePeak = (startTime: number, endTime: number, duration: number): number => {
		if (peaks.value.length === 0) return 0
		
		const startIndex = Math.floor((startTime / duration) * peaks.value.length)
		const endIndex = Math.floor((endTime / duration) * peaks.value.length)
		
		const slice = peaks.value.slice(startIndex, endIndex)
		if (slice.length === 0) return 0
		
		return slice.reduce((sum, peak) => sum + peak, 0) / slice.length
	}

	const clearPeaks = () => {
		peaks.value = []
		if (audioContext.value) {
			audioContext.value.close()
			audioContext.value = null
		}
	}

	return {
		peaks,
		loadAudioFile,
		getPeakAtTime,
		getAveragePeak,
		clearPeaks
	}
}

