<template>
	<div class="project-editor">
		<!-- Error Toast -->
		<div v-if="error" class="error-toast">
			<div class="error-content">
				<i class="i-heroicons-exclamation-triangle text-xl" />
				<span>{{ error }}</span>
				<button @click="error = null" class="error-close">
					<i class="i-heroicons-x-mark" />
				</button>
			</div>
		</div>

		<!-- Top Bar -->
		<div class="top-bar">
			<UButton 
				@click="$router.push('/projects')" 
				icon="i-heroicons-arrow-left" 
				variant="ghost"
				size="sm"
			>
				Projects
			</UButton>
			<div class="project-info">
				<h1>{{ project?.name || 'Untitled Project' }}</h1>
				<span class="clip-count">{{ clips.length }} clips</span>
			</div>
			<div class="top-actions">
				<UButton 
					@click="importMedia" 
					icon="i-heroicons-film"
					variant="ghost"
					size="sm"
				>
					Import
				</UButton>
				<UButton 
					@click="startRecording" 
					icon="i-heroicons-video-camera"
					variant="ghost"
					size="sm"
				>
					Record
				</UButton>
				<UButton 
					@click="handleExport" 
					:disabled="!canExport"
					color="primary"
					size="sm"
				>
					Export
				</UButton>
			</div>
		</div>

		<!-- Main Layout -->
		<div class="editor-layout">
			<!-- Left Sidebar -->
			<div class="left-sidebar">
				<UCard>
					<template #header>
						<h3>Media Library</h3>
					</template>
					<div v-if="loading" class="loading-state">
						<SharedLoadingSpinner size="sm" message="Loading clips..." />
					</div>
					<div v-else-if="clips.length === 0" class="empty-state">
						<p>No clips yet</p>
						<p class="text-sm text-gray-500">Import or record to get started</p>
					</div>
					<div v-else class="clips-list">
						<div 
							v-for="clip in clips" 
							:key="clip.id"
							@click="selectClip(clip)"
							class="clip-item"
							:class="{ active: selectedClip?.id === clip.id }"
						>
							<div class="clip-thumbnail">
								<i class="i-heroicons-film text-2xl" />
							</div>
							<div class="clip-info">
								<p class="clip-name">{{ clip.name }}</p>
								<p class="clip-duration">{{ formatDuration(clip.duration) }}</p>
							</div>
						</div>
					</div>
				</UCard>

				<UCard v-if="selectedClip" class="selected-clip-props clip-props-animate">
					<template #header>
						<div class="clip-header">
							<h3>Clip Properties</h3>
						<UButton 
							@click="removeClip"
							color="error"
							variant="ghost"
							size="xs"
							icon="i-heroicons-trash"
							title="Remove Clip"
						/>
						</div>
					</template>
					<div class="properties">
						<div class="property">
							<label>Name</label>
							<p>{{ selectedClip.name }}</p>
						</div>
						<div class="property">
							<label>Duration</label>
							<p>{{ formatDuration(selectedClip.duration) }}</p>
						</div>
						<div class="property">
							<label>Storage</label>
							<p class="storage-badge" :class="selectedClip.metadata?.storageType || 'cloud'">
								{{ selectedClip.metadata?.storageType === 'local' ? '📦 Local' : '☁️ Cloud' }}
							</p>
						</div>
						<div class="property">
							<label>Track</label>
							<p>Track {{ selectedClip.track || 1 }}</p>
						</div>
					</div>
				</UCard>

				<UCard class="pip-shapes">
					<template #header>
						<h3>PiP Shapes</h3>
					</template>
					<div class="shape-grid">
						<button
							v-for="shape in shapes"
							:key="shape"
							@click="applyShape(shape)"
							class="shape-btn"
							:title="`Apply ${shape} shape`"
						>
							{{ shape }}
						</button>
					</div>
				</UCard>
			</div>

			<!-- Center: Video Preview -->
			<div class="center-preview">
				<div class="video-container" ref="videoContainer">
					<div v-if="!activeClip" class="empty-preview">
						<i class="i-heroicons-film text-8xl text-gray-600" />
						<h2>No Video Selected</h2>
						<p>Import media or select a clip to preview</p>
					</div>
					<div v-else class="video-wrapper">
						<!-- Main Video (Screen Recording) -->
						<video
							ref="videoPlayer"
							:src="activeClip.src"
							class="preview-video"
							controls
							@loadedmetadata="handleVideoLoaded"
						/>
						
					<!-- PiP Overlay (Webcam Feed) -->
					<PipOverlay
						v-if="webcamClip && pipConfig"
						:webcam-clip="webcamClip"
						:pip-config="pipConfig"
						:container-width="containerWidth"
						:container-height="containerHeight"
						@remove="removePip"
						@update-position="updatePipPosition"
					/>

						<div v-if="pipConfig" class="pip-indicator">
							<span>PiP Active: {{ pipConfig.shape }}</span>
						</div>
					</div>
				</div>

				<!-- Playback Controls -->
				<div class="playback-controls">
					<div class="controls-left">
						<UButton 
							@click="togglePlayback"
							:icon="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
							size="sm"
							variant="ghost"
							title="Play/Pause (Space)"
						/>
						<UButton 
							@click="seekBackward"
							icon="i-heroicons-backward"
							size="sm"
							variant="ghost"
							title="Rewind 5s (←)"
						/>
						<UButton 
							@click="seekForward"
							icon="i-heroicons-forward"
							size="sm"
							variant="ghost"
							title="Forward 5s (→)"
						/>
						<UButton 
							@click="goToStart"
							icon="i-heroicons-chevron-double-left"
							size="sm"
							variant="ghost"
							title="Go to start"
						/>
					</div>
					<div class="time-display">
						<span class="current-time">{{ formatTime(currentTime) }}</span>
						<span class="separator">/</span>
						<span class="total-time">{{ formatTime(duration) }}</span>
					</div>
					<div class="controls-right">
						<div class="volume-control">
							<UButton 
								@click="toggleMute"
								:icon="isMuted ? 'i-heroicons-speaker-x-mark' : 'i-heroicons-speaker-wave'"
								size="sm"
								variant="ghost"
								title="Mute (M)"
							/>
							<input 
								type="range" 
								v-model="volume"
								@input="updateVolume"
								min="0" 
								max="100" 
								class="volume-slider"
							/>
						</div>
						<UButton 
							@click="toggleFullscreen"
							icon="i-heroicons-arrows-pointing-out"
							size="sm"
							variant="ghost"
							title="Fullscreen (F)"
						/>
					</div>
				</div>
			</div>

			<!-- Timeline -->
			<div class="timeline-container">
				<div class="timeline-header">
					<h3>Timeline</h3>
					<div class="timeline-controls">
						<UButton 
							@click="() => setZoom(0.5)"
							size="xs"
							variant="ghost"
							:class="{ 'active-zoom': zoomLevel === 0.5 }"
						>
							50%
						</UButton>
						<UButton 
							@click="() => setZoom(1)"
							size="xs"
							variant="ghost"
							:class="{ 'active-zoom': zoomLevel === 1 }"
						>
							100%
						</UButton>
						<UButton 
							@click="() => setZoom(2)"
							size="xs"
							variant="ghost"
							:class="{ 'active-zoom': zoomLevel === 2 }"
						>
							200%
						</UButton>
						<div class="zoom-divider" />
						<UButton 
							@click="zoomOut"
							icon="i-heroicons-minus"
							size="xs"
							variant="ghost"
							title="Zoom out"
						/>
						<UButton 
							@click="zoomIn"
							icon="i-heroicons-plus"
							size="xs"
							variant="ghost"
							title="Zoom in"
						/>
					</div>
				</div>

				<div class="timeline-tracks">
					<div v-if="clips.length === 0" class="empty-timeline">
						<p>Timeline is empty</p>
					</div>
					<div v-else class="track-container">
						<!-- Time Ruler -->
						<div class="ruler-wrapper">
							<div class="ruler-spacer" />
							<TimelineTimeRuler 
								:duration="duration || 100"
								:pixels-per-second="pixelsPerSecond"
							/>
						</div>

						<!-- Track -->
						<div class="track">
							<div class="track-header">
								<span>Video Track</span>
							</div>
							<div 
								class="track-content"
								@click="handleTimelineClick"
								ref="trackContainer"
							>
								<!-- Playhead Indicator -->
								<TimelinePlayheadIndicator :playhead-position="playheadPixels" />

								<!-- Clips -->
								<div 
									v-for="clip in clips" 
									:key="clip.id"
									class="timeline-clip"
									:class="{ selected: selectedClip?.id === clip.id }"
									:style="getClipStyle(clip)"
									@click.stop="selectClip(clip)"
								>
									<span class="clip-label">{{ clip.name }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Export Dialog -->
		<ExportDialog
			v-if="showExportDialog"
			:clips="clips"
			:project-name="project?.name"
			@close="showExportDialog = false"
		/>
	</div>
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = route.params.id as string

const { currentProject, selectProject } = useProject()
const { clips, addClip, fetchClips, loading: clipsLoading } = useClips()
const { isExporting, exportProgress, exportVideo } = useExport()
const { currentTime, duration, isPlaying, togglePlay, seek, formatTime, setPlayheadPosition, initializePlayer } = usePlayer()
const { zoomLevel, zoomIn, zoomOut, setZoom } = useTimeline()
const { pipConfig, webcamClipId, applyShape: applyPipShape, updatePosition, removePip: removePipShape, setWebcamClip } = usePipShape()

const selectedClip = ref<any>(null)
const activeClip = ref<any>(null)
const webcamClip = ref<any>(null)
const project = ref<any>(null)
const videoPlayer = ref<HTMLVideoElement | null>(null)
const videoContainer = ref<HTMLDivElement | null>(null)
const trackContainer = ref<HTMLDivElement | null>(null)
const isMuted = ref(false)
const volume = ref(100)
const loading = ref(true)
const error = ref<string | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)
const showExportDialog = ref(false)

