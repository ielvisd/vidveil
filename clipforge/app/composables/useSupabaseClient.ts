import { createClient } from '@supabase/supabase-js'

export const useSupabaseClient = () => {
	const config = useRuntimeConfig()
	
	const supabaseUrl = config.public.supabaseUrl as string
	const supabaseKey = config.public.supabaseKey as string

	if (!supabaseUrl || !supabaseKey) {
		console.warn('Supabase credentials not configured')
		return null
	}

	return createClient(supabaseUrl, supabaseKey)
}

