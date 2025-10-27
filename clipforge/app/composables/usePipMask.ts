import { ref, computed } from 'vue'

export type PipShape = 'circle' | 'square' | 'heart' | 'hexagon' | 'star' | 'custom'

export interface PipConfig {
	shape: PipShape
	position: { x: number; y: number }
	size: { width: number; height: number }
	border?: {
		color: string
		width: number
	}
	shadow?: {
		enabled: boolean
		blur: number
		color: string
	}
}

export const usePipMask = () => {
	const pipConfig = ref<PipConfig>({
		shape: 'circle',
		position: { x: 100, y: 100 },
		size: { width: 200, height: 200 },
		border: {
			color: '#ffffff',
			width: 3
		},
		shadow: {
			enabled: true,
			blur: 10,
			color: 'rgba(0, 0, 0, 0.5)'
		}
	})

	const clipPath = computed(() => {
		const { shape, size } = pipConfig.value
		const { width, height } = size

		switch (shape) {
			case 'circle':
				return `circle(50% at 50% 50%)`
			case 'square':
				return `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`
			case 'heart':
				return createHeartPath(width, height)
			case 'hexagon':
				return createHexagonPath(width, height)
			case 'star':
				return createStarPath(width, height)
			default:
				return `circle(50% at 50% 50%)`
		}
	})

	const styleObject = computed(() => {
		const { position, size, border, shadow } = pipConfig.value

		return {
			position: 'absolute',
			left: `${position.x}px`,
			top: `${position.y}px`,
			width: `${size.width}px`,
			height: `${size.height}px`,
			clipPath: clipPath.value,
			border: border ? `${border.width}px solid ${border.color}` : 'none',
			boxShadow: shadow?.enabled 
				? `0 0 ${shadow.blur}px ${shadow.color}` 
				: 'none'
		}
	})

	const createHeartPath = (width: number, height: number): string => {
		// SVG heart path
		return `path('M ${width/2} ${height/4} C ${width/2} ${height/4}, ${width/8} ${height/8}, ${width/8} ${height/4} C ${width/8} ${height/3}, ${width/8} ${height/2}, ${width/2} ${height*3/4} C ${width*7/8} ${height/2}, ${width*7/8} ${height/3}, ${width*7/8} ${height/4} C ${width*7/8} ${height/8}, ${width/2} ${height/4}, ${width/2} ${height/4} Z')`
	}

	const createHexagonPath = (width: number, height: number): string => {
		const points = [
			`${width/2} 0`,
			`${width} ${height/4}`,
			`${width} ${height*3/4}`,
			`${width/2} ${height}`,
			`0 ${height*3/4}`,
			`0 ${height/4}`
		]
		return `polygon(${points.join(', ')})`
	}

	const createStarPath = (width: number, height: number): string => {
		// 5-pointed star
		const cx = width / 2
		const cy = height / 2
		const outerRadius = Math.min(width, height) / 2
		const innerRadius = outerRadius * 0.4

		const points = []
		for (let i = 0; i < 5; i++) {
			const angleOuter = (i * 2 * Math.PI) / 5 - Math.PI / 2
			const angleInner = ((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2
			
			points.push(`${cx + outerRadius * Math.cos(angleOuter)}, ${cy + outerRadius * Math.sin(angleOuter)}`)
			points.push(`${cx + innerRadius * Math.cos(angleInner)}, ${cy + innerRadius * Math.sin(angleInner)}`)
		}

		return `polygon(${points.join(', ')})`
	}

	const updateShape = (shape: PipShape) => {
		pipConfig.value.shape = shape
	}

	const updatePosition = (x: number, y: number) => {
		pipConfig.value.position = { x, y }
	}

	const updateSize = (width: number, height: number) => {
		pipConfig.value.size = { width, height }
	}

	const setBorder = (color: string, width: number) => {
		pipConfig.value.border = { color, width }
	}

	const setShadow = (enabled: boolean, blur: number, color: string) => {
		pipConfig.value.shadow = { enabled, blur, color }
	}

	return {
		pipConfig,
		clipPath,
		styleObject,
		updateShape,
		updatePosition,
		updateSize,
		setBorder,
		setShadow
	}
}

