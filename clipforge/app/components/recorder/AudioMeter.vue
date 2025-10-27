<template>
	<div class="audio-meter">
		<div class="meter-bar">
			<div
				class="meter-fill"
				:style="{ width: `${audioLevel}%` }"
				:class="{
					'low': audioLevel < 30,
					'medium': audioLevel >= 30 && audioLevel < 70,
					'high': audioLevel >= 70
				}"
			/>
		</div>
		<span class="meter-label">{{ Math.round(audioLevel) }}%</span>
	</div>
</template>

<script setup lang="ts">
interface Props {
	audioLevel: number
}

defineProps<Props>()
</script>

<style scoped>
.audio-meter {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.meter-bar {
	width: 100%;
	height: 0.5rem;
	background-color: rgb(31 41 55);
	border-radius: 0.25rem;
	overflow: hidden;
}

.meter-fill {
	height: 100%;
	transition: width 0.1s;
}

.meter-fill.low {
	background-color: rgb(34 197 94);
}

.meter-fill.medium {
	background-color: rgb(234 179 8);
}

.meter-fill.high {
	background-color: rgb(239 68 68);
}

.meter-label {
	font-size: 0.75rem;
	color: rgb(156 163 175);
	min-width: 3rem;
	text-align: right;
}
</style>

