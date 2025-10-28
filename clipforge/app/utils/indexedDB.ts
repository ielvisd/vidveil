// IndexedDB wrapper for storing large video files locally
const DB_NAME = 'vidveil-videos'
const STORE_NAME = 'clips'
const DB_VERSION = 1

let dbInstance: IDBDatabase | null = null

export const initDB = (): Promise<IDBDatabase> => {
	return new Promise((resolve, reject) => {
		if (dbInstance) {
			resolve(dbInstance)
			return
		}

		const request = indexedDB.open(DB_NAME, DB_VERSION)

		request.onerror = () => reject(request.error)
		request.onsuccess = () => {
			dbInstance = request.result
			resolve(dbInstance)
		}

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id' })
			}
		}
	})
}

export const saveVideoToIndexedDB = async (
	id: string,
	blob: Blob,
	metadata: Record<string, any> = {}
): Promise<void> => {
	const db = await initDB()
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORE_NAME], 'readwrite')
		const store = transaction.objectStore(STORE_NAME)

		const data = {
			id,
			blob,
			metadata,
			timestamp: Date.now()
		}

		const request = store.put(data)

		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
	})
}

export const getVideoFromIndexedDB = async (id: string): Promise<Blob | null> => {
	const db = await initDB()
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORE_NAME], 'readonly')
		const store = transaction.objectStore(STORE_NAME)
		const request = store.get(id)

		request.onsuccess = () => {
			const result = request.result
			resolve(result ? result.blob : null)
		}
		request.onerror = () => reject(request.error)
	})
}

export const deleteVideoFromIndexedDB = async (id: string): Promise<void> => {
	const db = await initDB()
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORE_NAME], 'readwrite')
		const store = transaction.objectStore(STORE_NAME)
		const request = store.delete(id)

		request.onsuccess = () => resolve()
		request.onerror = () => reject(request.error)
	})
}

export const getAllVideosFromIndexedDB = async (): Promise<any[]> => {
	const db = await initDB()
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([STORE_NAME], 'readonly')
		const store = transaction.objectStore(STORE_NAME)
		const request = store.getAll()

		request.onsuccess = () => resolve(request.result || [])
		request.onerror = () => reject(request.error)
	})
}

export const createBlobURL = (blob: Blob): string => {
	return URL.createObjectURL(blob)
}

