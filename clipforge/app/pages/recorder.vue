<template>
	<div class="recorder-page">
		<!-- Top Bar -->
		<div class="top-bar">
			<UButton 
				@click="goBack" 
				icon="i-heroicons-arrow-left" 
				variant="ghost"
				size="sm"
			>
				Back
			</UButton>
			<h1>Screen Recorder</h1>
			<div class="spacer" />
			<UButton 
				@click="goToProjectEditor" 
				icon="i-heroicons-pencil-square"
				color="primary"
				size="sm"
			>
				Open Editor
			</UButton>
		</div>

		<!-- Main Content -->
		<div class="recorder-content">
			<!-- Preview Area -->
			<div class="recording-area">
				<!-- Not recording yet -->
				<div v-if="!isRecording && !recordedScreenBlob" class="start-prompt">
					<i class="i-heroicons-video-camera text-8xl text-gray-600" />
					<h2>Ready to Record</h2>
					<p>Click the record button below to start capturing</p>
					<div class="editor-hint">
						<p class="text-sm text-blue-400 mt-4">
							💡 <strong>Tip:</strong> After recording, use the "Open Editor" button above to access clips, shapes, and timeline
						</p>
					</div>
					<!-- <p class="text-sm text-gray-500 mt-2">Screen + {{ includeWebcam ? 'Webcam' : 'No Webcam' }}</p> -->
				</div>
				
			<!-- Currently Recording -->
			<div v-else-if="isRecording" class="recording-active">
				<!-- Native Recording Mode (no live preview) -->
				<div v-if="!screenStream" class="native-recording-indicator">
					<div class="pulse-indicator">
						<div class="pulse-ring"></div>
						<i class="i-heroicons-video-camera text-8xl text-red-500" />
					</div>
					<h2 class="text-white">🔴 Recording Screen</h2>
					<p class="text-gray-300">Native desktop recording in progress</p>
					<p class="text-sm text-gray-400 mt-4">{{ recordingTime }}</p>
					<p class="text-xs text-gray-500 mt-2">Preview will be available after stopping</p>
				</div>
				
				<!-- Browser Mode Recording (with live preview) -->
				<div v-else class="preview-pip-container">
					<!-- Screen Preview (Main) -->
					<video
						ref="screenPreview"
						:srcObject="screenStream"
						autoplay
						muted
						class="preview-video-main"
					/>
					
					<!-- Webcam Preview (PiP Overlay) -->
					<div v-if="webcamStream" class="preview-pip-overlay">
						<video
							ref="webcamPreview"
							:srcObject="webcamStream"
							autoplay
							muted
							class="preview-video-pip"
						/>
					</div>
				</div>

					<div class="recording-indicator">
						<div class="recording-dot"></div>
						<span>Recording...</span>
						<span class="recording-time">{{ recordingTime }}</span>
					</div>
				</div>

				<!-- Recording Complete -->
				<div v-else-if="recordedScreenBlob" class="playback-area">
					<h3>Recording Complete!</h3>
					<p class="preview-note">Preview how your PiP video will look in the editor</p>
					
					<!-- Preview with PiP Layout -->
					<div class="preview-pip-container playback-preview">
						<!-- Screen Video (Main) -->
						<video 
							v-if="screenBlobUrl"
							:src="screenBlobUrl" 
							controls
							class="preview-video-main"
							preload="metadata"
							@loadedmetadata="handlePlaybackLoaded"
							@error="handleVideoError"
						/>
						
						<!-- Webcam Video (PiP Overlay) -->
						<div v-if="recordedWebcamBlob && webcamBlobUrl" class="preview-pip-overlay">
							<video 
								:src="webcamBlobUrl" 
								ref="webcamPlayback"
								class="preview-video-pip"
								preload="metadata"
								muted
								@error="handleVideoError"
							/>
							<div class="audio-indicator">
								<i class="i-heroicons-microphone text-xs" />
								<span class="audio-label">Audio in main track</span>
							</div>
						</div>
					</div>

					<div class="recording-actions">
						<UButton 
							@click="saveRecordings"
							:disabled="saving || !currentProject"
							:loading="saving"
							color="primary"
							icon="i-heroicons-check"
							size="lg"
						>
							{{ saving ? 'Saving...' : (currentProject ? 'Add to Project' : 'No Project Selected') }}
						</UButton>
						<UButton 
							@click="discardRecordings"
							:disabled="saving"
							variant="outline"
							icon="i-heroicons-trash"
						>
							Discard & Re-record
						</UButton>
					</div>
					<p v-if="!currentProject" class="no-project-warning">
						⚠️ Please select a project first to save recordings
					</p>
				</div>
			</div>

			<!-- Recording Controls -->
			<div class="controls-area">
				<div v-if="!isRecording && !recordedScreenBlob" class="control-buttons">
					<UButton 
						@click="startRecording"
						color="error"
						size="xl"
						icon="i-heroicons-video-camera"
					>
						Start Recording
					</UButton>
				</div>
				<div v-else-if="isRecording" class="control-buttons">
					<UButton 
						@click="stopRecording"
						color="neutral"
						size="xl"
						icon="i-heroicons-stop"
					>
						Stop Recording
					</UButton>
				</div>
			</div>

			<!-- Options -->
			<div class="options-area">
				<div class="option-card">
					<h3>Recording Options</h3>
					<div class="option-list">
						<div class="option-item">
							<label class="toggle-label">
							<input 
								type="checkbox" 
								v-model="includeWebcam"
								class="toggle-checkbox"
							/>
							<span>Include Webcam</span>
						</label>
						<p class="option-help">Record webcam as separate PiP overlay</p>
						</div>
						<div class="option-item">
							<label>Audio Source</label>
							<p class="option-value">System Audio + Microphone</p>
							<p class="option-help">Automatically captured from screen share</p>
						</div>
						<div class="option-item">
							<label>Format</label>
							<p class="option-value">WebM (VP9)</p>
							<p class="option-help">Optimized for editing</p>
						</div>
					</div>
				</div>

				<div v-if="error" class="option-card error-card">
					<h3>Error</h3>
					<p class="error-text">{{ error }}</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