const canExport = computed(() => clips.value.length > 0)
const shapes = ['circle', 'square', 'heart', 'star', 'hexagon', 'rounded']

const pixelsPerSecond = computed(() => 50 * zoomLevel.value)

// Playhead position in pixels for the timeline
const playheadPixels = computed(() => {
	return currentTime.value * pixelsPerSecond.value
})


const handleVideoLoaded = () => {
	if (videoPlayer.value) {
		initializePlayer(videoPlayer.value)
	}
}

const selectClip = (clip: any) => {
	selectedClip.value = clip
	
	// Check if this is a webcam clip
	const isWebcam = clip.metadata?.type === 'webcam' || clip.name?.toLowerCase().includes('webcam')
	
	if (isWebcam) {
		// Set as webcam overlay
		webcamClip.value = clip
		setWebcamClip(clip.id)
		
		// If no PiP shape yet, apply default circle
		if (!pipConfig.value) {
			applyPipShape('circle', clip.id)
		}
	} else {
		// Set as main video
		activeClip.value = clip
		
		// Wait for video element to update
		nextTick(() => {
			if (videoPlayer.value) {
				initializePlayer(videoPlayer.value)
			}
		})
	}
}

// Update container dimensions on mount and resize
const updateContainerSize = () => {
	if (videoContainer.value) {
		const rect = videoContainer.value.getBoundingClientRect()
		containerWidth.value = rect.width
		containerHeight.value = rect.height
	}
}

