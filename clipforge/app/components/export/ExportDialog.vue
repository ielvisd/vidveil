<template>
	<UModal 
		v-model:open="isOpen" 
		:ui="{ content: 'sm:max-w-3xl max-h-[90vh]' }"
	>
		<template #header>
			<div class="flex items-center justify-between w-full">
				<div class="flex items-center gap-3">
					<UIcon name="i-heroicons-arrow-down-tray" class="size-6 text-primary" />
					<h3 class="text-xl font-semibold">Export Video</h3>
				</div>
				<UButton 
					icon="i-heroicons-x-mark" 
					color="gray" 
					variant="ghost" 
					size="sm"
					@click="close"
				/>
			</div>
		</template>

		<template #body>
			<div class="space-y-6 max-h-[60vh] overflow-y-auto px-1">
				<!-- Native Export Status -->
				<UAlert
					color="success"
					variant="soft"
					icon="i-heroicons-check-circle"
					title="Native Export Ready"
					description="ClipForge uses native macOS AVFoundation for lightning-fast video export - no additional software required!"
					class="mb-6"
				/>

				<!-- Export Preset Selection -->
				<UFormField label="Export Preset" description="Choose a preset optimized for your use case" required>
					<USelectMenu
						v-model="selectedPreset"
						:items="presetMenuItems"
						value-key="id"
						label-key="name"
						placeholder="Select a preset..."
						size="lg"
						@update:model-value="onPresetChange"
					>
						<template #item-label="{ item }">
							<div class="flex items-center justify-between w-full">
								<div class="flex-1">
									<div class="font-medium">{{ item.name }}</div>
									<div class="text-xs text-muted mt-0.5">{{ item.description }}</div>
								</div>
								<UBadge :color="getPresetBadgeColor(item)" variant="soft" class="ml-2">
									{{ item.estimatedSize }}
								</UBadge>
							</div>
						</template>
					</USelectMenu>
				</UFormField>

				<!-- File Name -->
				<UFormField label="File Name" description="Choose a name for your exported video" required>
					<UInput
						v-model="fileName"
						placeholder="my-video.mp4"
						size="lg"
						icon="i-heroicons-document-text"
						@update:model-value="updateFileExtension"
					>
						<template #trailing>
							<UBadge v-if="selectedPreset" color="neutral" variant="soft" class="mr-1">
								{{ getPresetFormat(selectedPreset) }}
							</UBadge>
						</template>
					</UInput>
				</UFormField>

				<!-- Estimated File Size -->
				<div v-if="estimatedSize" class="bg-elevated/50 rounded-lg p-4 border border-default">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UIcon name="i-heroicons-circle-stack" class="size-5 text-info" />
							<span class="text-sm font-medium">Estimated File Size</span>
						</div>
						<UBadge :color="getSizeBadgeColor(estimatedSize)" variant="soft" size="lg">
							{{ estimatedSize }}
						</UBadge>
					</div>
					<div v-if="totalDuration" class="mt-2 text-xs text-muted">
						Based on {{ formatDuration(totalDuration) }} of video content
					</div>
				</div>

				<!-- PiP Info -->
				<UAlert
					v-if="webcamClip && !isExporting"
					color="info"
					variant="soft"
					icon="i-heroicons-information-circle"
					title="Picture-in-Picture"
					description="Your webcam overlay will be automatically composited into the final video"
				/>

				<!-- Advanced Options (Collapsible) -->
				<UCollapsible v-model:open="showAdvanced" class="flex flex-col gap-2">
					<UButton
						variant="ghost"
						size="lg"
						:trailing-icon="showAdvanced ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
						class="w-full justify-between group"
						:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
					>
						<div class="flex items-center gap-2">
							<UIcon name="i-heroicons-cog-6-tooth" class="size-5" />
							<span class="font-medium">Advanced Options</span>
						</div>
					</UButton>
					
					<template #content>
						<div class="pt-4 space-y-4 border-t border-default">
							<div class="grid grid-cols-2 gap-4">
								<UFormField label="Resolution">
									<USelectMenu
										v-model="resolution"
										:items="resolutionOptions"
										value-key="value"
										label-key="label"
									/>
								</UFormField>

								<UFormField label="Quality">
									<USelectMenu
										v-model="quality"
										:items="qualityOptions"
										value-key="value"
										label-key="label"
									/>
								</UFormField>

								<UFormField label="Format">
									<USelectMenu
										v-model="format"
										:items="formatOptions"
										value-key="value"
										label-key="label"
									/>
								</UFormField>

								<UFormField label="Encoding Speed">
									<USelectMenu
										v-model="preset"
										:items="ffmpegPresetOptions"
										value-key="value"
										label-key="label"
									/>
								</UFormField>
							</div>
						</div>
					</template>
				</UCollapsible>

				<!-- Export Progress -->
				<div v-if="isExporting" class="space-y-4 bg-elevated/50 rounded-lg p-5 border border-default">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UIcon name="i-heroicons-arrow-path" class="size-5 text-primary animate-spin" />
							<span class="font-medium">{{ currentStep }}</span>
						</div>
						<UBadge color="primary" variant="soft">
							{{ exportProgress }}%
						</UBadge>
					</div>

					<UProgress 
						:model-value="exportProgress" 
						:max="100"
						:status="true"
						color="primary"
						size="lg"
					/>

					<div v-if="totalSteps > 0" class="text-xs text-muted text-center">
						Step {{ Math.ceil((exportProgress / 100) * totalSteps) }} of {{ totalSteps }}
					</div>

					<div class="flex items-center justify-between text-xs text-muted mt-2">
						<div class="flex items-center gap-1">
							<UIcon name="i-heroicons-clock" class="size-4" />
							<span>{{ getFormattedTime }}</span>
						</div>
						<div class="flex items-center gap-1">
							<UIcon name="i-heroicons-bolt" class="size-4" />
							<span>{{ getProcessingSpeed }}</span>
						</div>
					</div>

					<p class="text-xs text-muted text-center mt-2">
						This may take a few minutes depending on video length
					</p>
				</div>

				<!-- Success Message -->
				<UAlert
					v-if="exportSuccess && exportedFilePath"
					color="success"
					variant="soft"
					icon="i-heroicons-check-circle"
					title="Export Complete!"
					:description="`File saved to: ${exportedFilePath}`"
				>
					<template #actions>
						<UButton 
							size="sm"
							variant="outline"
							icon="i-heroicons-folder-open"
							@click="revealInFinder"
						>
							Reveal in Finder
						</UButton>
					</template>
				</UAlert>

				<!-- Error -->
				<UAlert
					v-if="error"
					color="error"
					variant="soft"
					icon="i-heroicons-exclamation-triangle"
					title="Export Failed"
					:description="error"
				/>
			</div>
		</template>

		<template #footer>
			<div class="flex justify-end gap-3">
				<UButton 
					v-if="!isExporting"
					variant="ghost"
					@click="close"
				>
					Cancel
				</UButton>
				<UButton 
					v-if="isExporting"
					variant="outline"
					color="error"
					@click="cancelExport"
				>
					Cancel Export
				</UButton>
				<UButton 
					v-if="!isExporting && !exportSuccess"
					color="primary"
					size="lg"
					:disabled="!fileName || !selectedPreset"
					:loading="isExporting"
					icon="i-heroicons-arrow-down-tray"
					@click="startExport"
				>
					Export Video
				</UButton>
				<UButton 
					v-if="exportSuccess"
					color="primary"
					size="lg"
					@click="close"
				>
					Close
				</UButton>
			</div>
		</template>
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
	getFormattedTime,
	getProcessingSpeed,
} = useNativeVideoExport()