const router = useRouter()
const route = useRoute()

const { 
	screenStream, 
	webcamStream, 
	isRecording, 
	includeWebcam,
	recordedScreenBlob, 
	recordedWebcamBlob,
	error,
	startRecording: startCapture,
	stopRecording: stopCapture,
	reset
} = useScreenCapture()

const { currentProject, selectProject } = useProject()
const { addClip } = useClips()

const screenPreview = ref<HTMLVideoElement | null>(null)
const webcamPreview = ref<HTMLVideoElement | null>(null)
const webcamPlayback = ref<HTMLVideoElement | null>(null)
const recordingTime = ref('00:00')
const recordingInterval = ref<NodeJS.Timeout | null>(null)
const recordingStartTime = ref<number>(0)

// PiP configuration for preview
const pipConfig = ref({
	x: 80, // Position from right
	y: 80, // Position from bottom  
	width: 20, // Width percentage
	height: 20, // Height percentage
	shape: 'circle',
	borderWidth: 3,
	borderColor: '#fff',
	shadow: true
})

// Use refs instead of computed to avoid recreating URLs
const screenBlobUrl = ref('')
const webcamBlobUrl = ref('')

// Watch for blob changes and create URLs once
watch(recordedScreenBlob, (newBlob) => {
	if (screenBlobUrl.value) {
		URL.revokeObjectURL(screenBlobUrl.value)
	}
	if (newBlob) {
		console.log('📹 Screen blob size:', (newBlob.size / 1024 / 1024).toFixed(2), 'MB')
		screenBlobUrl.value = URL.createObjectURL(newBlob)
	} else {
		screenBlobUrl.value = ''
	}
})