const updatePipPosition = (x: number, y: number) => {
	updatePosition(x, y)
}

const removePip = () => {
	webcamClip.value = null
	removePipShape()
}

const togglePlayback = () => {
	togglePlay()
}

const seekBackward = () => {
	seek(Math.max(0, currentTime.value - 5))
}

const seekForward = () => {
	seek(Math.min(duration.value, currentTime.value + 5))
}

const toggleMute = () => {
	if (videoPlayer.value) {
		videoPlayer.value.muted = !videoPlayer.value.muted
		isMuted.value = videoPlayer.value.muted
	}
}

const updateVolume = () => {
	if (videoPlayer.value) {
		videoPlayer.value.volume = volume.value / 100
		if (volume.value > 0) {
			isMuted.value = false
			videoPlayer.value.muted = false
		}
	}
}

const goToStart = () => {
	seek(0)
}

const toggleFullscreen = () => {
	if (!videoPlayer.value) return
	
	if (!document.fullscreenElement) {
		videoPlayer.value.requestFullscreen()
	} else {
		document.exitFullscreen()
	}
}

// Keyboard shortcuts
const handleKeyPress = (event: KeyboardEvent) => {
	// Don't trigger if user is typing in an input
	if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
		return
	}

	switch (event.key) {
		case ' ':
		case 'k':
			event.preventDefault()
			togglePlayback()
			break
		case 'ArrowLeft':
			event.preventDefault()
			seekBackward()
			break
		case 'ArrowRight':
			event.preventDefault()
			seekForward()
			break
		case 'f':
			event.preventDefault()
			toggleFullscreen()
			break
		case 'm':
			event.preventDefault()
			toggleMute()
			break
		case 'Home':
			event.preventDefault()
			goToStart()
			break
	}
}

