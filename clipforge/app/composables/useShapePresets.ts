export interface ShapePreset {
	name: string
	shape: string
	config: Record<string, any>
}

export const useShapePresets = () => {
	const presets = ref<ShapePreset[]>([
		{ name: 'Circle', shape: 'circle', config: {} },
		{ name: 'Square', shape: 'square', config: {} },
		{ name: 'Heart', shape: 'heart', config: {} },
		{ name: 'Star', shape: 'star', config: {} },
		{ name: 'Hexagon', shape: 'hexagon', config: { border: { width: 2 } } }
	])

	const savePreset = (preset: ShapePreset) => {
		presets.value.push(preset)
	}

	const deletePreset = (index: number) => {
		presets.value.splice(index, 1)
	}

	return {
		presets,
		savePreset,
		deletePreset
	}
}

