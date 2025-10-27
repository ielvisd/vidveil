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
				<svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
				<p class="text-gray-500">No video selected</p>
			</div>
		</div>

		<PlayerControls
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
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.player-container {
	flex: 1;
	background-color: #000;
	border-radius: 0.5rem 0.5rem 0 0;
	overflow: hidden;
	position: relative;
	aspect-ratio: 16 / 9;
}

.video-player {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.empty-state {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
</style>
