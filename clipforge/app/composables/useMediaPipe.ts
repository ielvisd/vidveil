import { ref } from 'vue'
// Using TensorFlow.js as alternative to MediaPipe
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import { BodySegmenter } from '@tensorflow-models/body-segmentation'

export const useMediaPipe = () => {
	const isInitialized = ref(false)
	const model = ref<BodySegmenter | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	const initializeModel = async () => {
		if (isInitialized.value) return

		loading.value = true
		error.value = null

		try {
			await tf.setBackend('webgl')
			await tf.ready()

			// Load body segmentation model
			const segmenterConfig = {
				modelType: 'BodyPix',
				architecture: 'MobileNetV1',
				outputStride: 8,
				multiplier: 0.5,
				quantBytes: 2
			}

			model.value = await BodySegmenter.create(segmenterConfig)
			isInitialized.value = true
		} catch (err: any) {
			error.value = err.message
			console.error('Failed to initialize body segmentation:', err)
		} finally {
			loading.value = false
		}
	}

	const detectFace = async (imageElement: HTMLImageElement | HTMLVideoElement) => {
		if (!model.value) {
			await initializeModel()
		}

		if (!model.value) {
			throw new Error('Model not initialized')
		}

		try {
			const predictions = await model.value.segmentPeople(imageElement)
			return predictions
		} catch (err) {
			console.error('Face detection failed:', err)
			return null
		}
	}

	const createMask = (
		imageElement: HTMLImageElement | HTMLVideoElement,
		predictions: any
	): HTMLCanvasElement => {
		const canvas = document.createElement('canvas')
		canvas.width = imageElement.width || imageElement.videoWidth
		canvas.height = imageElement.height || imageElement.videoHeight

		const ctx = canvas.getContext('2d')
		if (!ctx || !predictions || predictions.length === 0) {
			// Return empty canvas
			return canvas
		}

		// Draw mask
		ctx.fillStyle = 'rgba(0, 0, 255, 0.5)'
		for (const prediction of predictions) {
			if (prediction.mask) {
				ctx.drawImage(prediction.mask, 0, 0)
			}
		}

		return canvas
	}

	const isWebcamFeed = (video: HTMLVideoElement): boolean => {
		// Simple heuristic: webcam feeds are typically lower resolution
		// and have aspect ratios closer to square
		const aspectRatio = video.videoWidth / video.videoHeight
		return aspectRatio < 1.3 && video.videoWidth < 1920
	}

	return {
		isInitialized,
		loading,
		error,
		initializeModel,
		detectFace,
		createMask,
		isWebcamFeed
	}
}

