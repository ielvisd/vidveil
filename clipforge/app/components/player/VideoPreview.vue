<template>
	<div class="video-preview">
		<div class="player-container">
			<video
				ref="videoElement"
				:src="src"
				class="video-player"
				@loadedmetadata="onLoaded"
				@timeupdate="onTimeUpdate"
			/>

			<div v-if="!src" class="empty-state">
				<UIcon name="i-heroicons-video-camera" class="text-6xl text-gray-400 mb-4" />
				<p class="text-gray-500">No video selected</p>
			</div>
		</div>

		<Controls
			v-if="src && isLoaded"
			:current-time="currentTime"
			:duration="duration"
			:is-playing="isPlaying"
			@play="$emit('play')"
			@pause="$emit('pause')"
			@seek="$emit('seek', $event)"
			@previous="$emit('previous')"
			@next="$emit('next')"
		/>
	</div>
</template>

<script setup lang="ts">
interface Props {
	src?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
	play: []
	pause: []
	seek: [time: number]
	previous: []
	next: []
}>()

const videoElement = ref<HTMLVideoElement | null>(null)
const currentTime = ref(0)
const duration = ref(0)
const isPlaying = ref(false)
const isLoaded = ref(false)

const { initializePlayer, destroy } = usePlayer()

onMounted(() => {
	if (videoElement.value) {
		initializePlayer(videoElement.value)
	}
})

onUnmounted(() => {
	destroy()
})

const onLoaded = () => {
	if (videoElement.value) {
		duration.value = videoElement.value.duration || 0
		isLoaded.value = true
	}
}

const onTimeUpdate = () => {
	if (videoElement.value) {
		currentTime.value = videoElement.value.currentTime
		isPlaying.value = !videoElement.value.paused
	}
}

watch(() => props.src, () => {
	if (props.src && videoElement.value) {
		isLoaded.value = false
	}
})
</script>

<style scoped>
.video-preview {
	w-full h-full flex flex-col;
}

.player-container {
	flex-1 bg-black rounded-t-lg overflow-hidden relative;
	aspect-ratio: 16/9;
}

.video-player {
	w-full h-full object-contain;
}

.empty-state {
	absolute inset-0 flex flex-col items-center justify-center;
}
</style>

