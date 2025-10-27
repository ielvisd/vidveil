<template>
	<div class="ai-shape-input">
		<UTabs :items="tabs" v-model="selectedTab">
			<template #preset="{ item }">
				<UButton @click="selectPreset(item.label)" :variant="item.variant" size="sm">
					{{ item.label }}
				</UButton>
			</template>
		</UTabs>

		<div v-if="selectedTab === 'custom'" class="mt-4">
			<ShapeParser @shape-generated="handleShapeGenerated" />
		</div>
	</div>
</template>

<script setup lang="ts">
const tabs = [
	{ label: 'Presets', value: 'preset' },
	{ label: 'Custom', value: 'custom' }
]

const selectedTab = ref('preset')

const emit = defineEmits<{
	shapeSelected: [shape: string]
}>()

const selectPreset = (shape: string) => {
	emit('shapeSelected', shape)
}

const handleShapeGenerated = (shape: any) => {
	emit('shapeSelected', shape.type)
}
</script>

<style scoped>
.ai-shape-input {
	@apply w-full;
}
</style>

