import { ref, computed } from 'vue'
import type { Clip } from '~/types/project'

export interface MediaFile {
	id: string
	name: string
	path: string
	src: string // Object URL for video playback
	size: number
	type: string
	duration?: number
	thumbnail?: string
	metadata?: Record<string, any>
}

// Global state to persist across navigation
const globalMediaFiles = ref<MediaFile[]>([])
const globalSelectedMedia = ref<MediaFile | null>(null)

export const useMedia = () => {
	const mediaFiles = globalMediaFiles
	const selectedMedia = globalSelectedMedia
	const loading = ref(false)
	const dragging = ref(false)

	const mediaCount = computed(() => mediaFiles.value.length)
	const totalSize = computed(() => 
		mediaFiles.value.reduce((sum, file) => sum + file.size, 0)
	)

	const generateThumbnail = async (videoFile: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video')
			const canvas = document.createElement('canvas')
			const ctx = canvas.getContext('2d')

			video.src = URL.createObjectURL(videoFile)
			video.addEventListener('loadedmetadata', () => {
				video.currentTime = 0.1
			})

			video.addEventListener('seeked', () => {
				canvas.width = video.videoWidth
				canvas.height = video.videoHeight
				ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
				
				const thumbnail = canvas.toDataURL('image/jpeg', 0.8)
				URL.revokeObjectURL(video.src)
				resolve(thumbnail)
			})

			video.addEventListener('error', (error) => {
				reject(error)
			})
		})
	}

	const getVideoDuration = (file: File): Promise<number> => {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video')
			video.src = URL.createObjectURL(file)
			
			video.addEventListener('loadedmetadata', () => {
				resolve(video.duration)
				URL.revokeObjectURL(video.src)
			})

			video.addEventListener('error', (error) => {
				reject(error)
			})
		})
	}

	const processFile = async (file: File): Promise<MediaFile> => {
		const isVideo = file.type.startsWith('video/')
		const objectUrl = URL.createObjectURL(file)
		
		let duration: number | undefined
		let thumbnail: string | undefined

		if (isVideo) {
			duration = await getVideoDuration(file)
			thumbnail = await generateThumbnail(file)
		}

		return {
			id: `${Date.now()}-${Math.random()}`,
			name: file.name,
			path: file.path || objectUrl,
			src: objectUrl, // For video playback
			size: file.size,
			type: file.type,
			duration,
			thumbnail,
			metadata: {
				format: file.type,
				lastModified: file.lastModified
			}
		}
	}

	const importFiles = async (files: File[]): Promise<MediaFile[]> => {
		loading.value = true
		const processedFiles: MediaFile[] = []

		try {
			for (const file of files) {
				const processed = await processFile(file)
				mediaFiles.value.push(processed)
				processedFiles.push(processed)
			}

			return processedFiles
		} catch (error) {
			console.error('Error processing files:', error)
			return []
		} finally {
			loading.value = false
		}
	}

	const handleDrop = async (event: DragEvent) => {
		event.preventDefault()
		dragging.value = false

		const files = Array.from(event.dataTransfer?.files || [])
		const videoFiles = files.filter(f => f.type.startsWith('video/'))

		if (videoFiles.length > 0) {
			await importFiles(videoFiles)
		}
	}

	const handleDragOver = (event: DragEvent) => {
		event.preventDefault()
		dragging.value = true
	}

	const handleDragLeave = (event: DragEvent) => {
		event.preventDefault()
		dragging.value = false
	}

	const removeMedia = (id: string) => {
		const index = mediaFiles.value.findIndex(f => f.id === id)
		if (index !== -1) {
			mediaFiles.value.splice(index, 1)
		}
		if (selectedMedia.value?.id === id) {
			selectedMedia.value = null
		}
	}

	const clearMedia = () => {
		mediaFiles.value = []
		selectedMedia.value = null
	}

	const selectMedia = (id: string) => {
		selectedMedia.value = mediaFiles.value.find(f => f.id === id) || null
	}

	return {
		mediaFiles,
		selectedMedia,
		loading,
		dragging,
		mediaCount,
		totalSize,
		importFiles,
		handleDrop,
		handleDragOver,
		handleDragLeave,
		removeMedia,
		clearMedia,
		selectMedia
	}
}

