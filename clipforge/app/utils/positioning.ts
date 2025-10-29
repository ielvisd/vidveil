export interface Position {
	x: number
	y: number
}

export interface FrameAnalysis {
	highMotionRegions: Position[]
	textRegions: Position[]
	uiHotspots: Position[]
}

// Store previous frame for motion detection
let previousFrameData: ImageData | null = null

/**
 * Lightweight frame analysis - uses downscaled frame for faster processing
 */
export const analyzeFrame = async (
	videoElement: HTMLVideoElement,
	options: { lightweight?: boolean } = {}
): Promise<FrameAnalysis> => {
	const analysis: FrameAnalysis = {
		highMotionRegions: [],
		textRegions: [],
		uiHotspots: []
	}

	if (!videoElement || videoElement.readyState < 2) {
		return analysis
	}

	const { lightweight = true } = options

	try {
		const canvas = document.createElement('canvas')
		const ctx = canvas.getContext('2d', { willReadFrequently: true })
		if (!ctx) return analysis

		// For lightweight mode, analyze downscaled version (much faster)
		// Full resolution only needed for pixel-perfect detection
		const fullWidth = videoElement.videoWidth || 1920
		const fullHeight = videoElement.videoHeight || 1080
		
		const scale = lightweight ? 0.25 : 1.0 // 1/4 resolution = 16x fewer pixels
		canvas.width = Math.floor(fullWidth * scale)
		canvas.height = Math.floor(fullHeight * scale)

		// Draw current frame (scaled down)
		ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
		const currentFrameData = ctx.getImageData(0, 0, canvas.width, canvas.height)

		// Skip motion detection for now (requires previous frame which we don't have on first run)
		// TODO: Could analyze multiple frames at once, but that's more complex
		
		// Detect text regions (using edge detection and contrast analysis)
		analysis.textRegions = detectTextRegions(currentFrameData, canvas.width, canvas.height)

		// Detect UI hotspots (bright/high-contrast rectangular areas)
		analysis.uiHotspots = detectUIHotspots(currentFrameData, canvas.width, canvas.height)

		// Scale regions back up to full resolution for scoring
		if (scale !== 1.0) {
			analysis.textRegions = analysis.textRegions.map(reg => ({
				x: reg.x / scale,
				y: reg.y / scale
			}))
			analysis.uiHotspots = analysis.uiHotspots.map(hotspot => ({
				x: hotspot.x / scale,
				y: hotspot.y / scale
			}))
		}

		return analysis
	} catch (error) {
		console.warn('Frame analysis failed:', error)
		return analysis
	}
}

/**
 * Detect high-motion regions by comparing consecutive frames
 */
function detectMotionRegions(
	prevFrame: ImageData,
	currentFrame: ImageData,
	width: number,
	height: number
): Position[] {
	const motionRegions: Position[] = []
	const gridSize = 50 // Analyze in 50x50 pixel grids
	const threshold = 30 // Motion threshold (0-255)

	for (let y = 0; y < height - gridSize; y += gridSize) {
		for (let x = 0; x < width - gridSize; x += gridSize) {
			let totalDiff = 0
			let sampleCount = 0

			// Sample pixels in grid
			for (let gy = 0; gy < gridSize; gy += 5) {
				for (let gx = 0; gx < gridSize; gx += 5) {
					const px = x + gx
					const py = y + gy
					
					if (px < width && py < height) {
						const prevIdx = (py * width + px) * 4
						const currIdx = (py * width + px) * 4

						// Calculate RGB difference
						const rDiff = Math.abs(prevFrame.data[prevIdx] - currentFrame.data[currIdx])
						const gDiff = Math.abs(prevFrame.data[prevIdx + 1] - currentFrame.data[currIdx + 1])
						const bDiff = Math.abs(prevFrame.data[prevIdx + 2] - currentFrame.data[currIdx + 2])

						totalDiff += (rDiff + gDiff + bDiff) / 3
						sampleCount++
					}
				}
			}

			const avgDiff = totalDiff / sampleCount
			if (avgDiff > threshold) {
				motionRegions.push({ x: x + gridSize / 2, y: y + gridSize / 2 })
			}
		}
	}

	return motionRegions
}

