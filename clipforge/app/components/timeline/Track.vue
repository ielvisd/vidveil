<template>
	<div class="track" :class="{ active }">
		<div class="track-header">
			<span class="track-name">{{ name }}</span>
			<div class="track-controls">
				<UButton
					@click="$emit('mute')"
					:icon="muted ? 'i-heroicons-speaker-x-mark' : 'i-heroicons-speaker-wave'"
					size="xs"
					variant="ghost"
				/>
				<UButton
					@click="$emit('solo')"
					:variant="solo ? 'solid' : 'ghost'"
					size="xs"
				>
					Solo
				</UButton>
			</div>
		</div>
		<div class="track-content">
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	name: string
	active?: boolean
	muted?: boolean
	solo?: boolean
}

defineProps<Props>()

defineEmits<{
	mute: []
	solo: []
}>()
</script>

<style scoped>
.track {
	border-b border-gray-700;
}

.track.active {
	bg-gray-800;
}

.track-header {
	flex items-center justify-between px-4 py-2 bg-gray-900;
}

.track-name {
	text-sm font-medium text-gray-300;
}

.track-controls {
	flex gap-2;
}

.track-content {
	relative min-h-[80px];
}
</style>

