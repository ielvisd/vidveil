<template>
	<UModal v-model="isOpen">
		<UCard>
			<template #header>
				<h3>Export Video</h3>
			</template>

			<UFormGroup label="Resolution">
				<URadioGroup v-model="resolution" :options="['720p', '1080p']" />
			</UFormGroup>

			<UFormGroup label="Quality">
				<URadioGroup v-model="quality" :options="['low', 'medium', 'high']" />
			</UFormGroup>

			<UFormGroup label="Output Path">
				<UInput v-model="outputPath" placeholder="Choose save location..." />
				<UButton @click="choosePath" size="sm" variant="outline">Browse</UButton>
			</UFormGroup>

			<div v-if="progress > 0" class="progress">
				<div class="progress-bar" :style="{ width: `${progress}%` }}" />
				<p>{{ progress }}%</p>
			</div>

			<template #footer>
				<UButton @click="$emit('cancel')" variant="ghost">Cancel</UButton>
				<UButton @click="$emit('export', { resolution, quality, outputPath })" :loading="isExporting">
					Export
				</UButton>
			</template>
		</UCard>
	</UModal>
</template>

<script setup lang="ts">
interface Props {
	isExporting: boolean
	progress: number
}

defineProps<Props>()

defineEmits<{
	export: [settings: any]
	cancel: []
}>()

const isOpen = ref(true)
const resolution = ref('1080p')
const quality = ref('high')
const outputPath = ref('')

const choosePath = async () => {
	// In Tauri, use the file dialog
	if (window.__TAURI__) {
		const { dialog } = window.__TAURI__.dialog
		const selected = await dialog.save({
			defaultPath: 'export.mp4'
		})
		if (selected) {
			outputPath.value = selected as string
		}
	}
}
</script>

<style scoped>
.progress {
	width: 100%;
	height: 0.5rem;
	background-color: rgb(31 41 55);
	border-radius: 0.25rem;
	overflow: hidden;
	margin-top: 1rem;
}

.progress-bar {
	height: 100%;
	background-color: rgb(59 130 246);
	transition: width 0.3s;
}
</style>

