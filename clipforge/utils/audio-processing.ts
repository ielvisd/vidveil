export interface AudioConfig {
	normalize?: boolean
	compression?: boolean
	eqBands?: number[]
}

export const normalizeAudio = async (audioBuffer: AudioBuffer): Promise<AudioBuffer> => {
	// Find peak
	const channelData = audioBuffer.getChannelData(0)
	const max = Math.max(...Array.from(channelData.map(Math.abs)))
	
	// Normalize to -1.0
	const ratio = 1.0 / max
	
	const normalizedBuffer = new AudioBuffer({
		numberOfChannels: audioBuffer.numberOfChannels,
		length: audioBuffer.length,
		sampleRate: audioBuffer.sampleRate
	})
	
	for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
		const source = audioBuffer.getChannelData(ch)
		const dest = normalizedBuffer.getChannelData(ch)
		for (let i = 0; i < source.length; i++) {
			dest[i] = source[i] * ratio
		}
	}
	
	return normalizedBuffer
}

export const mixAudio = (buffers: AudioBuffer[]): AudioBuffer => {
	// Find max length
	const maxLength = Math.max(...buffers.map(b => b.length))
	const sampleRate = buffers[0].sampleRate
	
	const mixed = new AudioBuffer({
		numberOfChannels: 2,
		length: maxLength,
		sampleRate
	})
	
	const channelData = [mixed.getChannelData(0), mixed.getChannelData(1)]
	
	buffers.forEach(buffer => {
		const ch0 = buffer.getChannelData(0)
		const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0
		
		for (let i = 0; i < Math.min(ch0.length, maxLength); i++) {
			channelData[0][i] += ch0[i] / buffers.length
			channelData[1][i] += ch1[i] / buffers.length
		}
	})
	
	return mixed
}

