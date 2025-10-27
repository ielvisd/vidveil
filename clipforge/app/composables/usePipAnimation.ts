export interface Animation {
	type: 'pulse' | 'rotate' | 'scale' | 'glow'
	enabled: boolean
	params: Record<string, any>
}

export const usePipAnimation = () => {
	const animations = ref<Animation[]>([])

	const addAnimation = (animation: Animation) => {
		animations.value.push(animation)
	}

	const removeAnimation = (index: number) => {
		animations.value.splice(index, 1)
	}

	const toggleAnimation = (index: number) => {
		animations.value[index].enabled = !animations.value[index].enabled
	}

	const createPulseAnimation = (
		duration: number = 2000,
		scale: number = 1.1
	): Animation => {
		return {
			type: 'pulse',
			enabled: true,
			params: { duration, scale }
		}
	}

	const createRotateAnimation = (
		duration: number = 2000,
		angle: number = 360
	): Animation => {
		return {
			type: 'rotate',
			enabled: true,
			params: { duration, angle }
		}
	}

	const createScaleAnimation = (
		duration: number = 1000,
		fromScale: number = 1,
		toScale: number = 1.2
	): Animation => {
		return {
			type: 'scale',
			enabled: true,
			params: { duration, fromScale, toScale }
		}
	}

	const createGlowAnimation = (
		duration: number = 2000,
		intensity: number = 1.5
	): Animation => {
		return {
			type: 'glow',
			enabled: true,
			params: { duration, intensity }
		}
	}

	const generateKeyframes = (animation: Animation): string => {
		switch (animation.type) {
			case 'pulse':
				return `@keyframes pulse {
					0%, 100% { transform: scale(1); }
					50% { transform: scale(${animation.params.scale}); }
				}`
			case 'rotate':
				return `@keyframes rotate {
					from { transform: rotate(0deg); }
					to { transform: rotate(${animation.params.angle}deg); }
				}`
			case 'scale':
				return `@keyframes scale {
					0% { transform: scale(${animation.params.fromScale}); }
					50% { transform: scale(${animation.params.toScale}); }
					100% { transform: scale(${animation.params.fromScale}); }
				}`
			case 'glow':
				return `@keyframes glow {
					0%, 100% { filter: drop-shadow(0 0 5px rgba(255,255,255,${animation.params.intensity})); }
					50% { filter: drop-shadow(0 0 20px rgba(255,255,255,${animation.params.intensity * 1.5})); }
				}`
			default:
				return ''
		}
	}

	return {
		animations,
		addAnimation,
		removeAnimation,
		toggleAnimation,
		createPulseAnimation,
		createRotateAnimation,
		createScaleAnimation,
		createGlowAnimation,
		generateKeyframes
	}
}

