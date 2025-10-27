<template>
	<div class="waveform">
		<canvas ref="canvas" class="waveform-canvas" />
	</div>
</template>

<script setup lang="ts">
interface Props {
	audioData: number[]
}

const props = defineProps<Props>()

const canvas = ref<HTMLCanvasElement | null>(null)
const animationFrame = ref<number | null>(null)

const draw = () => {
	if (!canvas.value) return

	const ctx = canvas.value.getContext('2d')
	if (!ctx) return

	const width = canvas.value.width
	const height = canvas.value.height

	ctx.clearRect(0, 0, width, height)
	ctx.fillStyle = '#3b82f6'
	
	const barWidth = width / props.audioData.length
	
	for (let i = 0; i < props.audioData.length; i++) {
		const barHeight = (props.audioData[i] / 255) * height
		ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight)
	}
}

watch(() => props.audioData, () => {
	draw()
}, { deep: true })

onMounted(() => {
	if (canvas.value) {
		canvas.value.width = canvas.value.offsetWidth
		canvas.value.height = canvas.value.offsetHeight
	}
	draw()
})

onUnmounted(() => {
	if (animationFrame.value) {
		cancelAnimationFrame(animationFrame.value)
	}
})
</script>

<style scoped>
.waveform {
	width: 100%;
	height: 60px;
}

.waveform-canvas {
	width: 100%;
	height: 100%;
}
</style>

