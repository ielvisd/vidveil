<template>
	<div class="shape-preview" :style="previewStyle">
		<div class="preview-content" v-html="shapeSVG" />
	</div>
</template>

<script setup lang="ts">
interface Props {
	shape: any
	size?: number
}

const props = withDefaults(defineProps<Props>(), {
	size: 100
})

const { generateSVGPath } = useSVGGenerator()

const shapeSVG = computed(() => {
	const { getShapeSVG } = useShapes()
	return getShapeSVG(props.shape.type, props.size, props.size)
})

const previewStyle = computed(() => {
	return {
		width: `${props.size}px`,
		height: `${props.size}px`
	}
})
</script>

<style scoped>
.shape-preview {
	flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden;
}

.preview-content {
	w-full h-full flex items-center justify-center;
}
</style>

