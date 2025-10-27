<template>
	<div 
		v-if="webcamClip && pipConfig"
		class="pip-overlay"
		:style="overlayStyle"
		@mousedown="startDrag"
		:class="{ dragging: isDragging }"
	>
		<video
			ref="webcamVideo"
			:src="webcamClip.src"
			class="webcam-video"
			:style="videoStyle"
			autoplay
			loop
			muted
		/>
		<div class="pip-controls">
			<button @click="$emit('remove')" class="control-btn" title="Remove PiP">
				<i class="i-heroicons-x-mark" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Clip } from '~/types/project'

const props = defineProps<{
	webcamClip: Clip | null
	pipConfig: any
	containerWidth: number
	containerHeight: number
}>()

const emit = defineEmits<{
	remove: []
	updatePosition: [x: number, y: number]
}>()

const webcamVideo = ref<HTMLVideoElement | null>(null)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const overlayStyle = computed(() => {
	if (!props.pipConfig) return {}
	
	const { x, y, width, height } = props.pipConfig
	
	return {
		left: `${x}%`,
		top: `${y}%`,
		width: `${width}%`,
		height: `${height}%`
	}
})

const videoStyle = computed(() => {
	if (!props.pipConfig) return {}
	
	const { shape } = props.pipConfig
	
	// Apply shape via CSS clip-path
	const clipPaths: Record<string, string> = {
		circle: 'circle(50% at 50% 50%)',
		square: 'inset(0 0 0 0)',
		rounded: 'inset(0 0 0 0 round 20%)',
		heart: 'path("M 50,20 C 50,20 30,5 20,15 C 10,25 10,40 20,50 C 30,60 50,80 50,80 C 50,80 70,60 80,50 C 90,40 90,25 80,15 C 70,5 50,20 50,20 Z")',
		star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
		hexagon: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
		diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
		triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)'
	}
	
	const clipPath = clipPaths[shape] || clipPaths.circle
	
	return {
		clipPath,
		border: props.pipConfig.borderWidth ? `${props.pipConfig.borderWidth}px solid ${props.pipConfig.borderColor || '#fff'}` : 'none',
		boxShadow: props.pipConfig.shadow ? '0 8px 16px rgba(0, 0, 0, 0.4)' : 'none'
	}
})

const startDrag = (e: MouseEvent) => {
	if (!props.pipConfig) return
	
	isDragging.value = true
	
	const rect = (e.target as HTMLElement).closest('.pip-overlay')?.getBoundingClientRect()
	if (!rect) return
	
	dragOffset.value = {
		x: e.clientX - rect.left,
		y: e.clientY - rect.top
	}
	
	window.addEventListener('mousemove', onDrag)
	window.addEventListener('mouseup', stopDrag)
}

const onDrag = (e: MouseEvent) => {
	if (!isDragging.value) return
	
	const x = ((e.clientX - dragOffset.value.x) / props.containerWidth) * 100
	const y = ((e.clientY - dragOffset.value.y) / props.containerHeight) * 100
	
	// Clamp to container bounds
	const clampedX = Math.max(0, Math.min(x, 100 - props.pipConfig.width))
	const clampedY = Math.max(0, Math.min(y, 100 - props.pipConfig.height))
	
	emit('updatePosition', clampedX, clampedY)
}

const stopDrag = () => {
	isDragging.value = false
	window.removeEventListener('mousemove', onDrag)
	window.removeEventListener('mouseup', stopDrag)
}

onUnmounted(() => {
	window.removeEventListener('mousemove', onDrag)
	window.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.pip-overlay {
	position: absolute;
	cursor: move;
	transition: box-shadow 0.2s;
	z-index: 10;
}

.pip-overlay:hover {
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}

.pip-overlay.dragging {
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.8);
	cursor: grabbing;
}

.webcam-video {
	width: 100%;
	height: 100%;
	object-fit: cover;
	display: block;
	background-color: #000;
	transition: clip-path 0.3s ease;
}

.pip-controls {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	opacity: 0;
	transition: opacity 0.2s;
}

.pip-overlay:hover .pip-controls {
	opacity: 1;
}

.control-btn {
	width: 24px;
	height: 24px;
	background-color: rgba(0, 0, 0, 0.7);
	border: none;
	border-radius: 50%;
	color: white;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background-color 0.2s;
}

.control-btn:hover {
	background-color: rgba(220, 38, 38, 0.9);
}
</style>
