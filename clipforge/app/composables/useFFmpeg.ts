import { ref, computed } from 'vue'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

export interface FFmpegProgress {
  progress: number
  time: number
  speed: string
}

export interface ExportSettings {
  resolution: string
  quality: string
  format: string
  preset?: string
}

export const useFFmpeg = () => {
  const ffmpeg = ref<FFmpeg | null>(null)
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const progress = ref<FFmpegProgress>({ progress: 0, time: 0, speed: '0x' })

  const isReady = computed(() => isLoaded.value && ffmpeg.value !== null)

  /**
   * Initialize FFmpeg WASM with multiple fallback strategies
   */
  const loadFFmpeg = async () => {
    if (isLoaded.value) return

    isLoading.value = true
    error.value = null

    const strategies = [
      // Strategy 1: Local files
      async () => {
        console.log('🔄 Loading FFmpeg from local files...')
        const baseURL = '/ffmpeg'
        return {
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        }
      },
      // Strategy 2: CDN with compatible version
      async () => {
        console.log('🔄 Loading FFmpeg from CDN (v0.12.2)...')
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/esm'
        return {
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        }
      }
    ]

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔄 Trying FFmpeg loading strategy ${i + 1}...`)
        
        // Create fresh FFmpeg instance
        ffmpeg.value = new FFmpeg()
        
        // Get URLs for this strategy
        const urls = await strategies[i]()
        
        // Load FFmpeg with minimal configuration
        await ffmpeg.value.load(urls)

        // Set up event handlers AFTER successful loading
        try {
          ffmpeg.value.on('progress', ({ progress: p, time }) => {
            progress.value = {
              progress: Math.round(p * 100),
              time,
              speed: '1x'
            }
            console.log(`FFmpeg progress: ${progress.value.progress}%`)
          })

          ffmpeg.value.on('log', ({ message }) => {
            console.log('FFmpeg:', message)
          })
        } catch (eventError) {
          console.warn('⚠️ Could not set up FFmpeg event handlers:', eventError)
          // Continue without event handlers - FFmpeg will still work
        }

        isLoaded.value = true
        console.log(`✅ FFmpeg loaded successfully with strategy ${i + 1}`)
        return

      } catch (err: any) {
        console.warn(`⚠️ Strategy ${i + 1} failed:`, err.message)
        
        // Reset state for next attempt
        ffmpeg.value = null
        isLoaded.value = false
        
        // If this was the last strategy, throw the error
        if (i === strategies.length - 1) {
          throw err
        }
      }
    }
  }

  /**
   * Ensure FFmpeg is loaded before operations
   */
  const ensureLoaded = async () => {
    if (!isLoaded.value) {
      await loadFFmpeg()
    }
    if (!ffmpeg.value) {
      throw new Error('FFmpeg not loaded')
    }
  }

  /**
   * Write file to FFmpeg virtual filesystem
   */
  const writeFile = async (filename: string, data: File | Blob | ArrayBuffer | Uint8Array) => {
    await ensureLoaded()
    
    try {
      let fileData: Uint8Array;
      
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        // Convert to Blob for fetchFile
        const blob = new Blob([data]);
        fileData = await fetchFile(blob) as Uint8Array;
      } else {
        // File or Blob
        fileData = await fetchFile(data) as Uint8Array;
      }
      
      await ffmpeg.value!.writeFile(filename, fileData);
    } catch (err: any) {
      console.error(`Failed to write file ${filename}:`, err)
      throw err
    }
  }

  /**
   * Read file from FFmpeg virtual filesystem
   */
  const readFile = async (filename: string): Promise<Uint8Array> => {
    await ensureLoaded()
    
    try {
      return await ffmpeg.value!.readFile(filename)
    } catch (err: any) {
      console.error(`Failed to read file ${filename}:`, err)
      throw err
    }
  }

  /**
   * Execute FFmpeg command
   */
  const exec = async (args: string[]): Promise<void> => {
    await ensureLoaded()
    
    try {
      console.log('Executing FFmpeg command:', args.join(' '))
      await ffmpeg.value!.exec(args)
    } catch (err: any) {
      console.error('FFmpeg execution failed:', err)
      throw err
    }
  }

  /**
   * Delete file from FFmpeg virtual filesystem
   */
  const deleteFile = async (filename: string): Promise<void> => {
    await ensureLoaded()
    
    try {
      await ffmpeg.value!.deleteFile(filename)
    } catch (err: any) {
      console.error(`Failed to delete file ${filename}:`, err)
      throw err
    }
  }

  /**
   * List files in FFmpeg virtual filesystem
   */
  const listDir = async (path: string = '/'): Promise<any[]> => {
    await ensureLoaded()
    
    try {
      return await ffmpeg.value!.listDir(path)
    } catch (err: any) {
      console.error(`Failed to list directory ${path}:`, err)
      throw err
    }
  }

  /**
   * Create a blob URL from file data
   */
  const createBlobURL = async (filename: string, mimeType: string = 'video/mp4'): Promise<string> => {
    const data = await readFile(filename) as Uint8Array;
    const blob = new Blob([data.buffer as ArrayBuffer], { type: mimeType })
    return URL.createObjectURL(blob)
  }

  /**
   * Download file as blob
   */
  const downloadFile = async (filename: string, mimeType: string = 'video/mp4'): Promise<Blob> => {
    const data = await readFile(filename) as Uint8Array;
    return new Blob([data.buffer as ArrayBuffer], { type: mimeType })
  }

  /**
   * Get FFmpeg version info
   */
  const getVersion = async (): Promise<string> => {
    await ensureLoaded()
    
    try {
      // Execute version command and capture output
      const originalLog = ffmpeg.value!.on
      let versionOutput = ''
      
      ffmpeg.value!.on('log', ({ message }) => {
        if (message.includes('ffmpeg version')) {
          versionOutput = message
        }
      })
      
      await ffmpeg.value!.exec(['-version'])
      
      // Restore original log handler
      ffmpeg.value!.on = originalLog
      
      return versionOutput || 'FFmpeg version unknown'
    } catch (err: any) {
      console.error('Failed to get FFmpeg version:', err)
      return 'FFmpeg version unknown'
    }
  }

  /**
   * Check if FFmpeg supports a specific codec
   */
  const supportsCodec = async (codec: string): Promise<boolean> => {
    await ensureLoaded()
    
    try {
      await ffmpeg.value!.exec(['-codecs'])
      // In a real implementation, you'd parse the codecs output
      // For now, return true for common codecs
      const supportedCodecs = ['h264', 'h265', 'vp8', 'vp9', 'aac', 'mp3', 'opus']
      return supportedCodecs.includes(codec.toLowerCase())
    } catch (err: any) {
      console.error(`Failed to check codec support for ${codec}:`, err)
      return false
    }
  }

  /**
   * Clean up FFmpeg resources
   */
  const cleanup = async () => {
    if (ffmpeg.value) {
      try {
        // Clear all files from virtual filesystem
        const files = await listDir()
        for (const file of files) {
          await deleteFile(file)
        }
        
        // Terminate FFmpeg
        ffmpeg.value.terminate()
        ffmpeg.value = null
        isLoaded.value = false
        
        console.log('✅ FFmpeg cleaned up')
      } catch (err: any) {
        console.error('Error during FFmpeg cleanup:', err)
      }
    }
  }

  /**
   * Reset progress tracking
   */
  const resetProgress = () => {
    progress.value = { progress: 0, time: 0, speed: '0x' }
  }

  /**
   * Get current progress percentage
   */
  const getProgressPercentage = computed(() => progress.value.progress)

  /**
   * Get formatted time string
   */
  const getFormattedTime = computed(() => {
    const time = progress.value.time
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  })

  /**
   * Get processing speed
   */
  const getProcessingSpeed = computed(() => progress.value.speed)

  return {
    // State
    ffmpeg,
    isLoaded,
    isLoading,
    isReady,
    error,
    progress,
    
    // Computed
    getProgressPercentage,
    getFormattedTime,
    getProcessingSpeed,
    
    // Methods
    loadFFmpeg,
    ensureLoaded,
    writeFile,
    readFile,
    exec,
    deleteFile,
    listDir,
    createBlobURL,
    downloadFile,
    getVersion,
    supportsCodec,
    cleanup,
    resetProgress
  }
}
