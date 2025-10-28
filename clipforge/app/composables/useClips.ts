import { ref, computed } from 'vue'
import type { Clip } from '~/types/project'
import { saveVideoToIndexedDB, getVideoFromIndexedDB, deleteVideoFromIndexedDB, createBlobURL } from '~/utils/indexedDB'

// Global state to persist clips across components
const globalClips = ref<Clip[]>([])

// Storage strategy constants
const MAX_SUPABASE_SIZE = 50 * 1024 * 1024 // 50MB in bytes

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

			let fileUrl = src
			let storageType: 'local' | 'cloud' = 'cloud'
			let clipId = crypto.randomUUID()

			// Handle blob URLs
			if (src.startsWith('blob:')) {
				const blob = await fetch(src).then(r => r.blob())
				const fileSize = blob.size

				const sizeMB = (fileSize / 1024 / 1024).toFixed(2)
				console.log(`📦 File size: ${sizeMB}MB`)

				// Decide storage strategy based on file size
				if (fileSize > MAX_SUPABASE_SIZE) {
					// Store locally in IndexedDB
					console.log(`📦 File too large (${sizeMB}MB > 50MB), storing in IndexedDB`)
					await saveVideoToIndexedDB(clipId, blob, metadata)
					fileUrl = `indexeddb://${clipId}`
					storageType = 'local'
				} else {
					// Upload to Supabase Storage
					console.log(`☁️ File under 50MB, uploading to Supabase...`)
					const fileName = `${projectId}/${Date.now()}-${metadata.name || 'clip'}.webm`
					
					const { data: uploadData, error: uploadError } = await supabase
						.storage
						.from('clips')
						.upload(fileName, blob, {
							contentType: blob.type,
							upsert: false
						})

					if (uploadError) {
						// Fallback to IndexedDB if upload fails
						console.warn(`⚠️ Supabase upload failed (${uploadError.message}), using IndexedDB instead`)
						console.log('💡 Tip: Create a "clips" bucket in your Supabase dashboard for cloud storage')
						await saveVideoToIndexedDB(clipId, blob, metadata)
						fileUrl = `indexeddb://${clipId}`
						storageType = 'local'
					} else {
						// Get public URL
						const { data: urlData } = supabase
							.storage
							.from('clips')
							.getPublicUrl(fileName)

						fileUrl = urlData.publicUrl
						console.log(`✅ Uploaded to Supabase Storage`)
					}
				}
			}

			const clipData = {
				id: clipId,
				project_id: projectId,
				name: metadata.name || 'Untitled Clip',
				src: fileUrl,
				duration: metadata.duration || 0,
				start_time: 0,
				end_time: metadata.duration || 0,
				track: 1,
				metadata: {
					...metadata,
					storageType,
					fileSize: metadata.fileSize || 0
				}
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

			// Check if clip is stored in IndexedDB
			const clip = clips.value.find(c => c.id === clipId)
			if (clip?.metadata?.storageType === 'local') {
				await deleteVideoFromIndexedDB(clipId)
			}

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

			// Convert IndexedDB references to blob URLs
			const clipsWithUrls = await Promise.all(
				(data || []).map(async (clip) => {
					if (clip.src.startsWith('indexeddb://')) {
						const id = clip.src.replace('indexeddb://', '')
						const blob = await getVideoFromIndexedDB(id)
						if (blob) {
							return {
								...clip,
								src: createBlobURL(blob)
							}
						}
					}
					return clip
				})
			)

			clips.value = clipsWithUrls

			return { clips: clipsWithUrls, error: null }
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

