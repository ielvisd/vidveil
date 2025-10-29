<template>
	<div 
		class="playhead-indicator"
		:style="{ left: playheadPosition + 'px' }"
		@mousedown="handleMouseDown"
	>
		<div class="playhead-handle" />
		<div class="playhead-line" />
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	playheadPosition: number
}>()

const emit = defineEmits<{
	'update:position': [position: number]
}>()

let isDragging = false
let dragStartX = 0
let dragStartPosition = 0

const handleMouseDown = (event: MouseEvent) => {
	event.preventDefault()
	event.stopPropagation()
	
	isDragging = true
	dragStartX = event.clientX
	dragStartPosition = props.playheadPosition
	
	document.addEventListener('mousemove', handleMouseMove)
	document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (event: MouseEvent) => {
	if (!isDragging) return
	
	// Get the timeline container to calculate relative position
	const timelineContainer = (event.target as HTMLElement)?.closest('.track-content')
	if (!timelineContainer) return
	
	const rect = timelineContainer.getBoundingClientRect()
	const relativeX = event.clientX - rect.left
	const newPosition = Math.max(0, relativeX)
	
	emit('update:position', newPosition)
}

const handleMouseUp = () => {
	isDragging = false
	document.removeEventListener('mousemove', handleMouseMove)
	document.removeEventListener('mouseup', handleMouseUp)
}
</script>

<style scoped>
.playhead-indicator {
	position: absolute;
	top: 0;
	bottom: 0;
	z-index: 10;
	transition: left 0.05s linear;
	cursor: grab;
	pointer-events: auto;
}

.playhead-indicator:active {
	cursor: grabbing;
}

.playhead-handle {
	position: absolute;
	top: 0;
	left: -6px;
	width: 12px;
	height: 12px;
	background-color: rgb(239 68 68);
	border-radius: 50%;
	border: 2px solid white;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	pointer-events: auto;
	cursor: grab;
}

.playhead-handle:active {
	cursor: grabbing;
}

.playhead-line {
	position: absolute;
	top: 12px;
	left: -1px;
	width: 4px;
	height: calc(100% - 12px);
	background-color: rgb(239 68 68);
	box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
	pointer-events: auto;
	cursor: grab;
}
</style>