watch(recordedWebcamBlob, (newBlob) => {
	if (webcamBlobUrl.value) {
		URL.revokeObjectURL(webcamBlobUrl.value)
	}
	if (newBlob) {
		console.log('📷 Webcam blob size:', (newBlob.size / 1024 / 1024).toFixed(2), 'MB')
		webcamBlobUrl.value = URL.createObjectURL(newBlob)
	} else {
		webcamBlobUrl.value = ''
	}
})

const startRecording = async () => {
	await startCapture()
	
	if (isRecording.value) {
		// Start timer
		recordingStartTime.value = Date.now()
		recordingInterval.value = setInterval(() => {
			const elapsed = Math.floor((Date.now() - recordingStartTime.value) / 1000)
			const mins = Math.floor(elapsed / 60).toString().padStart(2, '0')
			const secs = (elapsed % 60).toString().padStart(2, '0')
			recordingTime.value = `${mins}:${secs}`
		}, 1000)
	}
}

const stopRecording = () => {
	stopCapture()
	
	if (recordingInterval.value) {
		clearInterval(recordingInterval.value)
		recordingInterval.value = null
	}
}

const getVideoDuration = (blob: Blob): Promise<number> => {
	return new Promise((resolve) => {
		const video = document.createElement('video')
		video.src = URL.createObjectURL(blob)
		video.onloadedmetadata = () => {
			resolve(video.duration)
			URL.revokeObjectURL(video.src)
		}
	})
}

const saving = ref(false)

const saveRecordings = async () => {
	if (!recordedScreenBlob.value || saving.value) return
	
	console.log('💾 Saving recordings...', {
		hasScreen: !!recordedScreenBlob.value,
		hasWebcam: !!recordedWebcamBlob.value,
		hasProject: !!currentProject.value
	})

	if (!currentProject.value) {
		console.error('❌ No current project - cannot save')
		alert('No project selected. Please go back and select a project first.')
		return
	}

	saving.value = true
	
	try {
		// Try to composite videos if FFmpeg is available
		if (recordedWebcamBlob.value) {
			try {
				console.log('🎬 Attempting to composite screen + webcam into unified video...')
				
				const { useFFmpeg } = await import('~/composables/useFFmpeg')
				const { fetchFile } = await import('@ffmpeg/util')
				
				const ffmpeg = useFFmpeg()
				await ffmpeg.loadFFmpeg()
				
				// Create file inputs
				const screenFile = await fetchFile(recordedScreenBlob.value)
				const webcamFile = await fetchFile(recordedWebcamBlob.value)
				
				await ffmpeg.writeFile('screen.mp4', screenFile)
				await ffmpeg.writeFile('webcam.mp4', webcamFile)
				
				// Composite webcam as PiP overlay on screen recording
				await ffmpeg.exec([
					'-i', 'screen.mp4',
					'-i', 'webcam.mp4',
					'-filter_complex', 
					'[1:v]scale=320:240[webcam_scaled];[0:v][webcam_scaled]overlay=main_w-overlay_w-20:20',
					'-c:a', 'copy',
					'-c:v', 'libx264',
					'-preset', 'fast',
					'-crf', '23',
					'output.mp4'
				])
				
				// Get the composited output
				const outputData = await ffmpeg.readFile('output.mp4')
				const finalBlob = new Blob([new Uint8Array(outputData)], { type: 'video/mp4' })
				const finalSrc = URL.createObjectURL(finalBlob)
				const finalDuration = await getVideoDuration(finalBlob)

				console.log('📥 Adding unified recording to project...')
				
				const result = await addClip(currentProject.value.id, finalSrc, {
					name: 'Screen Recording (with webcam)',
					duration: finalDuration,
					type: 'screen',
					fileSize: finalBlob.size,
					format: 'video/mp4',
					metadata: {
						hasWebcam: true,
						unified: true
					}
				})

				if (result.error) {
					throw new Error(result.error)
				}

				console.log('✅ Unified recording saved! Navigating to project...')
				await navigateTo(`/project/${currentProject.value.id}`)
				return
			} catch (ffmpegError: any) {
				console.warn('⚠️ FFmpeg compositing failed, saving clips separately:', ffmpegError.message)
				// Fall through to save clips separately
			}
		}
		
		// Fallback: Save clips separately (screen and webcam as individual clips)
		console.log('📥 Saving clips separately...')
		
		// Save screen recording
		const screenSrc = URL.createObjectURL(recordedScreenBlob.value)
		const screenDuration = await getVideoDuration(recordedScreenBlob.value)
		
		const screenResult = await addClip(currentProject.value.id, screenSrc, {
			name: 'Screen Recording',
			duration: screenDuration,
			type: 'screen',
			fileSize: recordedScreenBlob.value.size,
			format: 'video/mp4',
			metadata: {
				hasWebcam: false,
				unified: false
			}
		})

		if (screenResult.error) {
			throw new Error(screenResult.error)
		}

		// Save webcam recording if available
		if (recordedWebcamBlob.value) {
			const webcamSrc = URL.createObjectURL(recordedWebcamBlob.value)
			const webcamDuration = await getVideoDuration(recordedWebcamBlob.value)
			
			const webcamResult = await addClip(currentProject.value.id, webcamSrc, {
				name: 'Webcam Recording',
				duration: webcamDuration,
				type: 'webcam',
				fileSize: recordedWebcamBlob.value.size,
				format: 'video/mp4',
				metadata: {
					hasWebcam: true,
					unified: false
				}
			})

			if (webcamResult.error) {
				throw new Error(webcamResult.error)
			}
		}

		console.log('✅ Clips saved separately! Navigating to project...')
		await navigateTo(`/project/${currentProject.value.id}`)
	} catch (error: any) {
		console.error('❌ Failed to save recordings:', error)
		alert(`Failed to save: ${error.message}`)
	} finally {
		saving.value = false
	}
}