const isOpen = ref(true)
const fileName = ref(`${props.projectName || 'video'}.mp4`)
const selectedPreset = ref<string>('youtube')
const showAdvanced = ref(false)
const exportSuccess = ref(false)
const exportedFilePath = ref<string | null>(null)

// Advanced options
const resolution = ref('1080p')
const quality = ref('high')
const format = ref('mp4')
const preset = ref('medium')

const webcamClip = computed(() => 
	props.clips.find(c => c.metadata?.type === 'webcam')
)

// Calculate total duration
const totalDuration = computed(() => {
	return props.clips.reduce((sum, clip) => sum + clip.duration, 0)
})

// Format duration for display
const formatDuration = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	if (mins > 0) {
		return `${mins}m ${secs}s`
	}
	return `${secs}s`
}

// Preset menu items for SelectMenu
const presetMenuItems = computed(() => exportPresets.map(preset => ({
	id: preset.id,
	name: preset.name,
	description: preset.description,
	estimatedSize: preset.estimatedSize,
	format: preset.format,
	useCase: preset.useCase
})))

// Get preset badge color based on quality
const getPresetBadgeColor = (item: any): 'primary' | 'success' | 'info' | 'warning' => {
	const preset = getPresetById(item.id)
	if (!preset) return 'info'
	
	if (preset.quality === 'high') return 'success'
	if (preset.quality === 'medium') return 'primary'
	return 'info'
}

