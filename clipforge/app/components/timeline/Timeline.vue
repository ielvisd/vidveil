<template>
	<div class="timeline-container">
		<Ruler :duration="duration" :zoom-level="zoomLevel" />

		<div class="timeline-tracks" @wheel="handleWheel">
			<div
				ref="konvaContainer"
				class="konva-canvas"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { Konva } from 'vue-konva'

interface Props {
	duration: number
	clips?: any[]
}

const props = defineProps<Props>()

const konvaContainer = ref<HTMLElement | null>(null)
const stage = ref<any>(null)

const { zoomLevel, pixelsPerSecond, positionToTime } = useZoom()
const { currentTime, playhead } = useTimeline()

const initKonva = () => {
	if (!konvaContainer.value) return

	const width = konvaContainer.value.clientWidth
	const height = 200

	stage.value = new Konva.Stage({
		container: konvaContainer.value,
		width,
		height
	})

	const layer = new Konva.Layer()
	stage.value.add(layer)

	// Draw playhead
	const playheadLine = new Konva.Line({
		points: [0, 0, 0, height],
		stroke: '#00ff00',
		strokeWidth: 2
	})
	layer.add(playheadLine)

	// Update playhead position
	watch([playhead, pixelsPerSecond], ([time, ppS]) => {
		const x = time * ppS
		playheadLine.points([x, 0, x, height])
		layer.batchDraw()
	})
}

const handleWheel = (event: WheelEvent) => {
	event.preventDefault()
	const { zoomIn, zoomOut } = useZoom()
	
	if (event.deltaY > 0) {
		zoomOut()
	} else {
		zoomIn()
	}
}

onMounted(() => {
	initKonva()
})

onUnmounted(() => {
	if (stage.value) {
		stage.value.destroy()
	}
})
</script>

<style scoped>
.timeline-container {
	flex flex-col h-full;
}

.timeline-tracks {
	flex-1 overflow-x-auto overflow-y-hidden;
}

.konva-canvas {
	w-full h-full;
}
</style>

