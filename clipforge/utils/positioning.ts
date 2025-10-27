export interface Position {
	x: number
	y: number
}

export interface FrameAnalysis {
	highMotionRegions: Position[]
	textRegions: Position[]
	uiHotspots: Position[]
}

export const analyzeFrame = async (
	videoElement: HTMLVideoElement
): Promise<FrameAnalysis> => {
	const analysis: FrameAnalysis = {
		highMotionRegions: [],
		textRegions: [],
		uiHotspots: []
	}

	// Simple heuristics for now
	// In production, you'd use ML models to analyze the frame

	// Detect high-motion areas by comparing frames
	// Detect text regions (likely UI elements)
	// Detect UI hotspots (buttons, controls, etc.)

	return analysis
}

export const suggestPiPPosition = async (
	videoElement: HTMLVideoElement,
	pipSize: { width: number; height: number }
): Promise<Position> => {
	const videoWidth = videoElement.videoWidth || 1920
	const videoHeight = videoElement.videoHeight || 1080

	// Analyze frame
	const analysis = await analyzeFrame(videoElement)

	// Suggested positions (corners)
	const corners = [
		{ x: 50, y: 50 }, // Top-left
		{ x: videoWidth - pipSize.width - 50, y: 50 }, // Top-right
		{ x: 50, y: videoHeight - pipSize.height - 50 }, // Bottom-left
		{ x: videoWidth - pipSize.width - 50, y: videoHeight - pipSize.height - 50 } // Bottom-right
	]

	// Score each position
	const scoredPositions = corners.map(position => ({
		position,
		score: scorePosition(position, analysis, pipSize, videoWidth, videoHeight)
	}))

	// Return best position
	const bestPosition = scoredPositions.reduce((best, current) =>
		current.score > best.score ? current : best
	).position

	return bestPosition
}

const scorePosition = (
	position: Position,
	analysis: FrameAnalysis,
	pipSize: { width: number; height: number },
	videoWidth: number,
	videoHeight: number
): number => {
	let score = 100 // Start with perfect score

	// Penalize positions in high-motion regions
	const pipArea = {
		left: position.x,
		top: position.y,
		right: position.x + pipSize.width,
		bottom: position.y + pipSize.height
	}

	// Check if PiP overlaps with high-motion areas
	for (const region of analysis.highMotionRegions) {
		if (isOverlapping(pipArea, region, 50)) {
			score -= 30
		}
	}

	// Penalize positions overlapping text
	for (const region of analysis.textRegions) {
		if (isOverlapping(pipArea, region, 100)) {
			score -= 20
		}
	}

	// Penalize positions overlapping UI hotspots
	for (const hotspot of analysis.uiHotspots) {
		if (isOverlapping(pipArea, hotspot, 50)) {
			score -= 40
		}
	}

	// Prefer corners over center
	const isCorner = 
		position.x < 100 ||
		position.x > videoWidth - pipSize.width - 100 ||
		position.y < 100 ||
		position.y > videoHeight - pipSize.height - 100

	if (isCorner) {
		score += 10
	}

	return score
}

const isOverlapping = (
	area1: { left: number; top: number; right: number; bottom: number },
	area2: Position,
	margin: number
): boolean => {
	return (
		area1.left - margin <= area2.x && area2.x <= area1.right + margin &&
		area1.top - margin <= area2.y && area2.y <= area1.bottom + margin
	)
}

export const positions: Position[] = [
	{ x: 100, y: 100 }, // Top-left
	{ x: 1720, y: 100 }, // Top-right
	{ x: 100, y: 880 }, // Bottom-left
	{ x: 1720, y: 880 } // Bottom-right
]