const handlePlaybackLoaded = (event: Event) => {
	// Sync webcam playback with screen playback
	const screenVideo = event.target as HTMLVideoElement
	console.log('✅ Video loaded successfully:', {
		duration: screenVideo.duration,
		videoWidth: screenVideo.videoWidth,
		videoHeight: screenVideo.videoHeight
	})
	
	if (webcamPlayback.value && screenVideo) {
		screenVideo.addEventListener('play', () => {
			webcamPlayback.value?.play()
		})
		
		screenVideo.addEventListener('pause', () => {
			webcamPlayback.value?.pause()
		})
		
		screenVideo.addEventListener('seeked', () => {
			if (webcamPlayback.value) {
				webcamPlayback.value.currentTime = screenVideo.currentTime
			}
		})
	}
}

const handleVideoError = (event: Event) => {
	const video = event.target as HTMLVideoElement
	const videoError = video.error
	console.error('❌ Video playback error:', {
		code: videoError?.code,
		message: videoError?.message,
		src: video.src
	})
	
	// Log blob info for debugging
	if (recordedScreenBlob.value) {
		console.log('Screen blob info:', {
			size: recordedScreenBlob.value.size,
			type: recordedScreenBlob.value.type
		})
	}
	if (recordedWebcamBlob.value) {
		console.log('Webcam blob info:', {
			size: recordedWebcamBlob.value.size,
			type: recordedWebcamBlob.value.type
		})
	}
}

const discardRecordings = () => {
	reset()
	recordingTime.value = '00:00'
}

// PiP handlers
const removePip = () => {
	pipConfig.value = {
		x: 80,
		y: 80,
		width: 20,
		height: 20,
		shape: 'circle',
		borderWidth: 3,
		borderColor: '#fff',
		shadow: true
	}
}

const updatePipPosition = (x: number, y: number) => {
	if (pipConfig.value) {
		pipConfig.value.x = x
		pipConfig.value.y = y
	}
}

