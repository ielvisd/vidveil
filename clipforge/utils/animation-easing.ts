export type EasingFunction = (t: number) => number

export const linear: EasingFunction = (t: number) => t

export const easeInQuad: EasingFunction = (t: number) => t * t

export const easeOutQuad: EasingFunction = (t: number) => t * (2 - t)

export const easeInOutQuad: EasingFunction = (t: number) => 
	t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t

export const easeInCubic: EasingFunction = (t: number) => t * t * t

export const easeOutCubic: EasingFunction = (t: number) => {
	const t1 = t - 1
	return t1 * t1 * t1 + 1
}

export const easeInOutCubic: EasingFunction = (t: number) => 
	t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1

export const easeInElastic: EasingFunction = (t: number) => {
	const c4 = (2 * Math.PI) / 3
	return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)
}

export const easeOutElastic: EasingFunction = (t: number) => {
	const c4 = (2 * Math.PI) / 3
	return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

export const easeInOutElastic: EasingFunction = (t: number) => {
	const c5 = (2 * Math.PI) / 4.5
	return t === 0 ? 0 : t === 1 ? 1 : t < 0.5 
		? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
		: (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1
}

export const bounce: EasingFunction = (t: number) => {
	if (t < 1 / 2.75) {
		return 7.5625 * t * t
	} else if (t < 2 / 2.75) {
		return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
	} else if (t < 2.5 / 2.75) {
		return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
	} else {
		return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
	}
}

export const applyEasing = (
	easing: EasingFunction,
	startValue: number,
	endValue: number,
	progress: number
): number => {
	return startValue + (endValue - startValue) * easing(progress)
}

