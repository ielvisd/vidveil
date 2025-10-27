export type PredefinedShape = 'circle' | 'square' | 'heart' | 'hex' | 'star' | 'diamond' | 'triangle' | 'pentagon' | 'octagon' | 'ellipse'

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

