import { ref } from 'vue'
import type { Clip } from '../../types/project'

export interface ClipPosition {
  clipId: string
  startTime: number
  endTime: number
  duration: number
}

export const useClipArrangement = () => {
  const SNAP_THRESHOLD = 10 // pixels
  
  // Calculate clip positions with automatic snapping
  const calculateClipPositions = (clips: Clip[]): ClipPosition[] => {
    const positions: ClipPosition[] = []
    let currentTime = 0
    
    for (const clip of clips) {
      positions.push({
        clipId: clip.id,
        startTime: currentTime,
        endTime: currentTime + clip.duration,
        duration: clip.duration
      })
      currentTime += clip.duration // No gaps - seamless stitching
    }
    
    return positions
  }
  
  // Update clips with new timeline positions
  const updateClipTimeline = async (orderedClips: Clip[]) => {
    const positions = calculateClipPositions(orderedClips)
    const { updateClip } = useClips()
    
    for (let i = 0; i < orderedClips.length; i++) {
      const clip = orderedClips[i]
      const position = positions[i]
      
      if (position) {
        await updateClip(clip.id, {
          start_time: position.startTime,
          end_time: position.endTime,
          metadata: {
            ...clip.metadata,
            order: i
          }
        })
      }
    }
  }
  
  return {
    calculateClipPositions,
    updateClipTimeline
  }
}
