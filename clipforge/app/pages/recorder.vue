<template>
	<div class="recorder-page">
		<!-- Fixed Header -->
		<header class="recorder-header">
			<div class="header-content">
				<UButton 
					@click="goBack" 
					icon="i-heroicons-arrow-left" 
					variant="ghost"
					size="sm"
					color="neutral"
				>
					Back
				</UButton>
				<h1 class="header-title">Screen Recorder</h1>
				<div class="header-actions">
					<UButton 
						@click="goToProjectEditor" 
						icon="i-heroicons-pencil-square"
						color="primary"
						size="sm"
					>
						Open Editor
					</UButton>
				</div>
			</div>
		</header>

		<!-- Main Preview Area -->
		<main class="preview-container">
			<div class="preview-wrapper">
				<!-- Not recording yet -->
				<div v-if="!isRecording && !recordedScreenBlob" class="ready-state">
					<UCard variant="soft" class="empty-state-card">
						<template #default>
							<div class="empty-state">
								<UIcon name="i-heroicons-video-camera" class="empty-icon" />
								<h2 class="empty-title">Ready to Record</h2>
								<p class="empty-description">Click the record button below to start capturing your screen</p>
							</div>
						</template>
					</UCard>

					<!-- Quick Settings -->
					<UCard variant="outline" class="quick-settings-card">
						<template #default>
							<div class="quick-settings">
								<!-- Webcam Toggle -->
								<div class="quick-setting-item">
									<div class="quick-setting-info">
										<label class="quick-setting-label">Include Webcam</label>
										<p class="quick-setting-desc">Record webcam as separate PiP overlay</p>
									</div>
									<USwitch 
										v-model="includeWebcam"
										color="primary"
									/>
								</div>

								<!-- Audio Source Info -->
								<div class="quick-setting-item">
									<div class="quick-setting-info">
										<label class="quick-setting-label">Audio Source</label>
										<p class="quick-setting-desc">System Audio + Microphone</p>
									</div>
								</div>
							</div>
						</template>
					</UCard>
				</div>

				<!-- Currently Recording -->
				<div v-else-if="isRecording" class="recording-state">
					<!-- Native Recording Mode (no live preview) -->
					<UCard v-if="!screenStream" variant="soft" class="recording-card">
						<template #default>
							<div class="native-recording-indicator">
								<div class="pulse-indicator">
									<div class="pulse-ring"></div>
									<UIcon name="i-heroicons-video-camera" class="recording-icon" />
								</div>
								<h2 class="recording-title">Recording Screen</h2>
								<p class="recording-subtitle">Native desktop recording in progress</p>
								<UBadge 
									color="error" 
									variant="soft" 
									:icon="isRecording ? 'i-heroicons-circle' : undefined"
									size="lg"
									class="mt-4"
								>
									{{ recordingTime }}
								</UBadge>
								<p class="recording-hint">Preview will be available after stopping</p>
							</div>
						</template>
					</UCard>

					<!-- Browser Mode Recording (with live preview) -->
					<div v-else class="live-preview-container">
						<div class="preview-pip-container">
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

							<!-- Recording Indicator Overlay -->
							<div class="recording-overlay-badge">
								<UBadge 
									color="error" 
									variant="solid"
									:icon="isRecording ? 'i-heroicons-circle' : undefined"
									size="lg"
								>
									{{ recordingTime }}
								</UBadge>
							</div>
						</div>
					</div>
				</div>

				<!-- Recording Complete -->
				<div v-else-if="recordedScreenBlob || recordedWebcamBlob" class="playback-area">
					<UCard variant="outline" class="playback-card">
						<template #header>
							<div class="flex items-center justify-between">
								<div>
									<h3 class="text-lg font-semibold">Recording Complete!</h3>
									<p class="text-sm text-muted mt-1">Preview your recording before saving</p>
								</div>
								<UBadge color="success" variant="soft" size="lg">
									Ready
								</UBadge>
							</div>
						</template>
						<template #default>
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
								
								<!-- Error State: Screen recording missing -->
								<div v-else-if="!screenBlobUrl && recordedWebcamBlob" class="preview-error-state">
									<UIcon name="i-heroicons-exclamation-triangle" class="error-icon" />
									<h3 class="error-title">Screen Recording Unavailable</h3>
									<p class="error-message">The screen recording could not be loaded, but webcam recording is available.</p>
									<p class="error-hint">This may occur if screen recording permission was not granted during recording.</p>
								</div>
								
								<!-- Empty state if both are missing -->
								<div v-else class="preview-error-state">
									<UIcon name="i-heroicons-video-camera-slash" class="error-icon" />
									<h3 class="error-title">No Recording Available</h3>
									<p class="error-message">Both screen and webcam recordings are unavailable.</p>
								</div>
								
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
										<UIcon name="i-heroicons-microphone" class="size-3" />
										<span class="audio-label">Audio</span>
									</div>
								</div>
							</div>
						</template>
						<template #footer>
							<div class="flex items-center gap-3 justify-end">
								<UButton 
									@click="discardRecordings"
									:disabled="saving"
									variant="outline"
									color="neutral"
									icon="i-heroicons-trash"
								>
									Discard
								</UButton>
								<UButton 
									@click="saveRecordings"
									:disabled="saving || !currentProject"
									:loading="saving"
									color="primary"
									icon="i-heroicons-check"
								>
									{{ saving ? 'Saving...' : (currentProject ? 'Add to Project' : 'Select Project') }}
								</UButton>
							</div>
							<UAlert 
								v-if="!currentProject" 
								color="warning" 
								variant="soft"
								icon="i-heroicons-exclamation-triangle"
								class="mt-3"
							>
								Please select a project to save recordings
							</UAlert>
						</template>
					</UCard>
				</div>

				<!-- Error Display -->
				<UAlert 
					v-if="error" 
					color="error" 
					variant="soft"
					icon="i-heroicons-exclamation-circle"
					:title="error"
					class="mt-4"
				/>
			</div>
		</main>

		<!-- Fixed Bottom Control Bar -->
		<footer class="control-bar">
			<div class="control-bar-content">
				<!-- Settings/Options Button -->
				<UButton 
					@click="settingsOpen = !settingsOpen"
					icon="i-heroicons-cog-6-tooth"
					variant="ghost"
					size="lg"
					color="neutral"
					:class="{ 'ring-2 ring-primary': settingsOpen }"
					class="control-action"
				/>

				<!-- Main Record Button -->
				<div class="record-button-container">
					<UButton 
						v-if="!isRecording && !recordedScreenBlob"
						@click="startRecording"
						color="error"
						size="xl"
						icon="i-heroicons-video-camera"
						:class="'record-button'"
					>
						Start Recording
					</UButton>
					<UButton 
						v-else-if="isRecording"
						@click="stopRecording"
						color="error"
						size="xl"
						icon="i-heroicons-stop"
						variant="solid"
						:class="'record-button recording-active'"
					>
						Stop Recording
					</UButton>
					<div v-else class="recording-status-display">
						<UBadge 
							v-if="recordedScreenBlob"
							color="success" 
							variant="soft" 
							size="lg"
						>
							Recording saved
						</UBadge>
					</div>
				</div>

				<!-- Quick Actions -->
				<div class="quick-actions">
					<UBadge 
						v-if="isRecording"
						color="error" 
						variant="soft"
						size="lg"
						class="recording-badge"
					>
						<UIcon name="i-heroicons-circle" class="pulse-dot" />
						{{ recordingTime }}
					</UBadge>
					<UButton 
						v-if="!isRecording && !recordedScreenBlob"
						@click="toggleWebcam"
						:variant="includeWebcam ? 'soft' : 'ghost'"
						:color="includeWebcam ? 'primary' : 'neutral'"
						icon="i-heroicons-video-camera"
						size="lg"
						class="control-action"
					>
						Webcam
					</UButton>
				</div>
			</div>
		</footer>

		<!-- Settings Modal -->
		<UModal v-model:open="settingsOpen" title="Recording Settings">
			<template #body>
				<div class="settings-content space-y-4">
					<!-- Webcam Toggle -->
					<div class="flex items-center justify-between">
						<div class="flex-1 mr-4">
							<label class="text-sm font-medium block">Include Webcam</label>
							<p class="text-xs text-muted mt-1">Record webcam as separate PiP overlay</p>
						</div>
						<USwitch 
							v-model="includeWebcam"
							color="primary"
						/>
					</div>

					<USeparator />

					<!-- Audio Source -->
					<div>
						<label class="text-sm font-medium block">Audio Source</label>
						<p class="text-sm text-muted mt-1">System Audio + Microphone</p>
						<p class="text-xs text-muted mt-0.5">Automatically captured from screen share</p>
					</div>

					<USeparator />

					<!-- Format -->
					<div>
						<label class="text-sm font-medium block">Format</label>
						<p class="text-sm text-muted mt-1">WebM (VP9)</p>
						<p class="text-xs text-muted mt-0.5">Optimized for editing</p>
					</div>

					<UAlert 
						v-if="error" 
						color="error" 
						variant="soft"
						icon="i-heroicons-exclamation-circle"
						class="mt-4"
					>
						<template #title>
							{{ error }}
						</template>
					</UAlert>
				</div>
			</template>
		</UModal>
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
const settingsOpen = ref(false)