const goBack = () => {
	if (currentProject.value) {
		router.push(`/project/${currentProject.value.id}`)
	} else {
		router.push('/projects')
	}
}

// Add a button to go to project editor
const goToProjectEditor = () => {
	if (currentProject.value) {
		router.push(`/project/${currentProject.value.id}`)
	} else {
		// If no project, create one or go to projects
		router.push('/projects')
	}
}

// Load project on mount if provided in query params
onMounted(async () => {
	const projectId = route.query.project as string
	
	if (projectId && !currentProject.value) {
		console.log('📋 Loading project from query param:', projectId)
		
		// Wait for auth to be ready
		const { loading: authLoading } = useAuth()
		let attempts = 0
		while (authLoading.value && attempts < 50) {
			await new Promise(resolve => setTimeout(resolve, 100))
			attempts++
		}
		
		if (authLoading.value) {
			console.error('❌ Auth timeout - still loading after 5s')
			error.value = 'Authentication is taking too long'
			return
		}
		
		const result = await selectProject(projectId)
		
		if (result.error) {
			console.error('❌ Failed to load project:', result.error)
			error.value = `Failed to load project: ${result.error}`
		} else {
			console.log('✅ Project loaded:', result.project?.name)
		}
	} else if (!projectId && !currentProject.value) {
		console.warn('⚠️ No project ID provided - recordings cannot be saved without a project')
	}
})

// Cleanup on unmount
onUnmounted(() => {
	stopRecording()
	
	// Clean up blob URLs
	if (screenBlobUrl.value) {
		URL.revokeObjectURL(screenBlobUrl.value)
		screenBlobUrl.value = ''
	}
	if (webcamBlobUrl.value) {
		URL.revokeObjectURL(webcamBlobUrl.value)
		webcamBlobUrl.value = ''
	}
})
</script>

<style scoped>
.recorder-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: rgb(17 24 39);
	color: white;
	overflow: hidden;
}

.top-bar {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 0.75rem 1.5rem;
	background-color: rgb(31 41 55);
	border-bottom: 1px solid rgb(55 65 81);
}

.top-bar h1 {
	flex: 1;
	font-size: 1.125rem;
	font-weight: 600;
	margin: 0;
}

.spacer {
	width: 80px;
}

.recorder-content {
	flex: 1;
	display: grid;
	grid-template-columns: 1fr 300px;
	grid-template-rows: 1fr auto;
	gap: 1.5rem;
	padding: 1.5rem;
	overflow: hidden;
}

.recording-area {
	grid-column: 1;
	grid-row: 1;
	background-color: rgb(31 41 55);
	border-radius: 0.5rem;
	border: 1px solid rgb(55 65 81);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
	overflow: hidden;
	position: relative;
}

.start-prompt {
	text-align: center;
	color: rgb(107 114 128);
}

.start-prompt h2 {
	margin: 1rem 0 0.5rem 0;
	font-size: 1.5rem;
	font-weight: 600;
	color: white;
}

.start-prompt p {
	margin: 0.5rem 0;
	color: rgb(156 163 175);
}

.editor-hint {
	margin-top: 1rem;
	padding: 1rem;
	background-color: rgba(59, 130, 246, 0.1);
	border: 1px solid rgba(59, 130, 246, 0.3);
	border-radius: 0.5rem;
}

.recording-active {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 2rem;
	padding: 2rem;
}

.native-recording-indicator {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 1rem;
	text-align: center;
}

.pulse-indicator {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 1rem;
}

.pulse-ring {
	position: absolute;
	width: 150px;
	height: 150px;
	border-radius: 50%;
	background-color: rgba(239, 68, 68, 0.2);
	animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
	0% {
		transform: scale(0.8);
		opacity: 1;
	}
	50% {
		transform: scale(1.1);
		opacity: 0.5;
	}
	100% {
		transform: scale(1.3);
		opacity: 0;
	}
}