/**
 * Detect text regions using edge detection and high-contrast areas
 */
function detectTextRegions(
	frameData: ImageData,
	width: number,
	height: number
): Position[] {
	const textRegions: Position[] = []
	const gridSize = 100 // Analyze in 100x100 pixel grids

	for (let y = 0; y < height - gridSize; y += gridSize) {
		for (let x = 0; x < width - gridSize; x += gridSize) {
			let edgeCount = 0
			let contrastSum = 0
			let sampleCount = 0

			// Sample pixels for edges and contrast
			for (let gy = 0; gy < gridSize; gy += 3) {
				for (let gx = 0; gx < gridSize; gx += 3) {
					const px = x + gx
					const py = y + gy
					
					if (px < width - 1 && py < height - 1) {
						const idx = (py * width + px) * 4
						const nextXIdx = (py * width + (px + 1)) * 4
						const nextYIdx = ((py + 1) * width + px) * 4

						// Calculate luminance
						const l1 = getLuminance(
							frameData.data[idx],
							frameData.data[idx + 1],
							frameData.data[idx + 2]
						)
						const l2 = getLuminance(
							frameData.data[nextXIdx],
							frameData.data[nextXIdx + 1],
							frameData.data[nextXIdx + 2]
						)
						const l3 = getLuminance(
							frameData.data[nextYIdx],
							frameData.data[nextYIdx + 1],
							frameData.data[nextYIdx + 2]
						)

						// Edge detection (high luminance change)
						const edgeX = Math.abs(l1 - l2)
						const edgeY = Math.abs(l1 - l3)
						if (edgeX > 50 || edgeY > 50) {
							edgeCount++
						}

						contrastSum += Math.max(edgeX, edgeY)
						sampleCount++
					}
				}
			}

			// Text regions have many edges and high contrast
			const edgeDensity = edgeCount / sampleCount
			const avgContrast = contrastSum / sampleCount

			if (edgeDensity > 0.15 && avgContrast > 40) {
				textRegions.push({ x: x + gridSize / 2, y: y + gridSize / 2 })
			}
		}
	}

	return textRegions
}

/**
 * Detect UI hotspots (bright rectangular areas, likely buttons/controls)
 */
function detectUIHotspots(
	frameData: ImageData,
	width: number,
	height: number
): Position[] {
	const hotspots: Position[] = []
	const gridSize = 80

	for (let y = 0; y < height - gridSize; y += gridSize) {
		for (let x = 0; x < width - gridSize; x += gridSize) {
			let totalBrightness = 0
			let sampleCount = 0
			let colorVariance = 0

			// Sample grid for brightness and color uniformity
			const colors: number[] = []
			for (let gy = 0; gy < gridSize; gy += 5) {
				for (let gx = 0; gx < gridSize; gx += 5) {
					const px = x + gx
					const py = y + gy
					
					if (px < width && py < height) {
						const idx = (py * width + px) * 4
						const r = frameData.data[idx]
						const g = frameData.data[idx + 1]
						const b = frameData.data[idx + 2]

						const brightness = getLuminance(r, g, b)
						totalBrightness += brightness
						colors.push(r, g, b)
						sampleCount++
					}
				}
			}

			const avgBrightness = totalBrightness / sampleCount

			// Calculate color variance
			if (colors.length > 0) {
				const avgR = colors.filter((_, i) => i % 3 === 0).reduce((a, b) => a + b, 0) / (colors.length / 3)
				const avgG = colors.filter((_, i) => i % 3 === 1).reduce((a, b) => a + b, 0) / (colors.length / 3)
				const avgB = colors.filter((_, i) => i % 3 === 2).reduce((a, b) => a + b, 0) / (colors.length / 3)

				let variance = 0
				for (let i = 0; i < colors.length; i += 3) {
					const r = colors[i]
					const g = colors[i + 1]
					const b = colors[i + 2]
					variance += Math.sqrt(
						Math.pow(r - avgR, 2) + Math.pow(g - avgG, 2) + Math.pow(b - avgB, 2)
					)
				}
				colorVariance = variance / (colors.length / 3)
			}

			// UI hotspots are bright and have low color variance (uniform color = button/control)
			if (avgBrightness > 180 && colorVariance < 50) {
				hotspots.push({ x: x + gridSize / 2, y: y + gridSize / 2 })
			}
		}
	}

	return hotspots
}