// Use refs instead of computed to avoid recreating URLs
const screenBlobUrl = ref('')
const webcamBlobUrl = ref('')

// Watch for blob changes and create URLs once
watch(recordedScreenBlob, (newBlob) => {
	console.log('🔔 recordedScreenBlob changed:', {
		hasBlob: !!newBlob,
		size: newBlob ? (newBlob.size / 1024 / 1024).toFixed(2) + ' MB' : '0',
		type: newBlob?.type,
		currentUrl: screenBlobUrl.value ? 'exists' : 'none'
	})
	
	if (screenBlobUrl.value) {
		URL.revokeObjectURL(screenBlobUrl.value)
		screenBlobUrl.value = ''
	}
	
	if (newBlob) {
		try {
			console.log('📹 Screen blob size:', (newBlob.size / 1024 / 1024).toFixed(2), 'MB')
			screenBlobUrl.value = URL.createObjectURL(newBlob)
			console.log('✅ Screen blob URL created:', screenBlobUrl.value.substring(0, 50) + '...')
		} catch (err: any) {
			console.error('❌ Failed to create screen blob URL:', err)
			screenBlobUrl.value = ''
		}
	} else {
		screenBlobUrl.value = ''
	}
}, { immediate: true })

watch(recordedWebcamBlob, (newBlob) => {
	console.log('🔔 recordedWebcamBlob changed:', {
		hasBlob: !!newBlob,
		size: newBlob ? (newBlob.size / 1024 / 1024).toFixed(2) + ' MB' : '0',
		type: newBlob?.type,
		currentUrl: webcamBlobUrl.value ? 'exists' : 'none'
	})
	
	if (webcamBlobUrl.value) {
		URL.revokeObjectURL(webcamBlobUrl.value)
		webcamBlobUrl.value = ''
	}
	
	if (newBlob) {
		try {
			console.log('📷 Webcam blob size:', (newBlob.size / 1024 / 1024).toFixed(2), 'MB')
			webcamBlobUrl.value = URL.createObjectURL(newBlob)
			console.log('✅ Webcam blob URL created:', webcamBlobUrl.value.substring(0, 50) + '...')
		} catch (err: any) {
			console.error('❌ Failed to create webcam blob URL:', err)
			webcamBlobUrl.value = ''
		}
	} else {
		webcamBlobUrl.value = ''
	}
}, { immediate: true })

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

