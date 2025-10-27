import type { Clip } from '~/types/project'

export const reorderClips = (clips: Clip[], fromIndex: number, toIndex: number): Clip[] => {
	const result = [...clips]
	const [removed] = result.splice(fromIndex, 1)
	result.splice(toIndex, 0, removed)
	return result
}

export const moveClipBetweenTracks = (
	clip: Clip,
	fromTrack: number,
	toTrack: number,
	allClips: Clip[]
): Clip[] => {
	// Remove from old track, add to new track
	const updatedClips = allClips
		.filter(c => c.id !== clip.id)
		.map(c => ({
			...c,
			metadata: { ...c.metadata, order: undefined }
		}))

	const updatedClip = { ...clip, track: toTrack }
	return [...updatedClips, updatedClip]
}

export const snapToGrid = (time: number, gridSize: number = 1): number => {
	return Math.round(time / gridSize) * gridSize
}

export const mergeClips = (clip1: Clip, clip2: Clip): Clip | null => {
	// Check if clips are adjacent and on same track
	if (clip1.track !== clip2.track) return null

	const clip1End = clip1.end_time || clip1.start_time + clip1.duration
	const clip2Start = clip2.start_time

	// Check if clips are adjacent
	if (Math.abs(clip1End - clip2Start) > 0.1) return null

	return {
		...clip1,
		end_time: clip2.end_time || clip2.start_time + clip2.duration,
		duration: (clip2.end_time || clip2.start_time + clip2.duration) - clip1.start_time
	}
}

export const calculateClipDuration = (clip: Clip): number => {
	return (clip.end_time || clip.duration) - clip.start_time
}

export const getClipBounds = (clip: Clip): { start: number; end: number } => {
	return {
		start: clip.start_time,
		end: clip.end_time || clip.start_time + clip.duration
	}
}

