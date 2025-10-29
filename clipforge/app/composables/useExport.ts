import { ref } from 'vue'
import type { Clip, ExportSettings } from '../../types/project'
import { useFFmpeg } from './useFFmpeg'
import { planVideoComposition, executeCompositionPlan, createPipComposition, generateShapeSVG } from '~/utils/video-compositor'

export const useExport = () => {
	const isExporting = ref(false)
	const exportProgress = ref(0)
	const error = ref<string | null>(null)
	const currentStep = ref('')
	const totalSteps = ref(0)

	const { ffmpeg, loadFFmpeg, writeFile, downloadFile, cleanup, resetProgress } = useFFmpeg()

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
		currentStep.value = ''
		totalSteps.value = 0

		try {
			// Sort clips by timeline order before exporting
			const orderedClips = [...clips].sort((a, b) => {
				const aOrder = a.metadata?.order ?? a.start_time ?? 0
				const bOrder = b.metadata?.order ?? b.start_time ?? 0
				return aOrder - bOrder
			})

			// Ensure FFmpeg is loaded with retry mechanism
			let ffmpegLoaded = false
			let retryCount = 0
			const maxRetries = 3

			while (!ffmpegLoaded && retryCount < maxRetries) {
				try {
					await loadFFmpeg()
					ffmpegLoaded = true
					resetProgress()
				} catch (ffmpegError) {
					retryCount++
					console.warn(`⚠️ FFmpeg load attempt ${retryCount} failed:`, ffmpegError)
					
					if (retryCount >= maxRetries) {
						throw new Error(`Failed to load FFmpeg after ${maxRetries} attempts. Please try again.`)
					}
					
					// Wait before retry
					await new Promise(resolve => setTimeout(resolve, 1000))
				}
			}

			// Find screen and webcam clips
			const screenClip = orderedClips.find(c => c.metadata?.type === 'screen')
			const webcamClip = orderedClips.find(c => c.metadata?.type === 'webcam')

			if (!screenClip) {
				throw new Error('No screen recording found')
			}

			// Create PiP composition if webcam clip exists
			let pipComposition = null
			if (webcamClip && webcamClip.pip_config) {
				pipComposition = createPipComposition(orderedClips, webcamClip.pip_config)
			}

			// Plan the composition workflow
			const exportSettings: ExportSettings = {
				resolution: settings.resolution,
				quality: settings.quality,
				format: settings.format,
				preset: 'medium'
			}

			const compositionPlan = planVideoComposition(orderedClips, exportSettings, pipComposition || undefined)
			totalSteps.value = compositionPlan.steps.length

			// Write input files to FFmpeg virtual filesystem
			currentStep.value = 'Preparing files...'
			exportProgress.value = 5

			for (let i = 0; i < orderedClips.length; i++) {
				const clip = orderedClips[i]
				const inputFile = `clip_${i}.${getFileExtension(clip.src)}`
				
				// Fetch file data
				const response = await fetch(clip.src)
				const fileData = await response.arrayBuffer()
				
				await writeFile(inputFile, fileData)
			}

			// Generate PiP shape mask if needed
			if (pipComposition) {
				const { pipConfig } = pipComposition
				const svgContent = generateShapeSVG(
					pipConfig.shape,
					pipConfig.width,
					pipConfig.height
				)
				
				// Convert SVG to blob
				const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' })
				await writeFile('pip_shape.svg', svgBlob)
			}

			// Execute composition plan
			currentStep.value = 'Processing video...'
			exportProgress.value = 10

			const outputFile = await executeCompositionPlan(
				compositionPlan,
				ffmpeg.value!,
				(step, total, description) => {
					currentStep.value = description
					exportProgress.value = 10 + (step / total) * 80
				}
			)

			// Download the result
			currentStep.value = 'Finalizing export...'
			exportProgress.value = 90

			const outputBlob = await downloadFile(outputFile, `video/${settings.format}`)
			
			// Create download link
			const url = URL.createObjectURL(outputBlob)
			const a = document.createElement('a')
			a.href = url
			a.download = fileName || 'export.mp4'
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)

			// Cleanup
			await cleanup()

			exportProgress.value = 100
			currentStep.value = 'Export complete!'
			isExporting.value = false
			
			return { success: true, outputPath: fileName || 'export.mp4' }
		} catch (err: any) {
			console.error('Export error:', err)
			error.value = err.message || 'Export failed'
			isExporting.value = false
			currentStep.value = 'Export failed'
			
			// Cleanup on error
			try {
				await cleanup()
			} catch (cleanupError) {
				console.error('Cleanup error:', cleanupError)
			}
			
			return { success: false, error: err.message }
		}
	}

	/**
	 * Get file extension from URL or path
	 */
	const getFileExtension = (filePath: string): string => {
		const match = filePath.match(/\.([^.]+)$/)
		return match ? match[1] : 'mp4'
	}

	/**
	 * Cancel ongoing export
	 */
	const cancelExport = async () => {
		if (isExporting.value) {
			try {
				await cleanup()
				isExporting.value = false
				currentStep.value = 'Export cancelled'
				exportProgress.value = 0
			} catch (err) {
				console.error('Error cancelling export:', err)
			}
		}
	}

	/**
	 * Get export progress details
	 */
	const getProgressDetails = () => {
		return {
			progress: exportProgress.value,
			step: currentStep.value,
			totalSteps: totalSteps.value,
			currentStepNumber: Math.ceil((exportProgress.value / 100) * totalSteps.value)
		}
	}

	/**
	 * Get formatted time remaining
	 */
	const getFormattedTime = computed(() => {
		// Simple placeholder - could be enhanced with actual time tracking
		if (!isExporting.value) return '0:00'
		const seconds = Math.ceil((100 - exportProgress.value) / 100 * 60) // Estimate
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	})

	/**
	 * Get processing speed
	 */
	const getProcessingSpeed = computed(() => {
		if (!isExporting.value) return '0x'
		// Simple placeholder - could be enhanced with actual speed tracking
		return '1.2x'
	})

	return {
		isExporting,
		exportProgress,
		error,
		currentStep,
		totalSteps,
		exportVideo,
		cancelExport,
		getProgressDetails,
		getFormattedTime,
		getProcessingSpeed
	}
}

