import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import type { Clip, ExportSettings } from '../../types/project'

export interface VideoClip {
  path: string
  start_time: number
  duration: number
  clip_type: string
  pip_config?: {
    x: number
    y: number
    width: number
    height: number
    shape: string
  }
}

export interface ExportProgress {
  progress: number
  current_step: string
  total_steps: number
  current_step_number: number
  output_path?: string
}

export const useNativeVideoExport = () => {
  const isExporting = ref(false)
  const exportProgress = ref(0)
  const error = ref<string | null>(null)
  const currentStep = ref('')
  const totalSteps = ref(0)
  const isNativeExportAvailable = ref(true) // Native export is always available on macOS

  /**
   * Check if native export is available (always true on macOS)
   */
  const checkNativeExportAvailability = async () => {
    try {
      const available = await invoke<boolean>('check_native_export_availability')
      isNativeExportAvailable.value = available
      return available
    } catch (err: any) {
      console.error('Failed to check native export availability:', err)
      isNativeExportAvailable.value = false
      return false
    }
  }

  /**
   * Get video information using native FFmpeg
   */
  const getVideoInfo = async (filePath: string) => {
    try {
      const info = await invoke<any>('get_video_info', { filePath })
      return info
    } catch (err: any) {
      console.error('Failed to get video info:', err)
      throw err
    }
  }

  /**
   * Convert blob URL to temporary file path
   */
  const convertBlobToTempFile = async (blobUrl: string): Promise<string> => {
    try {
      // Fetch the blob data
      const response = await fetch(blobUrl)
      const blob = await response.blob()
      
      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Generate a temporary file path
      const tempFileName = `temp_clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.mp4`
      const tempPath = `/tmp/${tempFileName}`
      
      // Save to temporary file using Tauri command
      await invoke('save_blob_to_temp_file', {
        data: Array.from(uint8Array),
        filePath: tempPath
      })
      
      return tempPath
    } catch (err) {
      console.error('Failed to convert blob to temp file:', err)
      throw new Error(`Failed to convert blob URL to temporary file: ${err}`)
    }
  }

  /**
   * Convert IndexedDB URL to temporary file path
   */
  const convertIndexedDBToTempFile = async (indexeddbUrl: string): Promise<string> => {
    try {
      const { getVideoFromIndexedDB } = await import('~/utils/indexedDB')
      
      // Extract clip ID from indexeddb:// URL
      const clipId = indexeddbUrl.replace('indexeddb://', '')
      console.log(`📦 Reading clip from IndexedDB: ${clipId}`)
      
      // Get blob from IndexedDB
      const blob = await getVideoFromIndexedDB(clipId)
      if (!blob) {
        throw new Error(`Clip not found in IndexedDB: ${clipId}`)
      }
      
      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Generate a temporary file path
      const tempFileName = `temp_clip_${clipId}_${Date.now()}.mp4`
      const tempPath = `/tmp/${tempFileName}`
      
      // Save to temporary file using Tauri command
      await invoke('save_blob_to_temp_file', {
        data: Array.from(uint8Array),
        filePath: tempPath
      })
      
      console.log(`✅ Converted IndexedDB clip to temp file: ${tempPath}`)
      return tempPath
    } catch (err) {
      console.error('Failed to convert IndexedDB URL to temp file:', err)
      throw new Error(`Failed to convert IndexedDB URL to temporary file: ${err}`)
    }
  }

  /**
   * Convert Vue Clip objects to Tauri VideoClip format
   */
  const convertClipsToTauriFormat = async (clips: Clip[]): Promise<VideoClip[]> => {
    console.log('🔄 Converting clips to Tauri format:', clips)
    
    if (!clips || clips.length === 0) {
      throw new Error('No clips provided for export')
    }
    
    // Validate and determine clip types with better detection
    const clipsWithTypes = clips.map((clip, index) => {
      // Determine clip type with multiple fallback methods
      let clipType = clip.metadata?.type
      
      if (!clipType) {
        // Fallback 1: Check name for keywords
        const name = (clip.name || '').toLowerCase()
        if (name.includes('webcam') || name.includes('camera')) {
          clipType = 'webcam'
        } else if (name.includes('screen') || name.includes('recording')) {
          clipType = 'screen'
        }
        // Fallback 2: Check track number (webcam = track 2, screen = track 1)
        else if (clip.track === 2) {
          clipType = 'webcam'
        } else if (clip.track === 1) {
          clipType = 'screen'
        }
        // Fallback 3: If still unknown, check if this looks like it could be webcam based on duration/size
        else {
          // Default to screen only if we can't determine - but log warning
          console.warn(`⚠️ Clip ${index} has no explicit type, defaulting to 'screen'`, {
            name: clip.name,
            track: clip.track,
            metadata: clip.metadata
          })
          clipType = 'screen'
        }
      }
      
      return {
        ...clip,
        _determinedType: clipType
      }
    })
    
    // Validate that we have at least one screen clip
    const hasScreenClip = clipsWithTypes.some(c => c._determinedType === 'screen')
    if (!hasScreenClip) {
      console.error('❌ No screen recording found in clips:', clipsWithTypes.map(c => ({
        name: c.name,
        type: c._determinedType,
        track: c.track
      })))
      throw new Error('No screen recording found. At least one screen recording is required for export.')
    }
    
    // Log clip type summary
    const screenClips = clipsWithTypes.filter(c => c._determinedType === 'screen')
    const webcamClips = clipsWithTypes.filter(c => c._determinedType === 'webcam')
    console.log(`📊 Clip summary: ${screenClips.length} screen clip(s), ${webcamClips.length} webcam clip(s)`)
    
    const convertedClips = await Promise.all(clipsWithTypes.map(async (clip, index) => {
      const clipType = clip._determinedType!
      
      console.log(`📹 Clip ${index} [${clipType}]:`, {
        name: clip.name,
        src: clip.src?.substring(0, 50) + '...',
        track: clip.track,
        duration: clip.duration,
        pip_config: clip.pip_config,
        metadata: clip.metadata
      })
      
      // Handle different URL types by converting them to temporary files
      let clipPath = clip.src
      if (clip.src.startsWith('blob:')) {
        console.log(`🔄 Converting blob URL to temp file for clip ${index} [${clipType}]`)
        clipPath = await convertBlobToTempFile(clip.src)
        console.log(`✅ Converted blob to temp file: ${clipPath}`)
      } else if (clip.src.startsWith('indexeddb://')) {
        console.log(`🔄 Converting IndexedDB URL to temp file for clip ${index} [${clipType}]`)
        clipPath = await convertIndexedDBToTempFile(clip.src)
        console.log(`✅ Converted IndexedDB to temp file: ${clipPath}`)
      } else if (clip.src.startsWith('http://') || clip.src.startsWith('https://')) {
        // Handle Supabase or other HTTP URLs
        console.log(`🔄 Converting HTTP URL to temp file for clip ${index} [${clipType}]`)
        clipPath = await convertBlobToTempFile(clip.src)
        console.log(`✅ Converted HTTP URL to temp file: ${clipPath}`)
      } else if (clip.src.startsWith('/tmp/') || clip.src.startsWith('/')) {
        // Already a file path, validate it exists
        console.log(`📁 Clip ${index} [${clipType}] uses file path: ${clipPath}`)
      } else {
        console.warn(`⚠️ Clip ${index} [${clipType}] has unexpected src format: ${clip.src}`)
      }
      
      return {
        path: clipPath,
        start_time: clip.start_time || 0,
        duration: clip.duration,
        clip_type: clipType,
        pip_config: clip.pip_config && clip.pip_config.position ? {
          x: clip.pip_config.position.x,
          y: clip.pip_config.position.y,
          width: clip.pip_config.shape_params?.width || 0.2,
          height: clip.pip_config.shape_params?.height || 0.2,
          shape: clip.pip_config.shape_type || 'rectangle'
        } : undefined
      }
    }))
    
    console.log('✅ Converted clips summary:', convertedClips.map(c => ({
      type: c.clip_type,
      path: c.path.substring(0, 50) + '...',
      duration: c.duration
    })))
    
    return convertedClips
  }

  /**
   * Export video using native Tauri commands
   */
  const exportVideo = async (
    clips: Clip[],
    fileName: string,
    settings: {
      resolution: string
      quality: string
      format: string
      preset: string
    }
  ) => {
    isExporting.value = true
    exportProgress.value = 0
    error.value = null
    currentStep.value = 'Preparing export...'
    totalSteps.value = 1

    try {
      // Validate input
      if (!clips || clips.length === 0) {
        throw new Error('No clips provided for export')
      }
      
      console.log(`🎬 Starting export with ${clips.length} clip(s)`)
      
      // Check native export availability first
      const nativeAvailable = await checkNativeExportAvailability()
      if (!nativeAvailable) {
        throw new Error('Native video export is not available on this platform.')
      }

      // Convert clips to Tauri format (includes validation)
      currentStep.value = 'Validating clips...'
      const tauriClips = await convertClipsToTauriFormat(clips)
      
      // Debug: Log the converted clips
      console.log('🔄 Converted clips for export:', JSON.stringify(tauriClips.map(c => ({
        type: c.clip_type,
        path: c.path.substring(0, 60) + '...',
        duration: c.duration,
        start_time: c.start_time
      })), null, 2))
      
      // Final validation: Ensure we have a screen clip
      const hasScreen = tauriClips.some(c => c.clip_type === 'screen')
      if (!hasScreen) {
        throw new Error('No screen recording found in clips. Export requires at least one screen recording.')
      }
      
      // Prepare export settings
      const exportSettings: ExportSettings = {
        resolution: settings.resolution,
        quality: settings.quality,
        format: settings.format,
        preset: settings.preset
      }

      currentStep.value = 'Processing video...'
      exportProgress.value = 50

      // Call native Tauri command
      const result = await invoke<ExportProgress>('export_video_native', {
        clips: tauriClips,
        outputPath: fileName,
        settings: exportSettings
      })

      exportProgress.value = 100
      currentStep.value = 'Export complete!'
      
      const outputPath = result.output_path || fileName
      console.log('✅ Native video export completed successfully:', outputPath)
      return { success: true, outputPath }

    } catch (err: any) {
      console.error('❌ Native export failed:', err)
      
      // Parse error message to provide user-friendly feedback
      let userMessage = err.message || 'Export failed'
      
      // Handle specific AVFoundation errors
      if (err.message && err.message.includes('AVFoundationErrorDomain')) {
        if (err.message.includes('-11823') || err.message.includes('already in use')) {
          userMessage = 'The file name is already in use. ClipForge will automatically use a unique filename. Please try exporting again.'
        } else if (err.message.includes('Domain') && err.message.includes('Code')) {
          // Extract just the main error description if available
          const descriptionMatch = err.message.match(/^(.*?)\s*\(Domain:/)
          if (descriptionMatch && descriptionMatch[1]) {
            userMessage = descriptionMatch[1].trim()
          }
        }
      } else if (err.message && err.message.includes('Output directory')) {
        userMessage = 'Cannot save to the selected location. Please check folder permissions or choose a different location.'
      } else if (err.message && err.message.includes('not writable')) {
        userMessage = 'Cannot write to Downloads folder. Please check folder permissions or choose a different location.'
      }
      
      error.value = userMessage
      currentStep.value = 'Export failed'
      
      return { success: false, error: userMessage }
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Cancel ongoing export
   */
  const cancelExport = async () => {
    if (isExporting.value) {
      isExporting.value = false
      currentStep.value = 'Export cancelled'
      exportProgress.value = 0
      error.value = null
    }
  }

  /**
   * Get export progress details
   */
  const getProgressDetails = () => {
    return {
      progress: exportProgress.value,
      step: currentStep.value,
      totalSteps: totalSteps.value,
      currentStepNumber: Math.ceil((exportProgress.value / 100) * totalSteps.value)
    }
  }

  /**
   * Get formatted time remaining (placeholder)
   */
  const getFormattedTime = computed(() => {
    if (!isExporting.value) return '0:00'
    const seconds = Math.ceil((100 - exportProgress.value) / 100 * 60)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  })

  /**
   * Get processing speed (placeholder)
   */
  const getProcessingSpeed = computed(() => {
    if (!isExporting.value) return '0x'
    return '2.5x' // Native processing is typically faster
  })

  /**
   * Get native export status message
   */
  const getNativeExportStatus = () => {
    return {
      title: 'Native Video Export',
      message: 'ClipForge uses native macOS AVFoundation for video export - no additional software required!',
      available: isNativeExportAvailable.value
    }
  }

  /**
   * Check FFmpeg availability (for compatibility with old interface)
   */
  const isFFmpegAvailable = computed(() => isNativeExportAvailable.value)
  
  const checkFFmpegAvailability = async () => {
    return await checkNativeExportAvailability()
  }

  const getFFmpegInstallInstructions = () => {
    return {
      instructions: [
        'FFmpeg is not required for ClipForge!',
        'ClipForge uses native macOS AVFoundation for video processing.',
        'No additional software installation needed.'
      ]
    }
  }

  return {
    // State
    isExporting,
    exportProgress,
    error,
    currentStep,
    totalSteps,
    isNativeExportAvailable,
    
    // Methods
    checkNativeExportAvailability,
    getVideoInfo,
    exportVideo,
    cancelExport,
    getProgressDetails,
    getFormattedTime,
    getProcessingSpeed,
    getNativeExportStatus,
    
    // Compatibility methods
    isFFmpegAvailable,
    checkFFmpegAvailability,
    getFFmpegInstallInstructions
  }
}
