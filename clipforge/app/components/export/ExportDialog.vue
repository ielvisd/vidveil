<template>
	<UModal v-model="isOpen" :ui="{ width: 'sm:max-w-md' }">
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
					<div class="option-group">
						<label class="option-label">File Name</label>
						<input 
							v-model="fileName"
							type="text"
							class="option-input"
							placeholder="my-video.mp4"
						/>
					</div>

					<div class="option-group">
						<label class="option-label">Resolution</label>
						<select v-model="resolution" class="option-input">
							<option value="1080p">1080p (Full HD)</option>
							<option value="720p">720p (HD)</option>
							<option value="480p">480p (SD)</option>
						</select>
					</div>

					<div class="option-group">
						<label class="option-label">Quality</label>
						<select v-model="quality" class="option-input">
							<option value="high">High (Larger file)</option>
							<option value="medium">Medium (Balanced)</option>
							<option value="low">Low (Smaller file)</option>
						</select>
					</div>

					<div class="option-group">
						<label class="option-label">Format</label>
						<select v-model="format" class="option-input">
							<option value="mp4">MP4 (H.264)</option>
							<option value="webm">WebM (VP9)</option>
						</select>
					</div>

					<div v-if="webcamClip" class="info-box">
						<i class="i-heroicons-information-circle" />
						<span>PiP overlay will be composited into final video</span>
					</div>
				</div>

				<!-- Export Progress -->
				<div v-else class="export-progress">
					<div class="progress-info">
						<span class="progress-label">Exporting video...</span>
						<span class="progress-value">{{ exportProgress }}%</span>
					</div>
					<div class="progress-bar">
						<div 
							class="progress-fill"
							:style="{ width: `${exportProgress}%` }"
						/>
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
						v-if="!isExporting"
						color="primary"
						@click="startExport"
						:disabled="!fileName"
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

const props = defineProps<{
	clips: Clip[]
	projectName?: string
}>()

const emit = defineEmits<{
	close: []
}>()

const { isExporting, exportProgress, error, exportVideo } = useExport()

const isOpen = ref(true)
const fileName = ref(`${props.projectName || 'video'}.mp4`)
const resolution = ref('1080p')
const quality = ref('high')
const format = ref('mp4')

const webcamClip = computed(() => 
	props.clips.find(c => c.metadata?.type === 'webcam')
)

const startExport = async () => {
	const result = await exportVideo(
		props.clips,
		fileName.value,
		{
			resolution: resolution.value,
			quality: quality.value,
			format: format.value
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

.progress-bar {
	width: 100%;
	height: 8px;
	background-color: rgb(55 65 81);
	border-radius: 9999px;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background: linear-gradient(to right, rgb(59 130 246), rgb(147 51 234));
	transition: width 0.3s ease;
}

.progress-note {
	margin-top: 0.5rem;
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