onMounted(async () => {
	// Add keyboard shortcuts
	window.addEventListener('keydown', handleKeyPress)
	
	// Update container size
	updateContainerSize()
	window.addEventListener('resize', updateContainerSize)
	
	if (projectId) {
		loading.value = true
		error.value = null
		
		try {
			const result = await selectProject(projectId)
			if (result.error) {
				console.error('❌ Project load error:', result.error)
				error.value = result.error
				loading.value = false
				return
			}

			project.value = result.project
			
			console.log('📥 Loading clips for project:', projectId)
			const clipsResult = await fetchClips(projectId)
			
			if (clipsResult.error) {
				console.error('❌ Clips load error:', clipsResult.error)
				error.value = clipsResult.error
				loading.value = false
				return
			}
			
			console.log('✅ Loaded', clips.value.length, 'clip(s)')
			
			// Auto-select first non-webcam clip as main video
			const screenClip = clips.value.find((c: any) => c.metadata?.type !== 'webcam')
			const webcam = clips.value.find((c: any) => c.metadata?.type === 'webcam')
			
			if (screenClip) {
				activeClip.value = screenClip
				console.log('🎬 Active clip:', screenClip.name)
				nextTick(() => {
					if (videoPlayer.value) {
						initializePlayer(videoPlayer.value)
					}
				})
			}
			
			// Auto-setup webcam with PiP if available
			if (webcam) {
				webcamClip.value = webcam
				setWebcamClip(webcam.id)
				applyPipShape('circle', webcam.id)
				console.log('📷 Webcam PiP setup:', webcam.name)
			}
			
			console.log('✅ Loading complete, setting loading to false')
			loading.value = false
		} catch (err: any) {
			console.error('❌ Failed to load project:', err)
			error.value = err.message || 'Failed to load project'
			loading.value = false
		}
	} else {
		loading.value = false
	}
})

onUnmounted(() => {
	window.removeEventListener('keydown', handleKeyPress)
	window.removeEventListener('resize', updateContainerSize)
})

