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
   * Convert Vue Clip objects to Tauri VideoClip format
   */
  const convertClipsToTauriFormat = async (clips: Clip[]): Promise<VideoClip[]> => {
    console.log('🔄 Converting clips to Tauri format:', clips)
    
    const convertedClips = await Promise.all(clips.map(async (clip, index) => {
      console.log(`📹 Clip ${index}:`, {
        src: clip.src,
        pip_config: clip.pip_config,
        metadata: clip.metadata
      })
      
      // Handle blob URLs by converting them to temporary files
      let clipPath = clip.src
      if (clip.src.startsWith('blob:')) {
        console.log(`🔄 Converting blob URL to temp file for clip ${index}`)
        clipPath = await convertBlobToTempFile(clip.src)
        console.log(`✅ Converted blob to temp file: ${clipPath}`)
      }
      
      return {
        path: clipPath,
        start_time: clip.start_time || 0,
        duration: clip.duration,
        clip_type: clip.metadata?.type || 'screen',
        pip_config: clip.pip_config && clip.pip_config.position ? {
          x: clip.pip_config.position.x,
          y: clip.pip_config.position.y,
          width: clip.pip_config.shape_params?.width || 0.2,
          height: clip.pip_config.shape_params?.height || 0.2,
          shape: clip.pip_config.shape_type || 'rectangle'
        } : undefined
      }
    }))
    
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
      // Check native export availability first
      const nativeAvailable = await checkNativeExportAvailability()
      if (!nativeAvailable) {
        throw new Error('Native video export is not available on this platform.')
      }

      // Convert clips to Tauri format
      const tauriClips = await convertClipsToTauriFormat(clips)
      
      // Debug: Log the converted clips
      console.log('🔄 Converted clips for export:', JSON.stringify(tauriClips, null, 2))
      
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
      
      console.log('✅ Native video export completed successfully')
      return { success: true, outputPath: fileName }

    } catch (err: any) {
      console.error('❌ Native export failed:', err)
      error.value = err.message || 'Export failed'
      currentStep.value = 'Export failed'
      
      return { success: false, error: err.message }
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
