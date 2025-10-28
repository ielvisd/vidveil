<template>
	<UModal v-model="isOpen" :ui="{ width: 'sm:max-w-lg' }">
		<UCard>
			<template #header>
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-semibold">Export Video</h3>
					<UButton 
						icon="i-heroicons-x-mark" 
						color="gray" 
						variant="ghost" 
						@click="close"
					/>
				</div>
			</template>

			<div class="space-y-4">
				<!-- Export Options -->
				<div v-if="!isExporting">
					<!-- Preset Selection -->
					<div class="option-group">
						<label class="option-label">Export Preset</label>
						<USelectMenu
							v-model="selectedPreset"
							:options="presetOptions"
							option-attribute="name"
							value-attribute="id"
							placeholder="Choose a preset..."
							@change="onPresetChange"
						>
							<template #label>
								<div v-if="selectedPreset" class="flex items-center justify-between w-full">
									<span>{{ getPresetById(selectedPreset)?.name }}</span>
									<span class="text-xs text-gray-400">{{ getPresetById(selectedPreset)?.estimatedSize }}</span>
								</div>
							</template>
							<template #option="{ option }">
								<div class="flex items-center justify-between w-full">
									<div>
										<div class="font-medium">{{ option.name }}</div>
										<div class="text-xs text-gray-400">{{ option.description }}</div>
									</div>
									<div class="text-xs text-gray-400">{{ option.estimatedSize }}</div>
								</div>
							</template>
						</USelectMenu>
					</div>

					<!-- File Name -->
					<div class="option-group">
						<label class="option-label">File Name</label>
						<input 
							v-model="fileName"
							type="text"
							class="option-input"
							placeholder="my-video.mp4"
						/>
					</div>

					<!-- Advanced Options (Collapsible) -->
					<div class="option-group">
						<UButton 
							variant="ghost" 
							size="sm"
							@click="showAdvanced = !showAdvanced"
							:icon="showAdvanced ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
						>
							Advanced Options
						</UButton>
					</div>

					<div v-if="showAdvanced" class="space-y-4 pl-4 border-l-2 border-gray-700">
						<div class="option-group">
							<label class="option-label">Resolution</label>
							<USelectMenu
								v-model="resolution"
								:options="resolutionOptions"
								option-attribute="label"
								value-attribute="value"
							/>
						</div>

						<div class="option-group">
							<label class="option-label">Quality</label>
							<USelectMenu
								v-model="quality"
								:options="qualityOptions"
								option-attribute="label"
								value-attribute="value"
							/>
						</div>

						<div class="option-group">
							<label class="option-label">Format</label>
							<USelectMenu
								v-model="format"
								:options="formatOptions"
								option-attribute="label"
								value-attribute="value"
							/>
						</div>

						<div class="option-group">
							<label class="option-label">Encoding Preset</label>
							<USelectMenu
								v-model="preset"
								:options="ffmpegPresetOptions"
								option-attribute="label"
								value-attribute="value"
							/>
						</div>
					</div>

					<!-- File Size Estimate -->
					<div v-if="estimatedSize" class="info-box">
						<i class="i-heroicons-information-circle" />
						<span>Estimated file size: {{ estimatedSize }}</span>
					</div>

					<!-- PiP Info -->
					<div v-if="webcamClip" class="info-box">
						<i class="i-heroicons-information-circle" />
						<span>PiP overlay will be composited into final video</span>
					</div>
				</div>

				<!-- Export Progress -->
				<div v-else class="export-progress">
					<div class="progress-header">
						<div class="progress-info">
							<span class="progress-label">{{ currentStep }}</span>
							<span class="progress-value">{{ exportProgress }}%</span>
						</div>
						<div v-if="totalSteps > 0" class="progress-steps">
							Step {{ Math.ceil((exportProgress / 100) * totalSteps) }} of {{ totalSteps }}
						</div>
					</div>
					
					<div class="progress-bar">
						<div 
							class="progress-fill"
							:style="{ width: `${exportProgress}%` }"
						/>
					</div>
					
					<div class="progress-details">
						<div class="progress-time">
							<i class="i-heroicons-clock" />
							<span>{{ getFormattedTime }}</span>
						</div>
						<div class="progress-speed">
							<i class="i-heroicons-bolt" />
							<span>{{ getProcessingSpeed }}</span>
						</div>
					</div>
					
					<p class="progress-note">This may take a few minutes depending on video length</p>
				</div>

				<!-- Error -->
				<div v-if="error" class="error-box">
					<i class="i-heroicons-exclamation-triangle" />
					<span>{{ error }}</span>
				</div>
			</div>

			<template #footer>
				<div class="flex justify-end gap-3">
					<UButton 
						v-if="!isExporting"
						variant="outline"
						@click="close"
					>
						Cancel
					</UButton>
					<UButton 
						v-if="isExporting"
						variant="outline"
						color="red"
						@click="cancelExport"
					>
						Cancel Export
					</UButton>
					<UButton 
						v-if="!isExporting"
						color="primary"
						@click="startExport"
						:disabled="!fileName || !selectedPreset"
						:loading="isExporting"
					>
						Export Video
					</UButton>
				</div>
			</template>
		</UCard>
	</UModal>
</template>

<script setup lang="ts">
import type { Clip } from '~/types/project'
import { exportPresets, getPresetById, calculateEstimatedSize, type ExportPreset } from '~/utils/export-presets'

const props = defineProps<{
	clips: Clip[]
	projectName?: string
}>()

