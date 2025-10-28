import type { Clip } from '~/types/project'
import type { ExportSettings } from '../composables/useFFmpeg'
import { 
  generateConcatCommand, 
  generatePipOverlayCommand, 
  generateEncodingCommand,
  generateMaskCommand,
  type ClipProcessingInfo 
} from './ffmpeg-operations'

export interface VideoCompositionPlan {
  steps: CompositionStep[]
  estimatedTime: number
  outputFile: string
}

export interface CompositionStep {
  type: 'concat' | 'overlay' | 'encode' | 'mask' | 'trim'
  command: string[]
  inputFiles: string[]
  outputFile: string
  description: string
}

export interface PipComposition {
  backgroundClip: Clip
  pipClip: Clip
  pipConfig: {
    x: number
    y: number
    width: number
    height: number
    shape: string
    borderWidth?: number
    borderColor?: string
  }
}

/**
 * Plan video composition workflow
 */
export function planVideoComposition(
  clips: Clip[],
  settings: ExportSettings,
  pipComposition?: PipComposition
): VideoCompositionPlan {
  const steps: CompositionStep[] = []
  const outputFile = `output.${settings.format}`
  let estimatedTime = 0

  // Step 1: Process individual clips (trim if needed)
  const processedClips: ClipProcessingInfo[] = []
  
  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i]
    const inputFile = `clip_${i}.${getFileExtension(clip.src)}`
    const processedFile = `processed_clip_${i}.mp4`
    
    // Check if clip needs trimming
    const needsTrimming = clip.start_time > 0 || clip.end_time !== undefined
    
    if (needsTrimming) {
      const trimCommand = [
        '-i', inputFile,
        '-ss', clip.start_time.toString(),
        '-to', (clip.end_time || clip.duration).toString(),
        '-c', 'copy',
        processedFile
      ]
      
      steps.push({
        type: 'trim',
        command: trimCommand,
        inputFiles: [inputFile],
        outputFile: processedFile,
        description: `Trim clip ${i + 1}`
      })
      
      estimatedTime += clip.duration * 0.1 // Trimming is fast
    }
    
    processedClips.push({
      inputFile: needsTrimming ? processedFile : inputFile,
      startTime: clip.start_time,
      duration: clip.end_time ? clip.end_time - clip.start_time : clip.duration,
      trimStart: clip.start_time,
      trimEnd: clip.end_time
    })
  }

  // Step 2: Handle PiP composition if specified
  if (pipComposition) {
    const { backgroundClip, pipClip, pipConfig } = pipComposition
    
    // Create mask for PiP shape
    const maskFile = 'pip_mask.png'
    const maskCommand = generateMaskCommand(
      `pip_shape.svg`,
      maskFile,
      pipConfig.width,
      pipConfig.height
    )
    
    steps.push({
      type: 'mask',
      command: maskCommand,
      inputFiles: ['pip_shape.svg'],
      outputFile: maskFile,
      description: 'Create PiP shape mask'
    })
    
    // Apply PiP overlay
    const backgroundFile = processedClips.find(c => 
      c.inputFile.includes(`clip_${clips.indexOf(backgroundClip)}`)
    )?.inputFile || 'background.mp4'
    
    const pipFile = processedClips.find(c => 
      c.inputFile.includes(`clip_${clips.indexOf(pipClip)}`)
    )?.inputFile || 'pip.mp4'
    
    const pipOutputFile = 'pip_composed.mp4'
    const overlayCommand = generatePipOverlayCommand(
      backgroundFile,
      pipFile,
      maskFile,
      pipOutputFile,
      pipConfig
    )
    
    steps.push({
      type: 'overlay',
      command: overlayCommand,
      inputFiles: [backgroundFile, pipFile, maskFile],
      outputFile: pipOutputFile,
      description: 'Apply PiP overlay'
    })
    
    estimatedTime += Math.max(backgroundClip.duration, pipClip.duration) * 1.5
  }

  // Step 3: Concatenate clips (if multiple clips and no PiP)
  if (clips.length > 1 && !pipComposition) {
    const concatOutputFile = 'concatenated.mp4'
    const concatCommand = generateConcatCommand(processedClips, concatOutputFile)
    
    steps.push({
      type: 'concat',
      command: concatCommand,
      inputFiles: processedClips.map(c => c.inputFile),
      outputFile: concatOutputFile,
      description: 'Concatenate clips'
    })
    
    const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)
    estimatedTime += totalDuration * 1.2
  }

  // Step 4: Final encoding
  const finalInputFile = pipComposition 
    ? 'pip_composed.mp4'
    : clips.length > 1 
      ? 'concatenated.mp4'
      : processedClips[0]?.inputFile || 'input.mp4'
  
  const encodeCommand = generateEncodingCommand(finalInputFile, outputFile, settings)
  
  steps.push({
    type: 'encode',
    command: encodeCommand,
    inputFiles: [finalInputFile],
    outputFile: outputFile,
    description: 'Final encoding'
  })
  
  const finalDuration = pipComposition 
    ? Math.max(backgroundClip.duration, pipClip.duration)
    : clips.reduce((sum, clip) => sum + clip.duration, 0)
  
  estimatedTime += finalDuration * 2.0 // Encoding takes time

  return {
    steps,
    estimatedTime: Math.ceil(estimatedTime),
    outputFile
  }
}

