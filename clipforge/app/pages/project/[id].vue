<template>
	<div class="project-editor">
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
					<div v-if="clips.length === 0" class="empty-state">
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

				<UCard v-if="selectedClip" class="selected-clip-props">
					<template #header>
						<h3>Clip Properties</h3>
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
				<div class="video-container">
					<div v-if="!activeClip" class="empty-preview">
						<i class="i-heroicons-film text-8xl text-gray-600" />
						<h2>No Video Selected</h2>
						<p>Import media or select a clip to preview</p>
					</div>
					<video
						v-else
						ref="videoPlayer"
						:src="activeClip.src"
						class="preview-video"
						controls
						@loadedmetadata="handleVideoLoaded"
					/>
				</div>

				<!-- Playback Controls -->
				<div class="playback-controls">
					<div class="controls-left">
						<UButton 
							@click="togglePlayback"
							:icon="isPlaying ? 'i-heroicons-pause' : 'i-heroicons-play'"
							size="sm"
							variant="ghost"
						/>
						<UButton 
							@click="seekBackward"
							icon="i-heroicons-backward"
							size="sm"
							variant="ghost"
						/>
						<UButton 
							@click="seekForward"
							icon="i-heroicons-forward"
							size="sm"
							variant="ghost"
						/>
					</div>
					<div class="time-display">
						{{ formatTime(currentTime) }} / {{ formatTime(duration) }}
					</div>
					<div class="controls-right">
						<UButton 
							@click="toggleMute"
							:icon="isMuted ? 'i-heroicons-speaker-x-mark' : 'i-heroicons-speaker-wave'"
							size="sm"
							variant="ghost"
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
							@click="zoomIn"
							icon="i-heroicons-plus"
							size="xs"
							variant="ghost"
						/>
						<span class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</span>
						<UButton 
							@click="zoomOut"
							icon="i-heroicons-minus"
							size="xs"
							variant="ghost"
						/>
					</div>
				</div>

				<div class="timeline-tracks">
					<div v-if="clips.length === 0" class="empty-timeline">
						<p>Timeline is empty</p>
					</div>
					<div v-else class="track">
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
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = route.params.id as string

const { currentProject, selectProject } = useProject()
const { clips, addClip, fetchClips } = useClips()
const { exportVideo } = useExport()
const { currentTime, duration, isPlaying, togglePlay, seek, formatTime, setPlayheadPosition, initializePlayer } = usePlayer()
const { zoomLevel, zoomIn, zoomOut } = useTimeline()

const selectedClip = ref<any>(null)
const activeClip = ref<any>(null)
const project = ref<any>(null)
const videoPlayer = ref<HTMLVideoElement | null>(null)
const trackContainer = ref<HTMLDivElement | null>(null)
const isMuted = ref(false)

const canExport = computed(() => clips.value.length > 0)
const shapes = ['circle', 'square', 'heart', 'star', 'hexagon', 'rounded']

const pixelsPerSecond = computed(() => 50 * zoomLevel.value)

// Playhead position in pixels for the timeline
const playheadPixels = computed(() => {
	return currentTime.value * pixelsPerSecond.value
})

onMounted(async () => {
	if (projectId) {
		const result = await selectProject(projectId)
		project.value = result.project
		await fetchClips(projectId)
		
		// Auto-select first clip if available
		if (clips.value.length > 0) {
			selectClip(clips.value[0])
		}
	}
})

const handleVideoLoaded = () => {
	if (videoPlayer.value) {
		initializePlayer(videoPlayer.value)
	}
}

const selectClip = (clip: any) => {
	selectedClip.value = clip
	activeClip.value = clip
	
	// Wait for video element to update
	nextTick(() => {
		if (videoPlayer.value) {
			initializePlayer(videoPlayer.value)
		}
	})
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
	navigateTo('/recorder')
}

const applyShape = (shape: string) => {
	if (selectedClip.value) {
		console.log(`Applying ${shape} shape to clip:`, selectedClip.value.id)
		// TODO: Implement PiP shape application
	}
}

const handleExport = async () => {
	if (!canExport.value) return
	
	try {
		await exportVideo(
			clips.value,
			`${project.value?.name || 'export'}.mp4`,
			{ resolution: '1080p', quality: 'high', format: 'mp4' }
		)
	} catch (error) {
		console.error('Export failed:', error)
	}
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
	transition: all 0.2s;
}

.clip-item:hover {
	background-color: rgb(75 85 99);
}

.clip-item.active {
	background-color: rgb(59 130 246);
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
	transition: all 0.2s;
}

.shape-btn:hover {
	background-color: rgb(75 85 99);
	border-color: rgb(107 114 128);
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

.preview-video {
	max-width: 100%;
	max-height: 100%;
	width: auto;
	height: auto;
	border-radius: 0.5rem;
	box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.4);
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
	gap: 0.5rem;
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
	gap: 0.5rem;
}

.zoom-level {
	font-size: 0.75rem;
	color: rgb(156 163 175);
	min-width: 3rem;
	text-align: center;
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
	transition: all 0.2s;
	border: 2px solid transparent;
}

.timeline-clip:hover {
	border-color: rgb(147 197 253);
	transform: translateY(-2px);
}

.timeline-clip.selected {
	border-color: rgb(253 224 71);
	box-shadow: 0 0 0 2px rgb(253 224 71 / 0.3);
}

.clip-label {
	font-size: 0.75rem;
	font-weight: 500;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
