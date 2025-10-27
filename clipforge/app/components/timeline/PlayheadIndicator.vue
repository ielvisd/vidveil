<template>
	<div 
		class="playhead-indicator"
		:style="{ left: playheadPosition + 'px' }"
	>
		<div class="playhead-handle" />
		<div class="playhead-line" />
	</div>
</template>

<script setup lang="ts">
defineProps<{
	playheadPosition: number
}>()
</script>

<style scoped>
.playhead-indicator {
	position: absolute;
	top: 0;
	bottom: 0;
	z-index: 10;
	pointer-events: none;
	transition: left 0.05s linear;
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
}

.playhead-line {
	position: absolute;
	top: 12px;
	left: 0;
	width: 2px;
	height: calc(100% - 12px);
	background-color: rgb(239 68 68);
	box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
}
</style>

