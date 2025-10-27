<template>
	<div class="timeline-ruler" ref="rulerElement">
		<div
			v-for="mark in marks"
			:key="mark.time"
			class="ruler-mark"
			:style="{ left: `${mark.position}px` }"
		>
			<div class="ruler-line" />
			<div class="ruler-label">{{ formatTime(mark.time) }}</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
	duration: number
	zoomLevel: number
}

const props = defineProps<Props>()

const rulerElement = ref<HTMLElement | null>(null)
const rulerWidth = ref(1920)

const pixelsPerSecond = computed(() => props.zoomLevel)

const marks = computed(() => {
	const marks: Array<{ time: number; position: number }> = []
	const interval = getMarkInterval()
	
	for (let time = 0; time <= props.duration; time += interval) {
		const position = time * pixelsPerSecond.value
		marks.push({ time, position })
	}
	
	return marks
})

const getMarkInterval = (): number => {
	// Determine interval based on zoom level
	if (pixelsPerSecond.value < 0.5) return 60 // 1 minute
	if (pixelsPerSecond.value < 5) return 30 // 30 seconds
	if (pixelsPerSecond.value < 50) return 10 // 10 seconds
	return 1 // 1 second
}

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.timeline-ruler {
	relative h-8 bg-gray-800 border-b border-gray-700;
}

.ruler-mark {
	absolute h-full flex flex-col items-center;
}

.ruler-line {
	w-px h-2 bg-gray-500;
}

.ruler-label {
	text-xs text-gray-400 mt-1;
}
</style>

