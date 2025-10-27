export interface SyncConfig {
	autoSync: boolean
	syncInterval: number
	conflictResolution: 'local' | 'cloud' | 'manual'
}

export class SyncManager {
	private config: SyncConfig = {
		autoSync: true,
		syncInterval: 30000, // 30 seconds
		conflictResolution: 'local' // prefer local changes
	}

	private syncTimer: NodeJS.Timeout | null = null

	constructor(config?: Partial<SyncConfig>) {
		if (config) {
			this.config = { ...this.config, ...config }
		}
	}

	startAutoSync(onSync: () => Promise<void>) {
		if (this.config.autoSync) {
			this.syncTimer = setInterval(async () => {
				await this.sync(onSync)
			}, this.config.syncInterval)
		}
	}

	stopAutoSync() {
		if (this.syncTimer) {
			clearInterval(this.syncTimer)
			this.syncTimer = null
		}
	}

	async sync(onSync: () => Promise<void>) {
		try {
			await onSync()
		} catch (error) {
			console.error('Sync failed:', error)
		}
	}

	async resolveConflict(
		localData: any,
		cloudData: any,
		resolution: 'local' | 'cloud' | 'manual' = this.config.conflictResolution
	) {
		switch (resolution) {
			case 'local':
				return localData
			case 'cloud':
				return cloudData
			case 'manual':
				// In a real app, this would trigger a UI for user decision
				return this.compareTimestamps(localData, cloudData) ? localData : cloudData
			default:
				return localData
		}
	}

	private compareTimestamps(local: any, cloud: any): boolean {
		const localTime = new Date(local.updated_at || local.created_at).getTime()
		const cloudTime = new Date(cloud.updated_at || cloud.created_at).getTime()
		return localTime >= cloudTime
	}

	setConfig(config: Partial<SyncConfig>) {
		this.config = { ...this.config, ...config }
	}

	getConfig(): SyncConfig {
		return { ...this.config }
	}
}