const toggleWebcam = () => {
	includeWebcam.value = !includeWebcam.value
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
	// Allow saving even if only webcam is available
	if ((!recordedScreenBlob.value && !recordedWebcamBlob.value) || saving.value) return
	
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
		// Try to composite videos if FFmpeg is available and both recordings exist
		if (recordedScreenBlob.value && recordedWebcamBlob.value) {
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
				
				// Start upload in background, navigate immediately
				addClip(currentProject.value.id, finalSrc, {
					name: 'Screen Recording (with webcam)',
					duration: finalDuration,
					type: 'screen',
					fileSize: finalBlob.size,
					format: 'video/mp4',
					metadata: {
						hasWebcam: true,
						unified: true
					}
				}).catch((error) => {
					console.error('❌ Background upload failed:', error)
					// Error will be shown in editor via upload state
				})

				console.log('✅ Starting upload, navigating to project...')
				saving.value = false
				await navigateTo(`/project/${currentProject.value.id}`)
				return
			} catch (ffmpegError: any) {
				console.warn('⚠️ FFmpeg compositing failed, saving clips separately:', ffmpegError.message)
				// Fall through to save clips separately
			}
		}
		
		// Fallback: Save clips separately (screen and webcam as individual clips)
		console.log('📥 Saving clips separately, starting uploads...')
		
		// Get durations first (needed for metadata)
		const durations = await Promise.all([
			recordedScreenBlob.value ? getVideoDuration(recordedScreenBlob.value) : Promise.resolve(0),
			recordedWebcamBlob.value ? getVideoDuration(recordedWebcamBlob.value) : Promise.resolve(0)
		])
		
		// Start uploads in background, navigate immediately
		const uploadPromises = []
		
		if (recordedScreenBlob.value) {
			const screenSrc = URL.createObjectURL(recordedScreenBlob.value)
			
			uploadPromises.push(
				addClip(currentProject.value.id, screenSrc, {
					name: 'Screen Recording',
					duration: durations[0],
					type: 'screen',
					fileSize: recordedScreenBlob.value.size,
					format: 'video/mp4',
					metadata: {
						hasWebcam: !!recordedWebcamBlob.value,
						unified: false
					}
				}).catch((error) => {
					console.error('❌ Screen recording upload failed:', error)
				})
			)
		}

		if (recordedWebcamBlob.value) {
			const webcamSrc = URL.createObjectURL(recordedWebcamBlob.value)
			
			uploadPromises.push(
				addClip(currentProject.value.id, webcamSrc, {
					name: 'Webcam Recording',
					duration: durations[1],
					type: 'webcam',
					fileSize: recordedWebcamBlob.value.size,
					format: 'video/mp4',
					metadata: {
						hasWebcam: true,
						unified: false
					}
				}).catch((error) => {
					console.error('❌ Webcam recording upload failed:', error)
				})
			)
		}

		console.log('✅ Starting uploads, navigating to project...')
		saving.value = false
		await navigateTo(`/project/${currentProject.value.id}`)
	} catch (error: any) {
		console.error('❌ Failed to start recording upload:', error)
		// Show error but still navigate - user can see status in editor
		saving.value = false
		// Navigate anyway so user can see what happened
		if (currentProject.value) {
			await navigateTo(`/project/${currentProject.value.id}`)
		}
	}
}

