<template>
	<div class="time-ruler" :style="{ width: rulerWidth + 'px' }">
		<div
			v-for="(mark, index) in timeMarks"
			:key="index"
			class="time-mark"
			:style="{ left: mark.position + 'px' }"
		>
			<div class="tick" :class="mark.major ? 'major' : 'minor'" />
			<span v-if="mark.major" class="label">{{ mark.label }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
const props = defineProps<{
	duration: number
	pixelsPerSecond: number
}>()

const rulerWidth = computed(() => props.duration * props.pixelsPerSecond)

const timeMarks = computed(() => {
	const marks: Array<{ position: number; label: string; major: boolean }> = []
	const totalSeconds = Math.ceil(props.duration)
	
	// Determine interval based on zoom level
	let majorInterval = 10 // seconds
	let minorInterval = 1
	
	if (props.pixelsPerSecond < 20) {
		majorInterval = 30
		minorInterval = 10
	} else if (props.pixelsPerSecond < 40) {
		majorInterval = 20
		minorInterval = 5
	} else if (props.pixelsPerSecond > 100) {
		majorInterval = 5
		minorInterval = 1
	}
	
	for (let i = 0; i <= totalSeconds; i += minorInterval) {
		const isMajor = i % majorInterval === 0
		marks.push({
			position: i * props.pixelsPerSecond,
			label: formatTime(i),
			major: isMajor
		})
	}
	
	return marks
})

const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60
	return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.time-ruler {
	height: 30px;
	position: relative;
	background-color: rgb(17 24 39);
	border-bottom: 1px solid rgb(55 65 81);
}

.time-mark {
	position: absolute;
	top: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.tick {
	width: 1px;
	background-color: rgb(75 85 99);
}

.tick.minor {
	height: 8px;
}

.tick.major {
	height: 12px;
	background-color: rgb(107 114 128);
}

.label {
	font-size: 0.625rem;
	color: rgb(156 163 175);
	margin-top: 2px;
	user-select: none;
}
</style>

