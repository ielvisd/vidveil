/**
 * Shared composable for Tauri environment detection
 * Use this throughout the app instead of duplicating isTauri checks
 */

export const useTauri = () => {
	/**
	 * Check if running in Tauri desktop environment
	 * @returns true if __TAURI__ is available in window
	 */
	const isTauri = (): boolean => {
		if (typeof window === 'undefined') {
			return false
		}
		return '__TAURI__' in window
	}

	/**
	 * Check if running in browser-only mode (not Tauri)
	 * @returns true if running in browser without Tauri
	 */
	const isBrowser = (): boolean => {
		return !isTauri()
	}

	/**
	 * Safely invoke a Tauri command, returning null if not in Tauri
	 * @param command - Tauri command name
	 * @param args - Command arguments
	 * @returns Promise with result or null if not in Tauri
	 */
	const safeInvoke = async <T = any>(command: string, args?: any): Promise<T | null> => {
		if (!isTauri()) {
			console.warn(`Tauri command '${command}' called but not running in Tauri environment`)
			return null
		}

		try {
			const { invoke } = await import('@tauri-apps/api/core')
			return await invoke<T>(command, args)
		} catch (error) {
			console.error(`Failed to invoke Tauri command '${command}':`, error)
			throw error
		}
	}

	return {
		isTauri,
		isBrowser,
		safeInvoke
	}
}



