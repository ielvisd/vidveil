import { ref, computed } from 'vue'
import type { Clip } from '~/types/project'

export const useClipEditing = () => {
	const selectedClip = ref<Clip | null>(null)
	const trimmingStart = ref(false)
	const trimmingEnd = ref(false)

	const isTrimming = computed(() => trimmingStart.value || trimmingEnd.value)

	const startTrimmingStart = () => {
		trimmingStart.value = true
	}

	const startTrimmingEnd = () => {
		trimmingEnd.value = true
	}

	const stopTrimming = () => {
		trimmingStart.value = false
		trimmingEnd.value = false
	}

	const splitClip = (clip: Clip, splitTime: number): Clip[] => {
		if (splitTime <= clip.start_time || splitTime >= (clip.end_time || clip.duration)) {
			return [clip]
		}

		return [
			{
				...clip,
				end_time: splitTime,
				duration: splitTime - clip.start_time
			},
			{
				...clip,
				id: `${clip.id}-split-${Date.now()}`,
				start_time: splitTime,
				duration: (clip.end_time || clip.duration) - splitTime
			}
		]
	}

	const deleteClip = (clipId: string, clips: Clip[]): Clip[] => {
		return clips.filter(c => c.id !== clipId)
	}

	const duplicateClip = (clip: Clip): Clip => {
		return {
			...clip,
			id: `${clip.id}-copy-${Date.now()}`,
			metadata: {
				...clip.metadata,
				duplicated: true
			}
		}
	}

	const trimClip = (
		clip: Clip,
		newStart?: number,
		newEnd?: number
	): Clip => {
		const start = newStart !== undefined ? newStart : clip.start_time
		const end = newEnd !== undefined ? newEnd : (clip.end_time || clip.duration)

		return {
			...clip,
			start_time: start,
			end_time: end,
			duration: end - start
		}
	}

	return {
		selectedClip,
		trimmingStart,
		trimmingEnd,
		isTrimming,
		startTrimmingStart,
		startTrimmingEnd,
		stopTrimming,
		splitClip,
		deleteClip,
		duplicateClip,
		trimClip
	}
}