/**
 * Calculate luminance (perceived brightness)
 */
function getLuminance(r: number, g: number, b: number): number {
	return 0.299 * r + 0.587 * g + 0.114 * b
}

export const suggestPiPPosition = async (
	videoElement: HTMLVideoElement,
	pipSize: { width: number; height: number },
	options: { lightweight?: boolean; timeout?: number } = {}
): Promise<Position> => {
	const videoWidth = videoElement.videoWidth || 1920
	const videoHeight = videoElement.videoHeight || 1080

	// Default margin from edges
	const margin = 20

	// Analyze frame for obstacles (with timeout to prevent hanging)
	const { timeout = 500 } = options
	const analysisPromise = analyzeFrame(videoElement, options)
	
	let analysis
	if (timeout > 0) {
		const timeoutPromise = new Promise<FrameAnalysis>(resolve => 
			setTimeout(() => resolve({ highMotionRegions: [], textRegions: [], uiHotspots: [] }), timeout)
		)
		analysis = await Promise.race([analysisPromise, timeoutPromise])
	} else {
		analysis = await analysisPromise
	}

	// Generate candidate positions (corners with some variation)
	const candidates = [
		// Standard corners
		{ x: margin, y: margin }, // Top-left
		{ x: videoWidth - pipSize.width - margin, y: margin }, // Top-right
		{ x: margin, y: videoHeight - pipSize.height - margin }, // Bottom-left
		{ x: videoWidth - pipSize.width - margin, y: videoHeight - pipSize.height - margin }, // Bottom-right
		// Slightly offset variants to avoid edge cases
		{ x: margin + 30, y: margin + 30 }, // Top-left offset
		{ x: videoWidth - pipSize.width - margin - 30, y: margin + 30 }, // Top-right offset
		{ x: margin + 30, y: videoHeight - pipSize.height - margin - 30 }, // Bottom-left offset
		{ x: videoWidth - pipSize.width - margin - 30, y: videoHeight - pipSize.height - margin - 30 } // Bottom-right offset
	]

	// Score each candidate position
	const scoredPositions = candidates
		.filter(pos => 
			pos.x >= 0 && pos.y >= 0 && 
			pos.x + pipSize.width <= videoWidth && 
			pos.y + pipSize.height <= videoHeight
		)
		.map(position => ({
			position,
			score: scorePosition(position, analysis, pipSize, videoWidth, videoHeight)
		}))

	if (scoredPositions.length === 0) {
		// Fallback to bottom-right corner
		return {
			x: videoWidth - pipSize.width - margin,
			y: videoHeight - pipSize.height - margin
		}
	}

	// Return best position
	const best = scoredPositions.reduce((best, current) =>
		current.score > best.score ? current : best
	)

	return best.position
}

