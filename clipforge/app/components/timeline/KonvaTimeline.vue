<template>
	<div class="konva-timeline">
		<div class="timeline-controls">
			<div class="zoom-controls">
				<UButton size="xs" @click="setZoom(1)">Fit</UButton>
				<UButton size="xs" @click="setZoom(2)">1x</UButton>
				<UButton size="xs" @click="setZoom(4)">2x</UButton>
				<UButton size="xs" @click="setZoom(8)">5x</UButton>
			</div>
			<div class="playhead-time">{{ formatTime(playheadPosition) }}</div>
		</div>
		<div ref="timelineContainer" class="timeline-canvas-container">
			<canvas ref="timelineCanvas" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp"></canvas>
		</div>
	</div>
</template>

<script setup lang="ts">
import Konva from 'konva'
import type { Clip } from '~/types/project'

const props = defineProps<{
	clips: Clip[]
	duration: number
}>()

const emit = defineEmits<{
	'update:playhead': [position: number]
	'clip-selected': [clipId: string]
	'clip-trimmed': [clipId: string, inPoint: number, outPoint: number]
	'clip-moved': [clipId: string, newStart: number]
}>()

const timelineContainer = ref<HTMLDivElement | null>(null)
const timelineCanvas = ref<HTMLCanvasElement | null>(null)
const { zoomLevel, setZoom: setZoomLevel } = useTimeline()
const { playheadPosition, setPlayheadPosition } = usePlayer()

let stage: Konva.Stage | null = null
let layer: Konva.Layer | null = null
let playheadLine: Konva.Line | null = null
let clipShapes: Map<string, Konva.Group> = new Map()
let isDragging = false
let dragTarget: { type: 'clip' | 'trim-start' | 'trim-end' | 'playhead', clipId?: string } | null = null
let dragStartX = 0
let dragStartValue = 0

const TIMELINE_HEIGHT = 150
const TRACK_HEIGHT = 60
const RULER_HEIGHT = 30
const PIXELS_PER_SECOND = 100

