export interface ExportPreset {
  id: string
  name: string
  description: string
  resolution: string
  quality: string
  format: string
  preset: string
  bitrate: string
  audioBitrate: string
  fps: number
  estimatedSize: string
  useCase: string
}

export const exportPresets: ExportPreset[] = [
  {
    id: 'web',
    name: 'Web (720p)',
    description: 'Optimized for web sharing and streaming',
    resolution: '720p',
    quality: 'medium',
    format: 'mp4',
    preset: 'fast',
    bitrate: '2000k',
    audioBitrate: '128k',
    fps: 30,
    estimatedSize: '~15MB/min',
    useCase: 'Social media, web sharing, quick previews'
  },
  {
    id: 'youtube',
    name: 'YouTube (1080p)',
    description: 'High quality for YouTube uploads',
    resolution: '1080p',
    quality: 'high',
    format: 'mp4',
    preset: 'medium',
    bitrate: '8000k',
    audioBitrate: '192k',
    fps: 30,
    estimatedSize: '~60MB/min',
    useCase: 'YouTube, Vimeo, professional content'
  },
  {
    id: 'high-quality',
    name: 'High Quality (1080p)',
    description: 'Maximum quality for archival',
    resolution: '1080p',
    quality: 'high',
    format: 'mp4',
    preset: 'slow',
    bitrate: '12000k',
    audioBitrate: '256k',
    fps: 30,
    estimatedSize: '~90MB/min',
    useCase: 'Archival, professional editing, broadcast'
  },
  {
    id: 'source',
    name: 'Source Quality',
    description: 'Maintain original resolution and quality',
    resolution: 'source',
    quality: 'high',
    format: 'mp4',
    preset: 'medium',
    bitrate: 'auto',
    audioBitrate: '256k',
    fps: 0, // Use source FPS
    estimatedSize: 'Variable',
    useCase: 'Preserve original quality, professional workflows'
  },
  {
    id: 'mobile',
    name: 'Mobile (480p)',
    description: 'Optimized for mobile devices',
    resolution: '480p',
    quality: 'low',
    format: 'mp4',
    preset: 'fast',
    bitrate: '1000k',
    audioBitrate: '96k',
    fps: 30,
    estimatedSize: '~8MB/min',
    useCase: 'Mobile sharing, low bandwidth, quick uploads'
  },
  {
    id: 'webm',
    name: 'WebM (720p)',
    description: 'Modern web format with VP9 codec',
    resolution: '720p',
    quality: 'medium',
    format: 'webm',
    preset: 'medium',
    bitrate: '2000k',
    audioBitrate: '128k',
    fps: 30,
    estimatedSize: '~12MB/min',
    useCase: 'Modern browsers, HTML5 video, web applications'
  },
  {
    id: 'gif',
    name: 'Animated GIF',
    description: 'Convert to animated GIF for web',
    resolution: '480p',
    quality: 'low',
    format: 'gif',
    preset: 'fast',
    bitrate: '500k',
    audioBitrate: '0k', // No audio for GIF
    fps: 15, // Lower FPS for GIF
    estimatedSize: '~5MB/min',
    useCase: 'Social media, forums, email attachments'
  },
  {
    id: 'podcast',
    name: 'Podcast (Audio Only)',
    description: 'Extract audio for podcasting',
    resolution: '0x0', // No video
    quality: 'high',
    format: 'mp3',
    preset: 'medium',
    bitrate: '0k', // No video bitrate
    audioBitrate: '192k',
    fps: 0, // No video FPS
    estimatedSize: '~1.5MB/min',
    useCase: 'Podcasts, audio-only content, voice recordings'
  }
]

/**
 * Get preset by ID
 */
export function getPresetById(id: string): ExportPreset | undefined {
  return exportPresets.find(preset => preset.id === id)
}

/**
 * Get preset by name
 */
export function getPresetByName(name: string): ExportPreset | undefined {
  return exportPresets.find(preset => preset.name === name)
}

/**
 * Get all presets for a specific format
 */
export function getPresetsByFormat(format: string): ExportPreset[] {
  return exportPresets.filter(preset => preset.format === format)
}

/**
 * Get all presets for a specific resolution
 */
export function getPresetsByResolution(resolution: string): ExportPreset[] {
  return exportPresets.filter(preset => preset.resolution === resolution)
}

/**
 * Get recommended preset based on use case
 */
