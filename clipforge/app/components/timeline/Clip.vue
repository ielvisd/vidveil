<template>
	<div
		class="clip"
		:class="{ selected, muted }"
		:style="clipStyle"
		@mousedown="handleMouseDown"
		@mouseup="handleMouseUp"
		@mousemove="handleMouseMove"
	>
		<div class="clip-content">
			<img v-if="thumbnail" :src="thumbnail" class="clip-thumbnail" />
			<div class="clip-info">
				<span class="clip-name">{{ name }}</span>
				<span class="clip-duration">{{ duration }}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	name: string
	thumbnail?: string
	duration: string
	selected?: boolean
	muted?: boolean
	position: { x: number; y: number }
	size: { width: number; height: number }
}

const props = defineProps<Props>()

const emit = defineEmits<{
	select: []
	move: [position: { x: number; y: number }]
}>()

const isDragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const clipStyle = computed(() => ({
	left: `${props.position.x}px`,
	top: `${props.position.y}px`,
	width: `${props.size.width}px`,
	height: `${props.size.height}px`
}))

const handleMouseDown = (event: MouseEvent) => {
	isDragging.value = true
	dragStart.value = {
		x: event.clientX - props.position.x,
		y: event.clientY - props.position.y
	}
	emit('select')
}

const handleMouseUp = () => {
	isDragging.value = false
}

const handleMouseMove = (event: MouseEvent) => {
	if (isDragging.value) {
		emit('move', {
			x: event.clientX - dragStart.value.x,
			y: event.clientY - dragStart.value.y
		})
	}
}
</script>

<style scoped>
.clip {
	@apply absolute cursor-move bg-blue-600 border-2 border-blue-400 rounded transition-all;
}

.clip.selected {
	@apply border-blue-300 ring-2 ring-blue-500;
}

.clip.muted {
	@apply opacity-50;
}

.clip-content {
	@apply h-full flex items-center gap-2 px-2;
}

.clip-thumbnail {
	@apply w-12 h-full object-cover;
}

.clip-info {
	@apply flex flex-col;
}

.clip-name {
	@apply text-xs font-medium truncate;
}

.clip-duration {
	@apply text-xs text-gray-300;
}
</style>