.preview-pip-container {
	position: relative;
	width: 100%;
	max-width: 1280px;
	aspect-ratio: 16 / 9;
	background-color: #000;
	border-radius: 0.5rem;
	overflow: hidden;
}

.preview-video-main {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.preview-pip-overlay {
	position: absolute;
	bottom: 5%;
	right: 5%;
	width: 20%;
	aspect-ratio: 16 / 9;
	border: 3px solid white;
	border-radius: 50%;
	overflow: hidden;
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
}

.preview-video-pip {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.audio-indicator {
	position: absolute;
	bottom: 0.25rem;
	left: 50%;
	transform: translateX(-50%);
	background-color: rgba(0, 0, 0, 0.8);
	color: rgb(147, 197, 253);
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
	font-size: 0.625rem;
	display: flex;
	align-items: center;
	gap: 0.25rem;
	white-space: nowrap;
}

.audio-label {
	font-size: 0.625rem;
}

.recording-indicator {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	background-color: rgba(220, 38, 38, 0.2);
	padding: 0.75rem 1.5rem;
	border-radius: 0.5rem;
	border: 1px solid rgb(220, 38, 38);
	color: white;
	font-weight: 500;
}

.recording-dot {
	width: 12px;
	height: 12px;
	background-color: rgb(220, 38, 38);
	border-radius: 50%;
	animation: pulse-red 1.5s ease-in-out infinite;
}

@keyframes pulse-red {
	0%, 100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.6;
		transform: scale(1.1);
	}
}

.recording-time {
	font-family: monospace;
	font-size: 1.125rem;
}

.preview-video, .playback-video {
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
	border-radius: 0.5rem;
}

.playback-area {
	text-align: center;
	width: 100%;
	padding: 2rem;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1.5rem;
}

.playback-area h3 {
	margin: 0;
	font-size: 1.5rem;
	font-weight: 600;
	color: white;
}

.preview-note {
	margin: 0;
	color: rgb(156 163 175);
	font-size: 0.875rem;
}

.playback-preview {
	box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.4);
	border: 2px solid rgb(59 130 246);
}

.recording-actions {
	display: flex;
	gap: 1rem;
	margin-top: 1rem;
}

.controls-area {
	grid-column: 1;
	grid-row: 2;
	display: flex;
	justify-content: center;
}

.options-area {
	grid-column: 2;
	grid-row: 1 / 3;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

.option-card {
	background-color: rgb(31 41 55);
	border-radius: 0.5rem;
	border: 1px solid rgb(55 65 81);
	padding: 1.25rem;
}

.option-card h3 {
	margin: 0 0 1rem 0;
	font-size: 1rem;
	font-weight: 600;
}

.option-list {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.option-item {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.option-item label {
	font-size: 0.875rem;
	font-weight: 500;
	color: rgb(156 163 175);
}

.toggle-label {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	cursor: pointer;
	color: white !important;
}

.toggle-checkbox {
	width: 18px;
	height: 18px;
	cursor: pointer;
}

.option-value {
	font-size: 0.875rem;
	color: white;
	margin: 0.5rem 0;
}

.option-help {
	font-size: 0.75rem;
	color: rgb(107 114 128);
	margin: 0.25rem 0 0 0;
}

.error-card {
	background-color: rgba(153, 27, 27, 0.2);
	border: 1px solid rgb(153, 27, 27);
}

.error-text {
	color: rgb(248, 113, 113);
	font-size: 0.875rem;
	margin: 0;
}

.no-project-warning {
	margin-top: 1rem;
	padding: 0.75rem 1rem;
	background-color: rgba(251, 191, 36, 0.1);
	border: 1px solid rgba(251, 191, 36, 0.3);
	border-radius: 0.375rem;
	color: rgb(251, 191, 36);
	font-size: 0.875rem;
	text-align: center;
}
</style>