const formatDuration = (seconds: number | undefined): string => {
	if (!seconds) return '0:00'
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getClipStyle = (clip: any) => {
	const start = clip.start_time || 0
	const duration = clip.duration || 10
	
	return {
		left: `${start * pixelsPerSecond.value}px`,
		width: `${duration * pixelsPerSecond.value}px`
	}
}

const handleTimelineClick = (event: MouseEvent) => {
	if (!trackContainer.value || !duration.value) return
	
	const rect = trackContainer.value.getBoundingClientRect()
	const x = event.clientX - rect.left
	const time = x / pixelsPerSecond.value
	
	seek(Math.max(0, Math.min(time, duration.value)))
}

const importMedia = () => {
	navigateTo('/library')
}

const startRecording = () => {
	// Pass project ID to recorder
	navigateTo(`/recorder?project=${projectId}`)
}

const applyShape = (shape: string) => {
	if (selectedClip.value) {
		applyPipShape(shape as any, selectedClip.value.id)
	} else {
		// Apply to active video if no clip selected
		applyPipShape(shape as any)
	}
}

const removeClip = async () => {
	if (!selectedClip.value) return
	
	const { deleteClip } = useClips()
	await deleteClip(selectedClip.value.id)
	selectedClip.value = null
	activeClip.value = null
}

const handleExport = () => {
	if (!canExport.value) return
	showExportDialog.value = true
}
</script>

<style scoped>
.project-editor {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: rgb(17 24 39);
	color: white;
}

/* Top Bar */
.top-bar {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 0.75rem 1.5rem;
	background-color: rgb(31 41 55);
	border-bottom: 1px solid rgb(55 65 81);
}

.project-info {
	flex: 1;
	display: flex;
	align-items: center;
	gap: 1rem;
}

.project-info h1 {
	font-size: 1.125rem;
	font-weight: 600;
	margin: 0;
}

.clip-count {
	font-size: 0.875rem;
	color: rgb(156 163 175);
}

.top-actions {
	display: flex;
	gap: 0.5rem;
}

/* Main Layout */
.editor-layout {
	display: grid;
	grid-template-columns: 280px 1fr;
	grid-template-rows: 1fr 240px;
	gap: 0;
	height: calc(100vh - 60px);
	overflow: hidden;
}

/* Left Sidebar */
.left-sidebar {
	grid-row: 1 / 3;
	background-color: rgb(31 41 55);
	border-right: 1px solid rgb(55 65 81);
	overflow-y: auto;
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.empty-state {
	text-align: center;
	padding: 2rem 1rem;
	color: rgb(156 163 175);
}

.loading-state {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem 1rem;
}

.error-toast {
	position: fixed;
	top: 1rem;
	right: 1rem;
	z-index: 1000;
	animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
	from {
		transform: translateX(100%);
		opacity: 0;
	}
	to {
		transform: translateX(0);
		opacity: 1;
	}
}

.error-content {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 1rem 1.5rem;
	background-color: rgb(153 27 27);
	color: white;
	border-radius: 0.5rem;
	box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
	max-width: 400px;
}

.error-close {
	background: none;
	border: none;
	color: white;
	cursor: pointer;
	padding: 0.25rem;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 0.25rem;
	transition: background-color 0.2s;
}

.error-close:hover {
	background-color: rgba(255, 255, 255, 0.1);
}

.clips-list {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.clip-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem;
	background-color: rgb(55 65 81);
	border-radius: 0.375rem;
	cursor: pointer;
	transition: all 0.2s ease;
	animation: slideIn 0.2s ease;
}

.clip-item:hover {
	background-color: rgb(75 85 99);
	transform: translateX(4px);
}

.clip-item.active {
	background-color: rgb(59 130 246);
	box-shadow: 0 0 0 2px rgb(59 130 246 / 0.3);
}

@keyframes slideIn {
	from {
		opacity: 0;
		transform: translateX(-10px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

.clip-thumbnail {
	width: 48px;
	height: 48px;
	background-color: rgb(31 41 55);
	border-radius: 0.25rem;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.clip-info {
	flex: 1;
	min-width: 0;
}

.clip-name {
	font-weight: 500;
	font-size: 0.875rem;
	margin: 0 0 0.25rem 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.clip-duration {
	font-size: 0.75rem;
	color: rgb(156 163 175);
	margin: 0;
}

.selected-clip-props {
	margin-top: 0;
}

.clip-props-animate {
	animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
	from {
		opacity: 0;
		transform: translateY(-10px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.clip-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
}

.clip-header h3 {
	margin: 0;
}

.properties {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.property label {
	display: block;
	font-size: 0.75rem;
	font-weight: 500;
	color: rgb(156 163 175);
	margin-bottom: 0.25rem;
}

.property p {
	margin: 0;
	font-size: 0.875rem;
}

.storage-badge {
	display: inline-block;
	padding: 0.25rem 0.5rem;
	border-radius: 0.25rem;
	font-size: 0.75rem;
	font-weight: 500;
}

.storage-badge.local {
	background-color: rgba(251, 191, 36, 0.2);
	color: rgb(251, 191, 36);
	border: 1px solid rgba(251, 191, 36, 0.3);
}

.storage-badge.cloud {
	background-color: rgba(59, 130, 246, 0.2);
	color: rgb(59, 130, 246);
	border: 1px solid rgba(59, 130, 246, 0.3);
}

.pip-shapes {
	margin-top: 0;
}

.shape-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 0.5rem;
}

.shape-btn {
	padding: 0.75rem;
	background-color: rgb(55 65 81);
	border: 1px solid rgb(75 85 99);
	border-radius: 0.375rem;
	color: white;
	font-size: 0.75rem;
	cursor: pointer;
	transition: all 0.2s ease;
	position: relative;
	overflow: hidden;
}

.shape-btn::before {
	content: '';
	position: absolute;
	top: 50%;
	left: 50%;
	width: 0;
	height: 0;
	border-radius: 50%;
	background-color: rgba(59, 130, 246, 0.3);
	transform: translate(-50%, -50%);
	transition: width 0.3s, height 0.3s;
}

.shape-btn:hover::before {
	width: 100px;
	height: 100px;
}

.shape-btn:hover {
	background-color: rgb(75 85 99);
	border-color: rgb(107 114 128);
	transform: scale(1.05);
}

.shape-btn:active {
	transform: scale(0.95);
}

/* Center Preview */
.center-preview {
	display: flex;
	flex-direction: column;
	background-color: rgb(17 24 39);
}

.video-container {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem;
	position: relative;
}

.empty-preview {
	text-align: center;
	color: rgb(107 114 128);
}

.empty-preview h2 {
	margin: 1rem 0 0.5rem 0;
	font-size: 1.5rem;
	font-weight: 600;
}

.empty-preview p {
	margin: 0;
	color: rgb(156 163 175);
}

.video-wrapper {
	position: relative;
	max-width: 100%;
	max-height: 100%;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.preview-video {
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
	border-radius: 0.5rem;
	box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.4);
	display: block;
}

.pip-indicator {
	position: absolute;
	top: 1rem;
	right: 1rem;
	background-color: rgb(59 130 246);
	color: white;
	padding: 0.5rem 1rem;
	border-radius: 0.375rem;
	font-size: 0.875rem;
	font-weight: 500;
	box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.3);
}

.playback-controls {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 1rem 1.5rem;
	background-color: rgb(31 41 55);
	border-top: 1px solid rgb(55 65 81);
}

.controls-left, .controls-right {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.volume-control {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.volume-slider {
	width: 80px;
	height: 4px;
	border-radius: 2px;
	background: rgb(55 65 81);
	outline: none;
	-webkit-appearance: none;
	cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
	-webkit-appearance: none;
	appearance: none;
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: rgb(59 130 246);
	cursor: pointer;
}

.volume-slider::-moz-range-thumb {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: rgb(59 130 246);
	cursor: pointer;
	border: none;
}

.current-time {
	font-weight: 600;
	color: white;
}

.separator {
	color: rgb(107 114 128);
	margin: 0 0.25rem;
}

.total-time {
	color: rgb(156 163 175);
}

.time-display {
	flex: 1;
	text-align: center;
	font-size: 0.875rem;
	color: rgb(156 163 175);
	font-variant-numeric: tabular-nums;
}

/* Timeline */
.timeline-container {
	grid-column: 2;
	background-color: rgb(31 41 55);
	border-top: 1px solid rgb(55 65 81);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.timeline-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0.75rem 1.5rem;
	border-bottom: 1px solid rgb(55 65 81);
}

.timeline-header h3 {
	margin: 0;
	font-size: 0.875rem;
	font-weight: 600;
}

.timeline-controls {
	display: flex;
	align-items: center;
	gap: 0.25rem;
}

.active-zoom {
	background-color: rgb(59 130 246) !important;
	color: white !important;
}

.zoom-divider {
	width: 1px;
	height: 20px;
	background-color: rgb(55 65 81);
	margin: 0 0.25rem;
}

.timeline-tracks {
	flex: 1;
	overflow-x: auto;
	overflow-y: auto;
}

.empty-timeline {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
	color: rgb(107 114 128);
}

.track-container {
	display: flex;
	flex-direction: column;
}

.ruler-wrapper {
	display: flex;
	background-color: rgb(17 24 39);
}

.ruler-spacer {
	width: 120px;
	flex-shrink: 0;
	border-right: 1px solid rgb(55 65 81);
}

.track {
	display: flex;
	min-height: 80px;
	border-bottom: 1px solid rgb(55 65 81);
}

.track-header {
	width: 120px;
	padding: 1rem;
	background-color: rgb(17 24 39);
	border-right: 1px solid rgb(55 65 81);
	display: flex;
	align-items: center;
	font-size: 0.875rem;
	font-weight: 500;
	flex-shrink: 0;
}

.track-content {
	flex: 1;
	position: relative;
	min-width: 2000px;
	padding: 0.5rem 0;
}

.timeline-clip {
	position: absolute;
	height: 60px;
	background: linear-gradient(135deg, rgb(59 130 246) 0%, rgb(37 99 235) 100%);
	border-radius: 0.25rem;
	cursor: pointer;
	display: flex;
	align-items: center;
	padding: 0 0.75rem;
	transition: all 0.2s ease;
	border: 2px solid transparent;
	animation: clipAppear 0.3s ease;
}

@keyframes clipAppear {
	from {
		opacity: 0;
		transform: scale(0.9);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

.timeline-clip:hover {
	border-color: rgb(147 197 253);
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.timeline-clip.selected {
	border-color: rgb(253 224 71);
	box-shadow: 0 0 0 2px rgb(253 224 71 / 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
	animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
	0%, 100% {
		box-shadow: 0 0 0 2px rgb(253 224 71 / 0.3), 0 4px 12px rgba(0, 0, 0, 0.3);
	}
	50% {
		box-shadow: 0 0 0 4px rgb(253 224 71 / 0.5), 0 4px 12px rgba(0, 0, 0, 0.3);
	}
}

.clip-label {
	font-size: 0.75rem;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
