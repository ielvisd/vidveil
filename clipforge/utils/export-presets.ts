export interface ExportPreset {
	name: string
	resolution: { width: number; height: number }
	bitrate: number
	fps: number
	format: 'mp4' | 'webm'
}

export const exportPresets: ExportPreset[] = [
	{
		name: 'Web Optimized',
		resolution: { width: 1280, height: 720 },
		bitrate: 2000000,
		fps: 30,
		format: 'webm'
	},
	{
		name: 'YouTube HD',
		resolution: { width: 1920, height: 1080 },
		bitrate: 8000000,
		fps: 30,
		format: 'mp4'
	},
	{
		name: 'High Quality',
		resolution: { width: 1920, height: 1080 },
		bitrate: 12000000,
		fps: 60,
		format: 'mp4'
	}
]

export const getPreset = (name: string): ExportPreset | undefined => {
	return exportPresets.find(p => p.name === name)
}

