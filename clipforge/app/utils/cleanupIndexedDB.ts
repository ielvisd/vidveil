// Utility to clean up orphaned IndexedDB clips
import { getAllVideosFromIndexedDB, deleteVideoFromIndexedDB } from './indexedDB'

export const cleanupOrphanedClips = async (validClipIds: string[]) => {
	try {
		const allVideos = await getAllVideosFromIndexedDB()
		let cleanedCount = 0

		for (const video of allVideos) {
			if (!validClipIds.includes(video.id)) {
				await deleteVideoFromIndexedDB(video.id)
				cleanedCount++
			}
		}

		if (cleanedCount > 0) {
			console.log(`🧹 Cleaned up ${cleanedCount} orphaned clip(s) from IndexedDB`)
		}

		return { cleaned: cleanedCount }
	} catch (error) {
		console.error('Failed to cleanup IndexedDB:', error)
		return { cleaned: 0 }
	}
}

export const clearAllIndexedDBClips = async () => {
	try {
		const allVideos = await getAllVideosFromIndexedDB()
		
		for (const video of allVideos) {
			await deleteVideoFromIndexedDB(video.id)
		}

		console.log(`🗑️ Cleared all ${allVideos.length} clip(s) from IndexedDB`)
		return { cleared: allVideos.length }
	} catch (error) {
		console.error('Failed to clear IndexedDB:', error)
		return { cleared: 0 }
	}
}

