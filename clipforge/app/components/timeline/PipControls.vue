<template>
	<div class="pip-controls">
		<div class="controls-grid">
			<UFormGroup label="Size">
				<URange
					v-model="size.width"
					:min="100"
					:max="800"
					:step="10"
					@update:model-value="updateSize"
				/>
				<URange
					v-model="size.height"
					:min="100"
					:max="800"
					:step="10"
					@update:model-value="updateSize"
				/>
			</UFormGroup>

			<UFormGroup label="Position">
				<UInput v-model.number="position.x" type="number" label="X" @update:model-value="updatePosition" />
				<UInput v-model.number="position.y" type="number" label="Y" @update:model-value="updatePosition" />
			</UFormGroup>

			<UFormGroup label="Border">
				<UInput v-model="border.color" type="color" @update:model-value="updateBorder" />
				<URange
					v-model="border.width"
					:min="0"
					:max="10"
					@update:model-value="updateBorder"
				/>
			</UFormGroup>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	pipConfig: any
}>()

const emit = defineEmits<{
	update: [config: any]
}>()

const size = ref({ ...props.pipConfig.size })
const position = ref({ ...props.pipConfig.position })
const border = ref({ ...props.pipConfig.border })

const updateSize = () => {
	emit('update', { size: { ...size.value } })
}

const updatePosition = () => {
	emit('update', { position: { ...position.value } })
}

const updateBorder = () => {
	emit('update', { border: { ...border.value } })
}
</script>

<style scoped>
.pip-controls {
	@apply p-4 bg-gray-900 rounded-lg;
}

.controls-grid {
	@apply grid grid-cols-1 gap-4;
}
</style>