const handlePlaybackLoaded = (event: Event) => {
	// Sync webcam playback with screen playback
	const screenVideo = event.target as HTMLVideoElement
	console.log('✅ Video loaded successfully:', {
		duration: screenVideo.duration,
		videoWidth: screenVideo.videoWidth,
		videoHeight: screenVideo.videoHeight,
		src: screenVideo.src.substring(0, 50) + '...',
		readyState: screenVideo.readyState,
		networkState: screenVideo.networkState
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
		src: video.src.substring(0, 100),
		readyState: video.readyState,
		networkState: video.networkState,
		currentSrc: video.currentSrc,
		isBlob: video.src.startsWith('blob:')
	})
	
	// Log blob info for debugging
	console.log('📊 Debugging info:')
	if (recordedScreenBlob.value) {
		console.log('Screen blob info:', {
			size: recordedScreenBlob.value.size,
			type: recordedScreenBlob.value.type,
			sizeMB: (recordedScreenBlob.value.size / 1024 / 1024).toFixed(2)
		})
	} else {
		console.warn('⚠️ recordedScreenBlob is null')
	}
	
	if (screenBlobUrl.value) {
		console.log('Screen blob URL exists:', screenBlobUrl.value.substring(0, 50) + '...')
	} else {
		console.warn('⚠️ screenBlobUrl is empty')
	}
	
	if (recordedWebcamBlob.value) {
		console.log('Webcam blob info:', {
			size: recordedWebcamBlob.value.size,
			type: recordedWebcamBlob.value.type,
			sizeMB: (recordedWebcamBlob.value.size / 1024 / 1024).toFixed(2)
		})
	}
	
	// Set error message for user
	if (!error.value) {
		error.value = `Failed to load video: ${videoError?.message || 'Unknown error'}. Error code: ${videoError?.code || 'unknown'}`
	}
}

