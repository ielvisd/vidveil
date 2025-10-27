export interface ShapeParams {
	type: string
	width?: number
	height?: number
	spiky?: boolean
	wavy?: boolean
	glow?: boolean
	scale?: number
}

export const generateSVGPath = (params: ShapeParams): string => {
	const { type, width = 100, height = 100 } = params

	switch (type.toLowerCase()) {
		case 'circle':
			return `circle(${Math.min(width, height) / 2}px at 50% 50%)`
		
		case 'square':
			return `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)`
		
		case 'heart':
			return createHeartPath(width, height, params)
		
		case 'hex':
		case 'hexagon':
			return createHexagonPath(width, height)
		
		case 'star':
			return createStarPath(width, height)
		
		case 'diamond':
			return `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`
		
		case 'triangle':
			return `polygon(50% 0%, 100% 100%, 0% 100%)`
		
		case 'ellipse':
			return `ellipse(${width/2}px ${height/2}px at 50% 50%)`
		
		default:
			return `circle(${Math.min(width, height) / 2}px at 50% 50%)`
	}
}

const createHeartPath = (width: number, height: number, params: ShapeParams): string => {
	const scale = params.scale || 1
	const basePath = `M ${width/2} ${height/4} C ${width/2} ${height/4}, ${width/8} ${height/8}, ${width/8} ${height/4} C ${width/8} ${height/3}, ${width/8} ${height/2}, ${width/2} ${height*3/4} C ${width*7/8} ${height/2}, ${width*7/8} ${height/3}, ${width*7/8} ${height/4} C ${width*7/8} ${height/8}, ${width/2} ${height/4}, ${width/2} ${height/4} Z`
	
	if (params.wavy || params.spiky) {
		return `path('${addModifiers(basePath, params)}')`
	}
	
	return `path('${basePath}')`
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

const createStarPath = (width: number, height: number, params?: ShapeParams): string => {
	const cx = width / 2
	const cy = height / 2
	const outerRadius = Math.min(width, height) / 2
	const innerRadius = outerRadius * (params?.spiky ? 0.2 : 0.4)

	const points = []
	for (let i = 0; i < 5; i++) {
		const angleOuter = (i * 2 * Math.PI) / 5 - Math.PI / 2
		const angleInner = ((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2
		
		points.push(`${cx + outerRadius * Math.cos(angleOuter)}, ${cy + outerRadius * Math.sin(angleOuter)}`)
		points.push(`${cx + innerRadius * Math.cos(angleInner)}, ${cy + innerRadius * Math.sin(angleInner)}`)
	}

	return `polygon(${points.join(', ')})`
}

const addModifiers = (path: string, params: ShapeParams): string => {
	// For now, return original path
	// In production, you'd add wavy or spiky effects
	return path
}

