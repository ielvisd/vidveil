<template>
	<div class="webcam-preview">
		<video
			ref="videoElement"
			autoplay
			muted
			class="webcam-video"
			:style="videoStyle"
		/>
		
		<div v-if="!stream" class="no-webcam">
			<p>Webcam not active</p>
		</div>
	</div>
</template>

<script setup lang="ts">
interface Props {
	stream?: MediaStream | null
	pipMask?: string
}

const props = defineProps<Props>()

const videoElement = ref<HTMLVideoElement | null>(null)

const videoStyle = computed(() => {
	if (props.pipMask) {
		return {
			clipPath: getClipPath(props.pipMask)
		}
	}
	return {}
})

const getClipPath = (shape: string): string => {
	switch (shape.toLowerCase()) {
		case 'circle':
			return 'circle(50% at 50% 50%)'
		case 'square':
			return 'inset(0)'
		case 'heart':
			return 'path("M12,21.35l-1.45-1.32C5.4,15.36,2,12.27,2,8.5 C2,5.41,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.08C13.09,3.81,14.76,3,16.5,3 C19.58,3,22,5.41,22,8.5c0,3.77-3.4,6.86-8.55,11.53L12,21.35z")'
		default:
			return 'circle(50% at 50% 50%)'
	}
}

watch(() => props.stream, (newStream) => {
	if (videoElement.value && newStream) {
		videoElement.value.srcObject = newStream
	}
})
</script>

<style scoped>
.webcam-preview {
	width: 100%;
	max-width: 640px;
	margin: 0 auto;
	position: relative;
}

.webcam-video {
	width: 100%;
	border-radius: 0.5rem;
	background-color: #1f2937;
}

.no-webcam {
	width: 100%;
	aspect-ratio: 16 / 9;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #1f2937;
	border-radius: 0.5rem;
	color: #9ca3af;
}
</style>

