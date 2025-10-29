import type { Clip, ExportSettings } from '~/types/project'

export interface VideoComposition {
  clips: Clip[]
  outputPath: string
  settings: ExportSettings
}

export interface ClipProcessingInfo {
  inputFile: string
  startTime: number
  duration: number
  trimStart?: number
  trimEnd?: number
}

/**
 * Generate FFmpeg command for concatenating multiple clips
 */
export function generateConcatCommand(clips: ClipProcessingInfo[], outputFile: string): string[] {
  const command: string[] = []
  
  // Create filter complex for concatenation
  let filterInputs = ''
  let filterConcat = ''
  
  clips.forEach((clip, index) => {
    // Add input file
    command.push('-i', clip.inputFile)
    
    // Build filter inputs
    filterInputs += `[${index}:v][${index}:a]`
    
    // Add trim filter if needed
    if (clip.trimStart !== undefined || clip.trimEnd !== undefined) {
      const start = clip.trimStart || 0
      const end = clip.trimEnd || clip.duration
      command.push(`-filter_complex`, `[${index}:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${index}];[${index}:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${index}]`)
    }
  })
  
  // Add concat filter
  filterConcat = `${filterInputs}concat=n=${clips.length}:v=1:a=1[outv][outa]`
  
  command.push('-filter_complex', filterConcat)
  command.push('-map', '[outv]')
  command.push('-map', '[outa]')
  command.push(outputFile)
  
  return command
}

/**
 * Generate FFmpeg command for PiP overlay with shape mask
 */
export function generatePipOverlayCommand(
  backgroundVideo: string,
  pipVideo: string,
  maskFile: string,
  outputFile: string,
  pipConfig: {
    x: number
    y: number
    width: number
    height: number
    borderWidth?: number
    borderColor?: string
  }
): string[] {
  const { x, y, width, height, borderWidth, borderColor } = pipConfig
  
  return [
    '-i', backgroundVideo,
    '-i', pipVideo,
    '-i', maskFile,
    '-filter_complex', [
      // Scale PiP video to desired size
      `[1:v]scale=${width}:${height}[pip_scaled]`,
      
      // Apply mask to PiP video
      `[pip_scaled][2:v]alphamerge[masked_pip]`,
      
      // Overlay PiP onto background
      `[0:v][masked_pip]overlay=${x}:${y}`,
      
      // Add border if specified
      borderWidth && borderColor 
        ? `[0:v][masked_pip]overlay=${x}:${y}:format=auto:shortest=1:format=auto[overlaid];[overlaid]drawbox=x=${x}:y=${y}:w=${width}:h=${height}:color=${borderColor}:t=${borderWidth}[final]`
        : `[0:v][masked_pip]overlay=${x}:${y}[final]`
    ].join(';'),
    '-map', '[final]',
    '-map', '0:a', // Use audio from background video
    outputFile
  ]
}

/**
 * Generate FFmpeg command for video encoding with quality presets
 */
export function generateEncodingCommand(
  inputFile: string,
  outputFile: string,
  settings: ExportSettings
): string[] {
  const { resolution, quality, format, preset = 'medium' } = settings
  
  const command: string[] = ['-i', inputFile]
  
  // Video codec and quality settings
  switch (format) {
    case 'mp4':
      command.push('-c:v', 'libx264')
      command.push('-preset', preset)
      break
    case 'webm':
      command.push('-c:v', 'libvpx-vp9')
      break
    case 'mov':
      command.push('-c:v', 'libx264')
      command.push('-preset', preset)
      break
  }
  
  // Resolution
  const resolutionMap: Record<string, string> = {
    '1080p': '1920x1080',
    '720p': '1280x720',
    '480p': '854x480',
    '360p': '640x360'
  }
  
  if (resolutionMap[resolution]) {
    command.push('-s', resolutionMap[resolution])
  }
  
  // Bitrate based on quality
  const bitrateMap: Record<string, string> = {
    'high': '8000k',
    'medium': '4000k',
    'low': '2000k'
  }
  
  if (bitrateMap[quality]) {
    command.push('-b:v', bitrateMap[quality])
  }
  
  // Audio codec
  command.push('-c:a', 'aac')
  command.push('-b:a', '128k')
  
  // Output file
  command.push(outputFile)
  
  return command
}

/**
 * Generate FFmpeg command for creating shape mask from SVG
 */
export function generateMaskCommand(
  svgFile: string,
  outputFile: string,
  width: number,
  height: number
): string[] {
  return [
    '-i', svgFile,
    '-vf', `scale=${width}:${height}`,
    '-c:v', 'png',
    '-pix_fmt', 'rgba',
    outputFile
  ]
}

/**
 * Generate FFmpeg command for extracting audio
 */
export function generateAudioExtractCommand(
  inputFile: string,
  outputFile: string,
  startTime?: number,
  duration?: number
): string[] {
  const command: string[] = ['-i', inputFile]
  
  if (startTime !== undefined) {
    command.push('-ss', startTime.toString())
  }
  
  if (duration !== undefined) {
    command.push('-t', duration.toString())
  }
  
  command.push('-vn') // No video
  command.push('-c:a', 'aac')
  command.push(outputFile)
  
  return command
}

