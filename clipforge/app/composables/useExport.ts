import { ref } from 'vue'
import type { Clip } from '~/types/project'
import { getShapePath } from '~/utils/shapes'

export const useExport = () => {
	const isExporting = ref(false)
	const exportProgress = ref(0)
	const error = ref<string | null>(null)

	const getResolution = (res: string) => {
		switch (res) {
			case '1080p': return { width: 1920, height: 1080 }
			case '720p': return { width: 1280, height: 720 }
			case '480p': return { width: 854, height: 480 }
			default: return { width: 1920, height: 1080 }
		}
	}

	const getBitrate = (quality: string) => {
		switch (quality) {
			case 'high': return 8000000 // 8 Mbps
			case 'medium': return 4000000 // 4 Mbps
			case 'low': return 2000000 // 2 Mbps
			default: return 4000000
		}
	}

	const exportVideo = async (
		clips: Clip[],
		fileName: string,
		settings: {
			resolution: string
			quality: string
			format: string
		}
	) => {
		isExporting.value = true
		exportProgress.value = 0
		error.value = null

		try {
			// Find screen and webcam clips
			const screenClip = clips.find(c => c.metadata?.type === 'screen')
			const webcamClip = clips.find(c => c.metadata?.type === 'webcam')

			if (!screenClip) {
				throw new Error('No screen recording found')
			}

			const { width, height } = getResolution(settings.resolution)
			const bitrate = getBitrate(settings.quality)

			// Create offscreen canvas for compositing
			const canvas = document.createElement('canvas')
			canvas.width = width
			canvas.height = height
			const ctx = canvas.getContext('2d')!

			// Create video elements
			const screenVideo = document.createElement('video')
			screenVideo.src = screenClip.src
			screenVideo.muted = true
			await new Promise((resolve) => {
				screenVideo.onloadedmetadata = resolve
			})

			let webcamVideo: HTMLVideoElement | null = null
			if (webcamClip) {
				webcamVideo = document.createElement('video')
				webcamVideo.src = webcamClip.src
				webcamVideo.muted = true
				await new Promise((resolve) => {
					webcamVideo!.onloadedmetadata = resolve
				})
			}

			// Setup MediaRecorder
			const stream = canvas.captureStream(30) // 30 fps
			
			// Add audio from screen recording
			const audioContext = new AudioContext()
			const screenAudioSource = audioContext.createMediaElementSource(screenVideo)
			const audioDestination = audioContext.createMediaStreamDestination()
			screenAudioSource.connect(audioDestination)
			screenAudioSource.connect(audioContext.destination)
			
			// Add audio track to stream
			const audioTracks = audioDestination.stream.getAudioTracks()
			if (audioTracks.length > 0 && audioTracks[0]) {
				stream.addTrack(audioTracks[0])
			}

			const mimeType = settings.format === 'webm' 
				? 'video/webm;codecs=vp9,opus' 
				: 'video/webm;codecs=h264,opus'

			const mediaRecorder = new MediaRecorder(stream, {
				mimeType,
				videoBitsPerSecond: bitrate
			})

			const chunks: Blob[] = []
			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunks.push(e.data)
				}
			}

			// Start recording
			mediaRecorder.start(100) // Capture every 100ms
			screenVideo.play()
			if (webcamVideo) webcamVideo.play()

			const duration = screenVideo.duration
			const startTime = Date.now()

			// Render loop
			const render = () => {
				const currentTime = (Date.now() - startTime) / 1000

				if (currentTime >= duration) {
					// Export complete
					mediaRecorder.stop()
					screenVideo.pause()
					if (webcamVideo) webcamVideo.pause()
					return
				}

				// Update progress
				exportProgress.value = Math.floor((currentTime / duration) * 100)

				// Clear canvas
				ctx.fillStyle = '#000000'
				ctx.fillRect(0, 0, width, height)

				// Draw screen video
				ctx.drawImage(screenVideo, 0, 0, width, height)

				// Draw webcam overlay with PiP shape
				if (webcamVideo && webcamClip?.pip_config) {
					const pipConfig = webcamClip.pip_config
					const pipX = (pipConfig.x / 100) * width
					const pipY = (pipConfig.y / 100) * height
					const pipWidth = (pipConfig.width / 100) * width
					const pipHeight = (pipConfig.height / 100) * height

					ctx.save()

					// Apply shape mask using clip path
					const shapePath = getShapePath(
						pipConfig.shape || 'circle',
						pipX,
						pipY,
						pipWidth,
						pipHeight
					)

					// Create clipping region
					const path = new Path2D(shapePath)
					ctx.clip(path)

					// Draw webcam with mask
					ctx.drawImage(webcamVideo, pipX, pipY, pipWidth, pipHeight)

					// Draw border if configured
					if (pipConfig.borderWidth && pipConfig.borderColor) {
						ctx.strokeStyle = pipConfig.borderColor
						ctx.lineWidth = pipConfig.borderWidth
						ctx.stroke(path)
					}

					ctx.restore()
				}

				requestAnimationFrame(render)
			}

			// Start rendering
			render()

			// Wait for recording to complete
			await new Promise<void>((resolve) => {
				mediaRecorder.onstop = () => resolve()
			})

			// Create blob and download
			const blob = new Blob(chunks, { 
				type: settings.format === 'webm' ? 'video/webm' : 'video/mp4' 
			})

			// Convert to MP4 if needed (using a simple approach for now)
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = fileName
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)

			// Cleanup
			audioContext.close()

			exportProgress.value = 100
			isExporting.value = false
			return { success: true, outputPath: fileName }
		} catch (err: any) {
			console.error('Export error:', err)
			error.value = err.message || 'Export failed'
			isExporting.value = false
			return { success: false, error: err.message }
		}
	}

	return {
		isExporting,
		exportProgress,
		error,
		exportVideo
	}
}

