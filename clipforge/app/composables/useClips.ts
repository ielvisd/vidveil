import { ref, computed } from 'vue'
import type { Clip } from '~/types/project'

// Global state to persist clips across components
const globalClips = ref<Clip[]>([])

export const useClips = () => {
	const clips = globalClips
	const selectedClip = ref<Clip | null>(null)
	const loading = ref(false)

	const clipsCount = computed(() => clips.value.length)
	const hasClips = computed(() => clips.value.length > 0)

	const addClip = async (
		projectId: string,
		src: string,
		metadata: Record<string, any> = {}
	) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()
			const { user } = useAuth()

			if (!user.value) throw new Error('Not authenticated')

			// Upload blob to Supabase Storage if it's a blob URL
			let fileUrl = src
			if (src.startsWith('blob:')) {
				const blob = await fetch(src).then(r => r.blob())
				const fileName = `${projectId}/${Date.now()}-${metadata.name || 'clip'}.webm`
				
				const { data: uploadData, error: uploadError } = await supabase
					.storage
					.from('clips')
					.upload(fileName, blob, {
						contentType: blob.type,
						upsert: false
					})

				if (uploadError) throw uploadError

				// Get public URL
				const { data: urlData } = supabase
					.storage
					.from('clips')
					.getPublicUrl(fileName)

				fileUrl = urlData.publicUrl
			}

			const clipData = {
				project_id: projectId,
				name: metadata.name || 'Untitled Clip',
				src: fileUrl,
				duration: metadata.duration || 0,
				start_time: 0,
				end_time: metadata.duration || 0,
				track: 1,
				metadata
			}

			const { data, error } = await supabase
				.from('clips')
				.insert(clipData)
				.select()
				.single()

			if (error) throw error

			clips.value.push(data)

			return { clip: data, error: null }
		} catch (error: any) {
			return { clip: null, error: error.message }
		} finally {
			loading.value = false
		}
	}

	const updateClip = async (clipId: string, updates: Partial<Clip>) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()

			const { data, error } = await supabase
				.from('clips')
				.update(updates)
				.eq('id', clipId)
				.select()
				.single()

			if (error) throw error

			const index = clips.value.findIndex(c => c.id === clipId)
			if (index !== -1) {
				clips.value[index] = data
			}

			return { clip: data, error: null }
		} catch (error: any) {
			return { clip: null, error: error.message }
		} finally {
			loading.value = false
		}
	}

	const deleteClip = async (clipId: string) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()

			const { error } = await supabase
				.from('clips')
				.delete()
				.eq('id', clipId)

			if (error) throw error

			clips.value = clips.value.filter(c => c.id !== clipId)

			if (selectedClip.value?.id === clipId) {
				selectedClip.value = null
			}

			return { error: null }
		} catch (error: any) {
			return { error: error.message }
		} finally {
			loading.value = false
		}
	}

	const reorderClips = async (newOrder: Clip[]) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()

			for (const [index, clip] of newOrder.entries()) {
				await supabase
					.from('clips')
					.update({ metadata: { ...clip.metadata, order: index } })
					.eq('id', clip.id)
			}

			clips.value = newOrder

			return { error: null }
		} catch (error: any) {
			return { error: error.message }
		} finally {
			loading.value = false
		}
	}

	const fetchClips = async (projectId: string) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()

			const { data, error } = await supabase
				.from('clips')
				.select('*')
				.eq('project_id', projectId)
				.order('created_at', { ascending: true })

			if (error) throw error

			clips.value = data || []

			return { clips: data, error: null }
		} catch (error: any) {
			return { clips: [], error: error.message }
		} finally {
			loading.value = false
		}
	}

	return {
		clips,
		selectedClip,
		loading,
		clipsCount,
		hasClips,
		addClip,
		updateClip,
		deleteClip,
		reorderClips,
		fetchClips
	}
}

