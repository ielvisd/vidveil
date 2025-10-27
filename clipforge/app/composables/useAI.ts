import { ref } from 'vue'
import { openai } from 'openai'

export type ShapeType = 'circle' | 'square' | 'heart' | 'hexagon' | 'star' | 'diamond' | 'triangle' | 'pentagon' | 'octagon' | 'ellipse' | 'custom'

export interface ShapeDefinition {
	type: ShapeType
	params?: Record<string, any>
	description?: string
}

export const useAI = () => {
	const shapes = ref<Map<string, ShapeDefinition>>(new Map([
		['circle', { type: 'circle' }],
		['square', { type: 'square' }],
		['heart', { type: 'heart' }],
		['hex', { type: 'hexagon' }],
		['hexagon', { type: 'hexagon' }],
		['star', { type: 'star' }],
		['diamond', { type: 'diamond' }],
		['triangle', { type: 'triangle' }],
		['pentagon', { type: 'pentagon' }],
		['octagon', { type: 'octagon' }],
		['ellipse', { type: 'ellipse' }],
		['oval', { type: 'ellipse' }]
	]))

	const client = ref<openai.OpenAI | null>(null)
	const loading = ref(false)

	const initializeClient = (apiKey: string) => {
		client.value = new openai.OpenAI({
			apiKey,
			dangerouslyAllowBrowser: true
		})
	}

	const parseShapePrompt = async (prompt: string): Promise<ShapeDefinition> => {
		loading.value = true

		try {
			// Try keyword matching first
			const lowerPrompt = prompt.toLowerCase()
			
			// Check for variations like "spiky circle", "wavy star", etc.
			for (const [key, shape] of shapes.value.entries()) {
				if (lowerPrompt.includes(key)) {
					// Extract modifiers
					const modifiers = extractModifiers(lowerPrompt, key)
					
					return {
						...shape,
						params: modifiers,
						description: prompt
					}
				}
			}

			// If no match and OpenAI is available, use AI
			if (client.value) {
				return await generateShapeFromAI(prompt)
			}

			// Fallback to circle
			return { type: 'circle', description: prompt }
		} catch (error) {
			console.error('Error parsing shape prompt:', error)
			return { type: 'circle', description: prompt }
		} finally {
			loading.value = false
		}
	}

	const extractModifiers = (prompt: string, baseShape: string): Record<string, any> => {
		const modifiers: Record<string, any> = {}
		
		if (prompt.includes('spiky') || prompt.includes('sharp')) {
			modifiers.spiky = true
			modifiers.borderStyle = 'spiky'
		}
		
		if (prompt.includes('wavy') || prompt.includes('smooth')) {
			modifiers.wavy = true
			modifiers.borderStyle = 'wavy'
		}
		
		if (prompt.includes('glow') || prompt.includes('bright')) {
			modifiers.glow = true
		}
		
		if (prompt.includes('large') || prompt.includes('big')) {
			modifiers.scale = 1.5
		}
		
		if (prompt.includes('small') || prompt.includes('tiny')) {
			modifiers.scale = 0.5
		}
		
		return modifiers
	}

	const generateShapeFromAI = async (prompt: string): Promise<ShapeDefinition> => {
		if (!client.value) {
			throw new Error('OpenAI client not initialized')
		}

		try {
			const completion = await client.value.chat.completions.create({
				model: 'gpt-4-turbo-preview',
				messages: [
					{
						role: 'system',
						content: 'You are a shape parser for a video editor. Analyze the user\'s description and return a shape type with optional parameters. Return JSON with {type: string, params?: object}.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				temperature: 0.3
			})

			const response = completion.choices[0]?.message?.content
			if (response) {
				const parsed = JSON.parse(response)
				return {
					type: parsed.type || 'circle',
					params: parsed.params || {},
					description: prompt
				}
			}
		} catch (error) {
			console.error('AI generation failed:', error)
		}

		return { type: 'circle', description: prompt }
	}

	const addCustomShape = (name: string, shape: ShapeDefinition) => {
		shapes.value.set(name, shape)
	}

	return {
		shapes,
		loading,
		initializeClient,
		parseShapePrompt,
		extractModifiers,
		generateShapeFromAI,
		addCustomShape
	}
}