const scorePosition = (
	position: Position,
	analysis: FrameAnalysis,
	pipSize: { width: number; height: number },
	videoWidth: number,
	videoHeight: number
): number => {
	let score = 100 // Start with perfect score

	const pipArea = {
		left: position.x,
		top: position.y,
		right: position.x + pipSize.width,
		bottom: position.y + pipSize.height,
		centerX: position.x + pipSize.width / 2,
		centerY: position.y + pipSize.height / 2
	}

	// Check overlap with high-motion regions (heavily penalize)
	let motionPenalty = 0
	for (const region of analysis.highMotionRegions) {
		const distance = Math.sqrt(
			Math.pow(pipArea.centerX - region.x, 2) + 
			Math.pow(pipArea.centerY - region.y, 2)
		)
		const overlapRadius = Math.max(pipSize.width, pipSize.height) / 2 + 50
		
		if (distance < overlapRadius) {
			// Exponential penalty - closer motion = bigger penalty
			motionPenalty += Math.max(0, 40 * (1 - distance / overlapRadius))
		}
	}
	score -= motionPenalty

	// Check overlap with text regions (moderate penalty)
	let textPenalty = 0
	for (const region of analysis.textRegions) {
		const distance = Math.sqrt(
			Math.pow(pipArea.centerX - region.x, 2) + 
			Math.pow(pipArea.centerY - region.y, 2)
		)
		const overlapRadius = Math.max(pipSize.width, pipSize.height) / 2 + 100
		
		if (distance < overlapRadius) {
			textPenalty += Math.max(0, 25 * (1 - distance / overlapRadius))
		}
	}
	score -= textPenalty

	// Check overlap with UI hotspots (heavy penalty - avoid buttons/controls)
	let uiPenalty = 0
	for (const hotspot of analysis.uiHotspots) {
		const distance = Math.sqrt(
			Math.pow(pipArea.centerX - hotspot.x, 2) + 
			Math.pow(pipArea.centerY - hotspot.y, 2)
		)
		const overlapRadius = Math.max(pipSize.width, pipSize.height) / 2 + 80
		
		if (distance < overlapRadius) {
			// Heavy penalty for UI hotspots
			uiPenalty += Math.max(0, 50 * (1 - distance / overlapRadius))
		}
	}
	score -= uiPenalty

	// Prefer corners (especially bottom-right, then bottom-left)
	const isTopLeft = position.x < 150 && position.y < 150
	const isTopRight = position.x > videoWidth - pipSize.width - 150 && position.y < 150
	const isBottomLeft = position.x < 150 && position.y > videoHeight - pipSize.height - 150
	const isBottomRight = position.x > videoWidth - pipSize.width - 150 && position.y > videoHeight - pipSize.height - 150
	
	if (isBottomRight) {
		score += 15 // Prefer bottom-right for most screen recordings
	} else if (isBottomLeft) {
		score += 12
	} else if (isTopRight) {
		score += 8
	} else if (isTopLeft) {
		score += 5
	}

	// Prefer right side slightly (less likely to cover important content)
	if (position.x > videoWidth / 2) {
		score += 3
	}

	// Avoid center of screen (likely to have important content)
	const centerX = videoWidth / 2
	const centerY = videoHeight / 2
	const distanceFromCenter = Math.sqrt(
		Math.pow(pipArea.centerX - centerX, 2) + 
		Math.pow(pipArea.centerY - centerY, 2)
	)
	const centerRadius = Math.min(videoWidth, videoHeight) / 4
	if (distanceFromCenter < centerRadius) {
		score -= 20 * (1 - distanceFromCenter / centerRadius)
	}

	return Math.max(0, score) // Ensure score is non-negative
}

/**
 * Check if two areas overlap (currently using distance-based checking in scorePosition)
 * Kept for potential future use
 */
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

/**
 * Get recommended PiP size based on video dimensions
 */
export const getRecommendedPipSize = (
	videoWidth: number,
	videoHeight: number
): { width: number; height: number } => {
	// PiP should be ~15-20% of video size
	const baseWidth = videoWidth * 0.18
	const baseHeight = videoHeight * 0.18
	
	// Maintain aspect ratio (assume webcam is typically 16:9 or 4:3)
	const aspectRatio = 16 / 9
	const width = baseWidth
	const height = width / aspectRatio
	
	// Ensure minimum and maximum sizes
	const minSize = 150
	const maxSize = Math.min(videoWidth, videoHeight) * 0.3
	
	return {
		width: Math.max(minSize, Math.min(maxSize, width)),
		height: Math.max(minSize, Math.min(maxSize / aspectRatio, height))
	}
}

export const positions: Position[] = [
	{ x: 100, y: 100 }, // Top-left
	{ x: 1720, y: 100 }, // Top-right
	{ x: 100, y: 880 }, // Bottom-left
	{ x: 1720, y: 880 } // Bottom-right
]

