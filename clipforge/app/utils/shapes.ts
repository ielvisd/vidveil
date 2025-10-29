export type PredefinedShape = 'circle' | 'square' | 'heart' | 'hex' | 'star' | 'diamond' | 'triangle' | 'pentagon' | 'octagon' | 'ellipse' | 'rounded'

export const SHAPE_LIBRARY: Record<PredefinedShape, any> = {
	circle: {
		type: 'circle',
		svg: `<circle cx="50" cy="50" r="45" />`,
		description: 'Perfect circle'
	},
	square: {
		type: 'square',
		svg: `<rect x="5" y="5" width="90" height="90" />`,
		description: 'Square shape'
	},
	heart: {
		type: 'heart',
		svg: `<path d="M 50,20 C 50,20 30,5 20,15 C 10,25 10,40 20,50 C 30,60 50,80 50,80 C 50,80 70,60 80,50 C 90,40 90,25 80,15 C 70,5 50,20 50,20 Z" />`,
		description: 'Heart shape'
	},
	hex: {
		type: 'hex',
		svg: `<polygon points="50,5 95,25 95,75 50,95 5,75 5,25" />`,
		description: 'Hexagon shape'
	},
	star: {
		type: 'star',
		svg: `<path d="M 50,5 L 60,40 L 95,40 L 70,60 L 80,95 L 50,75 L 20,95 L 30,60 L 5,40 L 40,40 Z" />`,
		description: '5-pointed star'
	},
	diamond: {
		type: 'diamond',
		svg: `<polygon points="50,5 95,50 50,95 5,50" />`,
		description: 'Diamond shape'
	},
	triangle: {
		type: 'triangle',
		svg: `<polygon points="50,5 95,95 5,95" />`,
		description: 'Triangle shape'
	},
	pentagon: {
		type: 'pentagon',
		svg: `<polygon points="50,5 95,35 80,85 20,85 5,35" />`,
		description: 'Pentagon shape'
	},
	octagon: {
		type: 'octagon',
		svg: `<polygon points="50,5 95,20 95,80 50,95 5,80 5,20" />`,
		description: 'Octagon shape'
	},
	ellipse: {
		type: 'ellipse',
		svg: `<ellipse cx="50" cy="50" rx="40" ry="30" />`,
		description: 'Ellipse shape'
	},
	rounded: {
		type: 'rounded',
		svg: `<rect x="5" y="5" width="90" height="90" rx="20" ry="20" />`,
		description: 'Rounded rectangle'
	}
}

export const getShapeSVG = (shape: PredefinedShape, width: number = 100, height: number = 100): string => {
	const shapeDef = SHAPE_LIBRARY[shape]
	if (!shapeDef) return ''

	return `<svg width="${width}" height="${height}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${shapeDef.svg}</svg>`
}

export const getShapeDescription = (shape: PredefinedShape): string => {
	return SHAPE_LIBRARY[shape]?.description || ''
}

/**
 * Generate a canvas Path2D compatible path for a given shape
 * Used for canvas clipping during export
 */
export const getShapePath = (
	shape: PredefinedShape, 
	x: number, 
	y: number, 
	width: number, 
	height: number
): string => {
	const cx = x + width / 2
	const cy = y + height / 2
	const rx = width / 2
	const ry = height / 2

	switch (shape) {
		case 'circle':
			// Circle path
			return `M ${cx - rx},${cy} A ${rx},${ry} 0 1,0 ${cx + rx},${cy} A ${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`
		
		case 'square':
			// Square path
			return `M ${x},${y} L ${x + width},${y} L ${x + width},${y + height} L ${x},${y + height} Z`
		
		case 'heart':
			// Heart path (scaled to position)
			const scale = width / 100
			return `M ${cx},${y + 20 * scale} 
				C ${cx},${y + 20 * scale} ${cx - 20 * scale},${y + 5 * scale} ${cx - 30 * scale},${y + 15 * scale} 
				C ${cx - 40 * scale},${y + 25 * scale} ${cx - 40 * scale},${y + 40 * scale} ${cx - 30 * scale},${y + 50 * scale} 
				C ${cx - 20 * scale},${y + 60 * scale} ${cx},${y + 80 * scale} ${cx},${y + 80 * scale} 
				C ${cx},${y + 80 * scale} ${cx + 20 * scale},${y + 60 * scale} ${cx + 30 * scale},${y + 50 * scale} 
				C ${cx + 40 * scale},${y + 40 * scale} ${cx + 40 * scale},${y + 25 * scale} ${cx + 30 * scale},${y + 15 * scale} 
				C ${cx + 20 * scale},${y + 5 * scale} ${cx},${y + 20 * scale} ${cx},${y + 20 * scale} Z`
		
		case 'star':
			// 5-pointed star
			const points = 5
			const outerRadius = Math.min(rx, ry)
			const innerRadius = outerRadius * 0.4
			let starPath = ''
			for (let i = 0; i < points * 2; i++) {
				const radius = i % 2 === 0 ? outerRadius : innerRadius
				const angle = (i * Math.PI) / points - Math.PI / 2
				const px = cx + radius * Math.cos(angle)
				const py = cy + radius * Math.sin(angle)
				starPath += i === 0 ? `M ${px},${py}` : ` L ${px},${py}`
			}
			return starPath + ' Z'
		
		case 'hex':
			// Hexagon
			let hexPath = ''
			for (let i = 0; i < 6; i++) {
				const angle = (i * Math.PI) / 3 - Math.PI / 2
				const px = cx + rx * Math.cos(angle)
				const py = cy + ry * Math.sin(angle)
				hexPath += i === 0 ? `M ${px},${py}` : ` L ${px},${py}`
			}
			return hexPath + ' Z'
		
		case 'diamond':
			// Diamond (rotated square)
			return `M ${cx},${y} L ${x + width},${cy} L ${cx},${y + height} L ${x},${cy} Z`
		
		case 'triangle':
			// Triangle
			return `M ${cx},${y} L ${x + width},${y + height} L ${x},${y + height} Z`
		
		case 'pentagon':
			// Pentagon
			let pentPath = ''
			for (let i = 0; i < 5; i++) {
				const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
				const px = cx + rx * Math.cos(angle)
				const py = cy + ry * Math.sin(angle)
				pentPath += i === 0 ? `M ${px},${py}` : ` L ${px},${py}`
			}
			return pentPath + ' Z'
		
		case 'octagon':
			// Octagon
			let octPath = ''
			for (let i = 0; i < 8; i++) {
				const angle = (i * Math.PI) / 4 - Math.PI / 2
				const px = cx + rx * Math.cos(angle)
				const py = cy + ry * Math.sin(angle)
				octPath += i === 0 ? `M ${px},${py}` : ` L ${px},${py}`
			}
			return octPath + ' Z'
		
		case 'ellipse':
			// Ellipse path
			return `M ${cx - rx},${cy} A ${rx},${ry} 0 1,0 ${cx + rx},${cy} A ${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`
		
		default:
			// Default to circle
			return `M ${cx - rx},${cy} A ${rx},${ry} 0 1,0 ${cx + rx},${cy} A ${rx},${ry} 0 1,0 ${cx - rx},${cy} Z`
	}
}