export function getRecommendedPreset(useCase: string): ExportPreset | undefined {
  const useCaseMap: Record<string, string> = {
    'social-media': 'web',
    'youtube': 'youtube',
    'professional': 'high-quality',
    'mobile': 'mobile',
    'web': 'webm',
    'gif': 'gif',
    'podcast': 'podcast'
  }
  
  const presetId = useCaseMap[useCase.toLowerCase()]
  return presetId ? getPresetById(presetId) : undefined
}

/**
 * Calculate estimated file size based on duration and preset
 */
export function calculateEstimatedSize(durationSeconds: number, preset: ExportPreset): string {
  const durationMinutes = durationSeconds / 60
  
  // Parse bitrate (remove 'k' suffix and convert to bytes per second)
  const videoBitrate = preset.bitrate === 'auto' ? 0 : parseInt(preset.bitrate.replace('k', '')) * 1000
  const audioBitrate = parseInt(preset.audioBitrate.replace('k', '')) * 1000
  
  // Calculate size in bytes
  const totalBitrate = videoBitrate + audioBitrate
  const sizeBytes = totalBitrate * durationSeconds
  
  // Convert to human readable format
  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)}KB`
  } else if (sizeBytes < 1024 * 1024 * 1024) {
    return `${Math.round(sizeBytes / (1024 * 1024))}MB`
  } else {
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
  }
}

/**
 * Get FFmpeg command arguments for a preset
 */
export function getFFmpegArgs(preset: ExportPreset): string[] {
  const args: string[] = []
  
  // Video codec
  switch (preset.format) {
    case 'mp4':
      args.push('-c:v', 'libx264')
      break
    case 'webm':
      args.push('-c:v', 'libvpx-vp9')
      break
    case 'gif':
      args.push('-c:v', 'gif')
      break
    case 'mp3':
      args.push('-vn') // No video
      break
  }
  
  // Preset
  if (preset.preset && preset.format !== 'gif' && preset.format !== 'mp3') {
    args.push('-preset', preset.preset)
  }
  
  // Resolution
  if (preset.resolution !== 'source' && preset.resolution !== '0x0') {
    const resolutionMap: Record<string, string> = {
      '1080p': '1920x1080',
      '720p': '1280x720',
      '480p': '854x480',
      '360p': '640x360'
    }
    
    if (resolutionMap[preset.resolution]) {
      args.push('-s', resolutionMap[preset.resolution])
    }
  }
  
  // Bitrate
  if (preset.bitrate !== 'auto' && preset.bitrate !== '0k') {
    args.push('-b:v', preset.bitrate)
  }
  
  // Audio codec and bitrate
  if (preset.audioBitrate !== '0k') {
    args.push('-c:a', 'aac')
    args.push('-b:a', preset.audioBitrate)
  }
  
  // FPS
  if (preset.fps > 0) {
    args.push('-r', preset.fps.toString())
  }
  
  return args
}

/**
 * Validate preset configuration
 */
export function validatePreset(preset: ExportPreset): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!preset.id) {
    errors.push('Preset ID is required')
  }
  
  if (!preset.name) {
    errors.push('Preset name is required')
  }
  
  if (!preset.format) {
    errors.push('Format is required')
  }
  
  if (!preset.resolution && preset.format !== 'mp3') {
    errors.push('Resolution is required for video formats')
  }
  
  if (!preset.bitrate && preset.format !== 'mp3') {
    errors.push('Bitrate is required for video formats')
  }
  
  if (!preset.audioBitrate && preset.format !== 'gif') {
    errors.push('Audio bitrate is required for formats with audio')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get preset comparison data
 */
export function getPresetComparison(): Array<{
  preset: ExportPreset
  fileSize: string
  quality: string
  compatibility: string
}> {
  return exportPresets.map(preset => ({
    preset,
    fileSize: preset.estimatedSize,
    quality: preset.quality,
    compatibility: getCompatibilityInfo(preset.format)
  }))
}

/**
 * Get compatibility information for format
 */
function getCompatibilityInfo(format: string): string {
  const compatibility: Record<string, string> = {
    'mp4': 'Universal (iOS, Android, Web)',
    'webm': 'Modern browsers only',
    'gif': 'Universal (no audio)',
    'mp3': 'Universal audio format',
    'mov': 'macOS/QuickTime optimized'
  }
  
  return compatibility[format] || 'Limited compatibility'
}
