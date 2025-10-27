<template>
	<div
		:style="styleObject"
		class="pip-overlay"
		@mousedown="startDrag"
		@mouseup="stopDrag"
		@mousemove="handleDrag"
	>
		<slot />
	</div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const { pipConfig, styleObject, updatePosition } = usePipMask()

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const startDrag = (event: MouseEvent) => {
	isDragging.value = true
	dragStart.value = {
		x: event.clientX - pipConfig.value.position.x,
		y: event.clientY - pipConfig.value.position.y
	}
}

const stopDrag = () => {
	isDragging.value = false
}

const handleDrag = (event: MouseEvent) => {
	if (!isDragging.value) return

	const newX = event.clientX - dragStart.value.x
	const newY = event.clientY - dragStart.value.y

	updatePosition(newX, newY)
}
</script>

<style scoped>
.pip-overlay {
	cursor-move transition-transform hover:scale-105;
}

.pip-overlay:active {
	scale-95;
}
</style>

