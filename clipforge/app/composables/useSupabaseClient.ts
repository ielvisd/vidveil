import { createClient } from '@supabase/supabase-js'

let supabaseClient: any = null

export const useSupabaseClient = () => {
	// Return existing client if already created
	if (supabaseClient) {
		return supabaseClient
	}

	const config = useRuntimeConfig()
	
	const supabaseUrl = config.public.supabaseUrl as string
	const supabaseKey = config.public.supabaseKey as string

	if (!supabaseUrl || !supabaseKey) {
		console.warn('Supabase credentials not configured')
		return null
	}

	// Create singleton instance
	supabaseClient = createClient(supabaseUrl, supabaseKey)
	return supabaseClient
}