const setZoom = (level: number) => {
	setZoomLevel(level)
	renderTimeline()
}

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	const frames = Math.floor((seconds % 1) * 30)
	return `${mins}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
}

const initKonva = () => {
	if (!timelineContainer.value || !timelineCanvas.value) return

	const width = timelineContainer.value.clientWidth
	stage = new Konva.Stage({
		container: timelineContainer.value,
		width,
		height: TIMELINE_HEIGHT
	})

	layer = new Konva.Layer()
	stage.add(layer)

	// Draw ruler
	drawRuler()

	// Draw clips
	drawClips()

	// Draw playhead
	drawPlayhead()

	layer.draw()
}

const drawRuler = () => {
	if (!layer) return

	const width = stage?.width() || 0
	const totalSeconds = Math.ceil(props.duration || 30)
	const pixelsPerSecond = PIXELS_PER_SECOND * (zoomLevel.value / 2)

	// Ruler background
	const rulerBg = new Konva.Rect({
		x: 0,
		y: 0,
		width,
		height: RULER_HEIGHT,
		fill: '#1f2937'
	})
	layer.add(rulerBg)

	// Timecode markers
	for (let i = 0; i <= totalSeconds; i++) {
		const x = i * pixelsPerSecond
		if (x > width) break

		// Major tick every second
		const tick = new Konva.Line({
			points: [x, RULER_HEIGHT - 10, x, RULER_HEIGHT],
			stroke: '#9ca3af',
			strokeWidth: 1
		})
		layer.add(tick)

		// Label every 5 seconds
		if (i % 5 === 0) {
			const label = new Konva.Text({
				x: x + 5,
				y: 5,
				text: formatTime(i),
				fontSize: 10,
				fill: '#d1d5db'
			})
			layer.add(label)
		}
	}
}

const drawClips = () => {
	if (!layer) return

	clipShapes.clear()
	const pixelsPerSecond = PIXELS_PER_SECOND * (zoomLevel.value / 2)

	props.clips.forEach((clip, index) => {
		const x = (clip.start_time || 0) * pixelsPerSecond
		const width = ((clip.end_time || clip.duration || 0) - (clip.start_time || 0)) * pixelsPerSecond
		const y = RULER_HEIGHT + 10

		const group = new Konva.Group({
			x,
			y,
			draggable: true,
			id: clip.id
		})

		// Clip background
		const rect = new Konva.Rect({
			x: 0,
			y: 0,
			width,
			height: TRACK_HEIGHT,
			fill: '#3b82f6',
			stroke: '#2563eb',
			strokeWidth: 2,
			cornerRadius: 4
		})
		group.add(rect)

		// Clip name
		const text = new Konva.Text({
			x: 10,
			y: 10,
			text: clip.name || `Clip ${index + 1}`,
			fontSize: 14,
			fill: '#ffffff',
			width: width - 20,
			ellipsis: true
		})
		group.add(text)

		// Trim handles
		const leftHandle = new Konva.Rect({
			x: 0,
			y: 0,
			width: 8,
			height: TRACK_HEIGHT,
			fill: '#fbbf24',
			name: 'trim-start'
		})
		group.add(leftHandle)

		const rightHandle = new Konva.Rect({
			x: width - 8,
			y: 0,
			width: 8,
			height: TRACK_HEIGHT,
			fill: '#fbbf24',
			name: 'trim-end'
		})
		group.add(rightHandle)

		// Click to select
		group.on('click', () => {
			emit('clip-selected', clip.id)
		})

		layer.add(group)
		clipShapes.set(clip.id, group)
	})
}

const drawPlayhead = () => {
	if (!layer) return

	const pixelsPerSecond = PIXELS_PER_SECOND * (zoomLevel.value / 2)
	const x = playheadPosition.value * pixelsPerSecond

	if (playheadLine) {
		playheadLine.destroy()
	}

	playheadLine = new Konva.Line({
		points: [x, 0, x, TIMELINE_HEIGHT],
		stroke: '#ef4444',
		strokeWidth: 2
	})
	layer.add(playheadLine)
}

const handleMouseDown = (e: MouseEvent) => {
	if (!stage || !layer) return

	const pos = stage.getPointerPosition()
	if (!pos) return

	// Check if clicking playhead
	const pixelsPerSecond = PIXELS_PER_SECOND * (zoomLevel.value / 2)
	const playheadX = playheadPosition.value * pixelsPerSecond
	if (Math.abs(pos.x - playheadX) < 5) {
		isDragging = true
		dragTarget = { type: 'playhead' }
		dragStartX = pos.x
		return
	}

	// Check if clicking clip or trim handle
	const shape = stage.getIntersection(pos)
	if (shape) {
		const group = shape.getParent() as Konva.Group
		if (group && group.id()) {
			isDragging = true
			dragStartX = pos.x
			
			if (shape.name() === 'trim-start') {
				dragTarget = { type: 'trim-start', clipId: group.id() }
			} else if (shape.name() === 'trim-end') {
				dragTarget = { type: 'trim-end', clipId: group.id() }
			} else {
				dragTarget = { type: 'clip', clipId: group.id() }
				dragStartValue = group.x()
			}
		}
	}
}

const handleMouseMove = (e: MouseEvent) => {
	if (!isDragging || !dragTarget || !stage) return

	const pos = stage.getPointerPosition()
	if (!pos) return

	const pixelsPerSecond = PIXELS_PER_SECOND * (zoomLevel.value / 2)

	if (dragTarget.type === 'playhead') {
		const newTime = Math.max(0, pos.x / pixelsPerSecond)
		setPlayheadPosition(newTime)
		emit('update:playhead', newTime)
		renderTimeline()
	} else if (dragTarget.type === 'clip' && dragTarget.clipId) {
		const delta = pos.x - dragStartX
		const group = clipShapes.get(dragTarget.clipId)
		if (group) {
			group.x(Math.max(0, dragStartValue + delta))
			layer?.draw()
		}
	}
}

const handleMouseUp = () => {
	if (isDragging && dragTarget && dragTarget.type === 'clip' && dragTarget.clipId) {
		const group = clipShapes.get(dragTarget.clipId)
		if (group) {
			const pixelsPerSecond = PIXELS_PER_SECOND * (zoomLevel.value / 2)
			const newStart = group.x() / pixelsPerSecond
			emit('clip-moved', dragTarget.clipId, newStart)
		}
	}

	isDragging = false
	dragTarget = null
}

const renderTimeline = () => {
	if (!layer) return
	layer.destroyChildren()
	drawRuler()
	drawClips()
	drawPlayhead()
	layer.draw()
}

watch(() => props.clips, () => {
	renderTimeline()
}, { deep: true })

watch(() => playheadPosition.value, () => {
	if (!isDragging) {
		renderTimeline()
	}
})

watch(() => zoomLevel.value, () => {
	renderTimeline()
})

onMounted(() => {
	initKonva()
	
	// Resize observer
	const resizeObserver = new ResizeObserver(() => {
		if (stage && timelineContainer.value) {
			stage.width(timelineContainer.value.clientWidth)
			renderTimeline()
		}
	})
	
	if (timelineContainer.value) {
		resizeObserver.observe(timelineContainer.value)
	}
	
	onUnmounted(() => {
		resizeObserver.disconnect()
		stage?.destroy()
	})
})
</script>

<style scoped>
.konva-timeline {
	width: 100%;
	background-color: #111827;
	border-top: 1px solid #374151;
}

.timeline-controls {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0.5rem 1rem;
	background-color: #1f2937;
	border-bottom: 1px solid #374151;
}

.zoom-controls {
	display: flex;
	gap: 0.5rem;
}

.playhead-time {
	font-family: 'Monaco', 'Courier New', monospace;
	font-size: 0.875rem;
	color: #d1d5db;
}

.timeline-canvas-container {
	position: relative;
	width: 100%;
	height: 150px;
	overflow-x: auto;
	overflow-y: hidden;
}

canvas {
	display: block;
}
</style>

