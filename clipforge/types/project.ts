export interface Project {
	id: string
	user_id: string
	name: string
	description?: string
	thumbnail_url?: string
	settings: Record<string, any>
	created_at: string
	updated_at: string
}

export interface Clip {
	id: string
	project_id: string
	name: string
	src: string
	start_time: number
	end_time?: number
	duration: number
	track: number
	pip_config?: PipConfig
	metadata: Record<string, any>
	created_at: string
	updated_at: string
}

export interface PipConfig {
	id: string
	clip_id: string
	shape_type: string
	shape_path?: string
	shape_params: Record<string, any>
	position: { x: number; y: number }
	animations: any[]
	created_at: string
	updated_at: string
}

export interface ProjectWithClips extends Project {
	clips: Clip[]
}

export interface ExportSettings {
	resolution: string
	quality: string
	format: string
	preset?: string
}

