<template>
	<UContainer class="project-page">
		<!-- Top Bar -->
		<div class="top-bar">
			<UButton @click="$router.back()" icon="i-heroicons-arrow-left" variant="ghost">
				Back
			</UButton>
			<h1 class="project-title">{{ project?.name || 'Untitled Project' }}</h1>
			<UButton @click="handleExport" :disabled="!canExport" color="primary">
				Export Video
			</UButton>
		</div>

		<!-- Main Editor -->
		<div class="editor-grid">
			<!-- Left: Tools -->
			<div class="tools-panel">
				<UCard>
					<h3>Tools</h3>
					<UButton @click="importMedia" block variant="outline" class="mb-2">
						📁 Import Media
					</UButton>
					<UButton @click="startRecording" block variant="outline" class="mb-2">
						🎥 Record Screen
					</UButton>
					<UButton @click="addWebcam" block variant="outline">
						📷 Add Webcam
					</UButton>
				</UCard>

				<UCard v-if="selectedClip" class="mt-4">
					<h3>Clip Properties</h3>
					<p>{{ selectedClip.name }}</p>
					<p class="text-sm text-gray-500">{{ selectedClip.duration }}s</p>
				</UCard>

				<UCard class="mt-4">
					<h3>PiP Shapes</h3>
					<div class="shape-grid">
						<button 
							v-for="shape in shapes" 
							:key="shape"
							@click="applyShape(shape)"
							class="shape-btn"
						>
							{{ shape }}
						</button>
					</div>
				</UCard>
			</div>

			<!-- Center: Video Preview -->
			<div class="preview-panel">
				<div class="video-player-wrapper">
					<video 
						v-if="activeVideo" 
						ref="videoPlayer" 
						:src="activeVideo.src" 
						controls 
						class="main-video"
					/>
					<div v-else class="empty-video">
						<h2>Import or Record Media</h2>
						<p class="text-gray-500">Get started by importing a video or recording your screen</p>
					</div>
				</div>
			</div>

			<!-- Right: Timeline -->
			<div class="timeline-panel">
				<h3 class="panel-header">Timeline</h3>
				<div class="timeline-track">
					<div 
						v-for="clip in clips" 
						:key="clip.id"
						@click="selectClip(clip)"
						class="clip-block"
						:class="{ selected: selectedClip?.id === clip.id }"
					>
						{{ clip.name }}
					</div>
				</div>
			</div>
		</div>
	</UContainer>
</template>

<script setup lang="ts">
const route = useRoute()
const projectId = route.params.id as string

const { currentProject, selectProject } = useProject()
const { clips, addClip, fetchClips } = useClips()
const { exportVideo } = useExport()

const selectedClip = ref(null)
const activeVideo = ref(null)
const canExport = computed(() => clips.value.length > 0)

const shapes = ['circle', 'square', 'heart', 'star', 'hexagon']
const videoPlayer = ref<HTMLVideoElement | null>(null)

const project = ref(currentProject.value)

onMounted(async () => {
	if (projectId) {
		const result = await selectProject(projectId)
		project.value = result.project
		await fetchClips(projectId)
	}
})

const importMedia = () => {
	navigateTo('/library')
}

const startRecording = () => {
	navigateTo('/recorder')
}

const addWebcam = async () => {
	// TODO: Open webcam dialog
}

const applyShape = (shape: string) => {
	// TODO: Apply shape to selected clip
}

const selectClip = (clip: any) => {
	selectedClip.value = clip
	activeVideo.value = clip
}

const handleExport = async () => {
	await exportVideo(
		clips.value,
		'export.mp4',
		{ resolution: '1080p', quality: 'high', format: 'mp4' }
	)
}
</script>

<style scoped>
.project-page {
	height: 100vh;
	overflow: hidden;
}

.top-bar {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 1rem;
	background-color: rgb(17 24 39);
	border-bottom: 1px solid rgb(55 65 81);
}

.project-title {
	flex: 1;
	font-size: 1.5rem;
	font-weight: bold;
	color: white;
}

.editor-grid {
	display: grid;
	grid-template-columns: 250px 1fr 300px;
	height: calc(100vh - 80px);
}

.tools-panel {
	background-color: rgb(31 41 55);
	padding: 1rem;
	overflow-y: auto;
}

.preview-panel {
	background-color: rgb(17 24 39);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem;
}

.video-player-wrapper {
	width: 100%;
	max-width: 1200px;
	aspect-ratio: 16 / 9;
}

.main-video {
	width: 100%;
	height: 100%;
}

.empty-video {
	text-align: center;
	color: rgb(156 163 175);
}

.timeline-panel {
	background-color: rgb(31 41 55);
	padding: 1rem;
	overflow-y: auto;
}

.panel-header {
	font-size: 0.875rem;
	font-weight: 600;
	color: white;
	margin-bottom: 1rem;
}

.timeline-track {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.clip-block {
	padding: 0.75rem;
	background-color: rgb(59 130 246);
	border-radius: 0.25rem;
	cursor: pointer;
	transition: opacity 0.2s;
}

.clip-block:hover {
	opacity: 0.8;
}

.clip-block.selected {
	background-color: rgb(37 99 235);
}

.shape-grid {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 0.5rem;
}

.shape-btn {
	padding: 0.5rem;
	background-color: rgb(55 65 81);
	border-radius: 0.25rem;
	color: white;
	border: none;
	cursor: pointer;
	transition: background-color 0.2s;
}

.shape-btn:hover {
	background-color: rgb(75 85 99);
}
</style>