/**
 * Generate FFmpeg command for mixing multiple audio tracks
 */
export function generateAudioMixCommand(
  audioFiles: string[],
  outputFile: string
): string[] {
  const command: string[] = []
  
  // Add all input files
  audioFiles.forEach(file => {
    command.push('-i', file)
  })
  
  // Create filter for mixing
  const filterInputs = audioFiles.map((_, index) => `[${index}:a]`).join('')
  const filterComplex = `${filterInputs}amix=inputs=${audioFiles.length}[outa]`
  
  command.push('-filter_complex', filterComplex)
  command.push('-map', '[outa]')
  command.push('-c:a', 'aac')
  command.push(outputFile)
  
  return command
}

/**
 * Generate FFmpeg command for video trimming
 */
export function generateTrimCommand(
  inputFile: string,
  outputFile: string,
  startTime: number,
  endTime: number
): string[] {
  return [
    '-i', inputFile,
    '-ss', startTime.toString(),
    '-to', endTime.toString(),
    '-c', 'copy', // Copy without re-encoding for speed
    outputFile
  ]
}

/**
 * Generate FFmpeg command for video speed adjustment
 */
export function generateSpeedCommand(
  inputFile: string,
  outputFile: string,
  speed: number
): string[] {
  return [
    '-i', inputFile,
    '-filter:v', `setpts=${1/speed}*PTS`,
    '-filter:a', `atempo=${speed}`,
    outputFile
  ]
}

/**
 * Generate FFmpeg command for adding text overlay
 */
export function generateTextOverlayCommand(
  inputFile: string,
  outputFile: string,
  text: string,
  x: number,
  y: number,
  fontSize: number = 24,
  fontColor: string = 'white'
): string[] {
  return [
    '-i', inputFile,
    '-vf', `drawtext=text='${text}':x=${x}:y=${y}:fontsize=${fontSize}:fontcolor=${fontColor}`,
    outputFile
  ]
}

/**
 * Generate FFmpeg command for video rotation
 */
export function generateRotateCommand(
  inputFile: string,
  outputFile: string,
  angle: number
): string[] {
  return [
    '-i', inputFile,
    '-vf', `rotate=${angle * Math.PI / 180}`,
    outputFile
  ]
}

/**
 * Generate FFmpeg command for video flip
 */
export function generateFlipCommand(
  inputFile: string,
  outputFile: string,
  horizontal: boolean = false,
  vertical: boolean = false
): string[] {
  const filters: string[] = []
  
  if (horizontal) filters.push('hflip')
  if (vertical) filters.push('vflip')
  
  if (filters.length === 0) {
    throw new Error('At least one flip direction must be specified')
  }
  
  return [
    '-i', inputFile,
    '-vf', filters.join(','),
    outputFile
  ]
}

/**
 * Generate FFmpeg command for video fade effects
 */
export function generateFadeCommand(
  inputFile: string,
  outputFile: string,
  fadeIn: number = 0,
  fadeOut: number = 0
): string[] {
  const filters: string[] = []
  
  if (fadeIn > 0) {
    filters.push(`fade=t=in:st=0:d=${fadeIn}`)
  }
  
  if (fadeOut > 0) {
    filters.push(`fade=t=out:st=${fadeOut}:d=${fadeOut}`)
  }
  
  if (filters.length === 0) {
    throw new Error('At least one fade effect must be specified')
  }
  
  return [
    '-i', inputFile,
    '-vf', filters.join(','),
    outputFile
  ]
}

/**
 * Validate FFmpeg command before execution
 */
export function validateCommand(command: string[]): { valid: boolean; error?: string } {
  if (!command || command.length === 0) {
    return { valid: false, error: 'Command is empty' }
  }
  
  // Check for required input files
  const hasInput = command.includes('-i')
  if (!hasInput) {
    return { valid: false, error: 'No input files specified' }
  }
  
  // Check for output file (should be the last argument)
  const lastArg = command[command.length - 1]
  if (!lastArg || lastArg.startsWith('-')) {
    return { valid: false, error: 'No output file specified' }
  }
  
  return { valid: true }
}

/**
 * Estimate processing time for FFmpeg command
 */
export function estimateProcessingTime(
  command: string[],
  inputDuration: number,
  complexity: 'low' | 'medium' | 'high' = 'medium'
): number {
  const complexityMultiplier = {
    low: 0.5,
    medium: 1.0,
    high: 2.0
  }
  
  // Base processing time is input duration
  let estimatedTime = inputDuration
  
  // Adjust based on complexity
  estimatedTime *= complexityMultiplier[complexity]
  
  // Adjust based on operations
  if (command.includes('-filter_complex')) {
    estimatedTime *= 1.5 // Complex filters take longer
  }
  
  if (command.includes('concat')) {
    estimatedTime *= 1.2 // Concatenation adds overhead
  }
  
  if (command.includes('overlay')) {
    estimatedTime *= 1.3 // Overlay operations are complex
  }
  
  return Math.ceil(estimatedTime)
}