const discardRecordings = () => {
	reset()
	recordingTime.value = '00:00'
}

const goBack = () => {
	if (currentProject.value) {
		router.push(`/project/${currentProject.value.id}`)
	} else {
		router.push('/projects')
	}
}

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
	height: 100%;
	overflow: hidden;
}

/* Header */
.recorder-header {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	background: var(--color-background);
	border-bottom: 1px solid var(--color-border);
	backdrop-filter: blur(8px);
}

.header-content {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 0.75rem 1.5rem;
	max-width: 100%;
}

.header-title {
	flex: 1;
	font-size: 1.125rem;
	font-weight: 600;
	margin: 0;
}

.header-actions {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

/* Main Preview Container */
.preview-container {
	flex: 1;
	overflow: visible;
	padding: clamp(0.5rem, 1vh, 1rem);
	margin-top: 60px;
	margin-bottom: 100px;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.preview-wrapper {
	max-width: 1280px;
	margin: 0 auto;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	min-height: 0;
}

/* Ready State */
.ready-state {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	width: 100%;
	max-width: 600px;
	margin: 0 auto;
}

.empty-state-card {
	width: 100%;
}

.empty-state {
	text-align: center;
	padding: clamp(1rem, 2vh, 2rem);
}

.quick-settings-card {
	width: 100%;
}

.quick-settings {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	padding: 0.5rem 0;
}

.quick-setting-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
}

.quick-setting-info {
	flex: 1;
}

.quick-setting-label {
	display: block;
	font-size: 0.875rem;
	font-weight: 500;
	margin-bottom: 0.25rem;
}

.quick-setting-desc {
	font-size: 0.75rem;
	color: var(--color-muted);
	margin: 0;
}

.empty-icon {
	width: 5rem;
	height: 5rem;
	margin: 0 auto 1.5rem;
	color: var(--color-muted);
}

.empty-title {
	font-size: 1.5rem;
	font-weight: 600;
	margin-bottom: 0.5rem;
}

.empty-description {
	color: var(--color-muted);
	font-size: 0.875rem;
}

/* Recording States */
.recording-state {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.recording-card {
	max-width: 600px;
	margin: 0 auto;
}

.native-recording-indicator {
	text-align: center;
	padding: clamp(1rem, 2vh, 2rem);
}

.pulse-indicator {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 1.5rem;
}

.pulse-ring {
	position: absolute;
	width: 150px;
	height: 150px;
	border-radius: 50%;
	background-color: rgba(239, 68, 68, 0.2);
	animation: pulse 2s ease-out infinite;
}

.recording-icon {
	width: 5rem;
	height: 5rem;
	color: rgb(239, 68, 68);
	z-index: 1;
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

.recording-title {
	font-size: 1.5rem;
	font-weight: 600;
	margin-bottom: 0.5rem;
}

.recording-subtitle {
	color: var(--color-muted);
	margin-bottom: 1rem;
}

.recording-hint {
	font-size: 0.75rem;
	color: var(--color-muted);
	margin-top: 1rem;
}

/* Live Preview */
.live-preview-container {
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 1rem;
}

.preview-pip-container {
	position: relative;
	width: 100%;
	max-width: 1280px;
	aspect-ratio: 16 / 9;
	max-height: 100%;
	background-color: #000;
	border-radius: 0.5rem;
	overflow: hidden;
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
	min-height: 0;
	flex-shrink: 1;
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

.recording-overlay-badge {
	position: absolute;
	top: 1rem;
	left: 1rem;
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

/* Error State */
.preview-error-state {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 2rem;
	text-align: center;
	background-color: rgba(0, 0, 0, 0.5);
}

.error-icon {
	width: 4rem;
	height: 4rem;
	color: var(--color-warning);
	margin-bottom: 1rem;
}

.error-title {
	font-size: 1.25rem;
	font-weight: 600;
	margin-bottom: 0.5rem;
	color: var(--color-warning);
}

.error-message {
	font-size: 0.875rem;
	color: var(--color-muted);
	margin-bottom: 0.5rem;
}

.error-hint {
	font-size: 0.75rem;
	color: var(--color-muted);
	opacity: 0.8;
}

/* Playback Area */
.playback-area {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	min-height: 0;
	flex: 1;
	overflow: visible;
}

.playback-card {
	width: 100%;
	max-width: 1280px;
	max-height: 100%;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow: visible;
}

.playback-card :deep(.card-body) {
	overflow: hidden;
	min-height: 0;
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
}

.playback-card :deep(.card-footer) {
	flex-shrink: 0;
	margin-top: auto;
}

.playback-preview {
	box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
	border: 2px solid var(--color-primary);
	min-height: 0;
	flex: 1 1 0;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

/* Fixed Bottom Control Bar */
.control-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 100;
	background: var(--color-background);
	border-top: 1px solid var(--color-border);
	backdrop-filter: blur(8px);
	padding: clamp(0.75rem, 1.5vh, 1rem) clamp(1rem, 2vh, 1.5rem);
	flex-shrink: 0;
}

.control-bar-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1.5rem;
	max-width: 1280px;
	margin: 0 auto;
}

.record-button-container {
	flex: 1;
	display: flex;
	justify-content: center;
}

.record-button {
	min-width: 200px;
	height: 3.5rem;
	font-size: 1rem;
	font-weight: 600;
	transition: all 0.2s;
}

.record-button.recording-active {
	animation: recordingPulse 2s ease-in-out infinite;
}

@keyframes recordingPulse {
	0%, 100% {
		box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
	}
	50% {
		box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
	}
}

.control-action {
	min-width: 3rem;
}

.quick-actions {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.recording-badge {
	font-family: monospace;
	font-size: 1rem;
}

.pulse-dot {
	animation: pulse-dot 1.5s ease-in-out infinite;
}

@keyframes pulse-dot {
	0%, 100% {
		opacity: 1;
		transform: scale(1);
	}
	50% {
		opacity: 0.6;
		transform: scale(1.2);
	}
}

.recording-status-display {
	display: flex;
	align-items: center;
	justify-content: center;
}

/* Settings */
.settings-content {
	padding: 0.25rem 0;
}

/* Responsive */
@media (max-width: 768px) {
	.header-content {
		padding: 0.5rem 1rem;
	}

	.header-title {
		font-size: 1rem;
	}

	.preview-container {
		padding: 0.5rem;
		margin-top: 56px;
		margin-bottom: 90px;
	}

	.control-bar {
		padding: 0.75rem 1rem;
	}

	.control-bar-content {
		gap: 0.5rem;
	}

	.record-button {
		min-width: 150px;
		height: 3rem;
		font-size: 0.875rem;
	}

	.quick-actions {
		display: none;
	}
}
</style>