/**
 * Execute video composition plan
 */
export async function executeCompositionPlan(
  plan: VideoCompositionPlan,
  ffmpeg: any, // FFmpeg instance from useFFmpeg
  onProgress?: (step: number, total: number, description: string) => void
): Promise<string> {
  const { steps } = plan
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    
    if (onProgress) {
      onProgress(i + 1, steps.length, step.description)
    }
    
    console.log(`Executing step ${i + 1}/${steps.length}: ${step.description}`)
    console.log('Command:', step.command.join(' '))
    
    try {
      await ffmpeg.exec(step.command)
      console.log(`✅ Step ${i + 1} completed: ${step.description}`)
    } catch (error) {
      console.error(`❌ Step ${i + 1} failed: ${step.description}`, error)
      throw new Error(`Failed to execute step: ${step.description}`)
    }
  }
  
  return plan.outputFile
}

/**
 * Create PiP composition from clips
 */
export function createPipComposition(
  clips: Clip[],
  pipConfig: {
    x: number
    y: number
    width: number
    height: number
    shape: string
    borderWidth?: number
    borderColor?: string
  }
): PipComposition | null {
  // Find screen and webcam clips
  const screenClip = clips.find(c => c.metadata?.type === 'screen')
  const webcamClip = clips.find(c => c.metadata?.type === 'webcam')
  
  if (!screenClip || !webcamClip) {
    return null
  }
  
  return {
    backgroundClip: screenClip,
    pipClip: webcamClip,
    pipConfig
  }
}

/**
 * Generate SVG shape for PiP mask
 */
export function generateShapeSVG(
  shape: string,
  width: number,
  height: number
): string {
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 2
  
  switch (shape.toLowerCase()) {
    case 'circle':
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="white"/>
      </svg>`
    
    case 'heart':
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <path d="M${centerX},${centerY + radius/2} C${centerX - radius/2},${centerY - radius/2} ${centerX - radius},${centerY} ${centerX},${centerY + radius/4} C${centerX + radius},${centerY} ${centerX + radius/2},${centerY - radius/2} ${centerX},${centerY + radius/2} Z" fill="white"/>
      </svg>`
    
    case 'star':
      const points = generateStarPoints(centerX, centerY, radius, 5)
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="${points}" fill="white"/>
      </svg>`
    
    case 'diamond':
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <polygon points="${centerX},${centerY - radius} ${centerX + radius},${centerY} ${centerX},${centerY + radius} ${centerX - radius},${centerY}" fill="white"/>
      </svg>`
    
    default:
      // Default to circle
      return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="white"/>
      </svg>`
  }
}

/**
 * Generate star polygon points
 */
function generateStarPoints(
  centerX: number,
  centerY: number,
  radius: number,
  points: number
): string {
  const angleStep = (Math.PI * 2) / points
  const starPoints: string[] = []
  
  for (let i = 0; i < points * 2; i++) {
    const angle = i * angleStep / 2
    const r = i % 2 === 0 ? radius : radius * 0.5
    const x = centerX + Math.cos(angle) * r
    const y = centerY + Math.sin(angle) * r
    starPoints.push(`${x},${y}`)
  }
  
  return starPoints.join(' ')
}

/**
 * Get file extension from URL or path
 */
function getFileExtension(filePath: string): string {
  const match = filePath.match(/\.([^.]+)$/)
  return match ? match[1] : 'mp4'
}

/**
 * Validate composition plan
 */
export function validateCompositionPlan(plan: VideoCompositionPlan): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!plan.steps || plan.steps.length === 0) {
    errors.push('No composition steps defined')
  }
  
  if (!plan.outputFile) {
    errors.push('No output file specified')
  }
  
  if (plan.estimatedTime <= 0) {
    errors.push('Invalid estimated time')
  }
  
  // Validate each step
  plan.steps.forEach((step, index) => {
    if (!step.command || step.command.length === 0) {
      errors.push(`Step ${index + 1}: No command specified`)
    }
    
    if (!step.outputFile) {
      errors.push(`Step ${index + 1}: No output file specified`)
    }
    
    if (!step.description) {
      errors.push(`Step ${index + 1}: No description provided`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Optimize composition plan for performance
 */
export function optimizeCompositionPlan(plan: VideoCompositionPlan): VideoCompositionPlan {
  // Remove unnecessary steps
  const optimizedSteps = plan.steps.filter(step => {
    // Skip trim steps if no trimming is needed
    if (step.type === 'trim') {
      const hasTrimming = step.command.includes('-ss') || step.command.includes('-to')
      return hasTrimming
    }
    return true
  })
  
  // Recalculate estimated time
  const optimizedEstimatedTime = optimizedSteps.reduce((total, step) => {
    // Estimate time based on step type
    switch (step.type) {
      case 'trim': return total + 1
      case 'concat': return total + 5
      case 'overlay': return total + 10
      case 'encode': return total + 15
      case 'mask': return total + 2
      default: return total + 5
    }
  }, 0)
  
  return {
    ...plan,
    steps: optimizedSteps,
    estimatedTime: optimizedEstimatedTime
  }
}