const emit = defineEmits<{
	close: []
}>()

const { 
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
} = useExport()

const isOpen = ref(true)
const fileName = ref(`${props.projectName || 'video'}.mp4`)
const selectedPreset = ref('youtube')
const showAdvanced = ref(false)

// Advanced options (can be overridden)
const resolution = ref('1080p')
const quality = ref('high')
const format = ref('mp4')
const preset = ref('medium')

const webcamClip = computed(() => 
	props.clips.find(c => c.metadata?.type === 'webcam')
)

// Preset options for dropdown
const presetOptions = computed(() => exportPresets.map(preset => ({
	id: preset.id,
	name: preset.name,
	description: preset.description,
	estimatedSize: preset.estimatedSize
})))

// Advanced options
const resolutionOptions = [
	{ label: '1080p (Full HD)', value: '1080p' },
	{ label: '720p (HD)', value: '720p' },
	{ label: '480p (SD)', value: '480p' },
	{ label: '360p (Low)', value: '360p' },
	{ label: 'Source Quality', value: 'source' }
]

const qualityOptions = [
	{ label: 'High (Larger file)', value: 'high' },
	{ label: 'Medium (Balanced)', value: 'medium' },
	{ label: 'Low (Smaller file)', value: 'low' }
]

const formatOptions = [
	{ label: 'MP4 (H.264)', value: 'mp4' },
	{ label: 'WebM (VP9)', value: 'webm' },
	{ label: 'MOV (QuickTime)', value: 'mov' },
	{ label: 'Animated GIF', value: 'gif' },
	{ label: 'MP3 (Audio Only)', value: 'mp3' }
]

const ffmpegPresetOptions = [
	{ label: 'Ultra Fast', value: 'ultrafast' },
	{ label: 'Fast', value: 'fast' },
	{ label: 'Medium', value: 'medium' },
	{ label: 'Slow', value: 'slow' },
	{ label: 'Very Slow', value: 'veryslow' }
]

// Calculate estimated file size
const estimatedSize = computed(() => {
	if (!selectedPreset.value) return null
	
	const preset = getPresetById(selectedPreset.value)
	if (!preset) return null
	
	// Calculate total duration of clips
	const totalDuration = props.clips.reduce((sum, clip) => sum + clip.duration, 0)
	
	return calculateEstimatedSize(totalDuration, preset)
})

// Handle preset change
const onPresetChange = (presetId: string) => {
	const preset = getPresetById(presetId)
	if (preset) {
		resolution.value = preset.resolution
		quality.value = preset.quality
		format.value = preset.format
		preset.value = preset.preset
		
		// Update file extension
		if (fileName.value) {
			const baseName = fileName.value.replace(/\.[^/.]+$/, '')
			fileName.value = `${baseName}.${preset.format}`
		}
	}
}

const startExport = async () => {
	const result = await exportVideo(
		props.clips,
		fileName.value,
		{
			resolution: resolution.value,
			quality: quality.value,
			format: format.value,
			preset: preset.value
		}
	)

	if (result.success) {
		setTimeout(() => {
			close()
		}, 1000)
	}
}

const close = () => {
	isOpen.value = false
	emit('close')
}
</script>

<style scoped>
.option-group {
	margin-bottom: 1rem;
}

.option-label {
	display: block;
	font-size: 0.875rem;
	font-weight: 500;
	color: rgb(156 163 175);
	margin-bottom: 0.5rem;
}

.option-input {
	width: 100%;
	padding: 0.5rem;
	background-color: rgb(55 65 81);
	border: 1px solid rgb(75 85 99);
	border-radius: 0.375rem;
	color: white;
	font-size: 0.875rem;
}

.option-input:focus {
	outline: none;
	border-color: rgb(59 130 246);
}

.info-box {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem;
	background-color: rgba(59, 130, 246, 0.1);
	border: 1px solid rgba(59, 130, 246, 0.3);
	border-radius: 0.375rem;
	color: rgb(147, 197, 253);
	font-size: 0.875rem;
}

.export-progress {
	padding: 1rem 0;
}

.progress-header {
	margin-bottom: 1rem;
}

.progress-info {
	display: flex;
	justify-content: space-between;
	margin-bottom: 0.5rem;
}

.progress-label {
	font-size: 0.875rem;
	color: rgb(156 163 175);
}

.progress-value {
	font-size: 0.875rem;
	font-weight: 600;
	color: rgb(59 130 246);
}

.progress-steps {
	font-size: 0.75rem;
	color: rgb(107 114 128);
	text-align: right;
}

.progress-bar {
	width: 100%;
	height: 8px;
	background-color: rgb(55 65 81);
	border-radius: 9999px;
	overflow: hidden;
	margin-bottom: 0.75rem;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(to right, rgb(59 130 246), rgb(147 51 234));
	transition: width 0.3s ease;
}

.progress-details {
	display: flex;
	justify-content: space-between;
	margin-bottom: 0.5rem;
}

.progress-time,
.progress-speed {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.75rem;
	color: rgb(107 114 128);
}

.progress-note {
	font-size: 0.75rem;
	color: rgb(107 114 128);
	text-align: center;
}

.error-box {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.75rem;
	background-color: rgba(220, 38, 38, 0.1);
	border: 1px solid rgba(220, 38, 38, 0.3);
	border-radius: 0.375rem;
	color: rgb(248, 113, 113);
	font-size: 0.875rem;
}
</style>