// Get size badge color
const getSizeBadgeColor = (size: string): 'primary' | 'success' | 'info' | 'warning' => {
	const sizeMB = parseFloat(size.replace(/[^\d.]/g, ''))
	if (sizeMB > 100) return 'warning'
	if (sizeMB > 50) return 'info'
	return 'success'
}

// Get preset format
const getPresetFormat = (presetId: string): string => {
	const preset = getPresetById(presetId)
	return preset?.format.toUpperCase() || 'MP4'
}

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
	
	return calculateEstimatedSize(totalDuration.value, preset)
})

// Handle preset change
const onPresetChange = (presetId: string) => {
	const preset = getPresetById(presetId)
	if (preset) {
		resolution.value = preset.resolution
		quality.value = preset.quality
		format.value = preset.format
		
		// Update file extension
		updateFileExtension()
	}
}

// Update file extension based on selected preset
const updateFileExtension = () => {
	if (!fileName.value || !selectedPreset.value) return
	
	const preset = getPresetById(selectedPreset.value)
	if (!preset) return
	
	const baseName = fileName.value.replace(/\.[^/.]+$/, '')
	const ext = preset.format === 'mp3' ? 'mp3' : 
	            preset.format === 'webm' ? 'webm' : 
	            preset.format === 'gif' ? 'gif' : 'mp4'
	
	if (!fileName.value.endsWith(`.${ext}`)) {
		fileName.value = `${baseName}.${ext}`
	}
}

const startExport = async () => {
	console.log('🎬 Starting export with settings:', {
		clips: props.clips.length,
		fileName: fileName.value,
		resolution: resolution.value,
		quality: quality.value,
		format: format.value,
		preset: preset.value
	})
	
	// Reset success state
	exportSuccess.value = false
	exportedFilePath.value = null
	
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
		console.log('✅ Export completed successfully:', result.outputPath)
		exportSuccess.value = true
		exportedFilePath.value = result.outputPath || null
	} else {
		console.error('❌ Export failed:', result.error)
		exportSuccess.value = false
	}
}

const revealInFinder = async () => {
	if (!exportedFilePath.value) return
	
	try {
		const { invoke } = await import('@tauri-apps/api/core')
		await invoke('reveal_file_in_finder', { filePath: exportedFilePath.value })
	} catch (err) {
		console.error('Failed to reveal file in Finder:', err)
		// Fallback: try using shell to open the directory
		try {
			const { shell } = await import('@tauri-apps/plugin-shell')
			const pathParts = exportedFilePath.value.split('/')
			const directory = pathParts.slice(0, -1).join('/')
			await shell.open(directory)
		} catch (shellErr) {
			console.error('Failed to open file directory:', shellErr)
		}
	}
}

const close = () => {
	isOpen.value = false
	emit('close')
}
</script>

<style scoped>
/* Additional animations if needed */
@keyframes fade-in {
	from {
		opacity: 0;
		transform: translateY(-4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

.fade-in {
	animation: fade-in 0.2s ease-out;
}
</style>