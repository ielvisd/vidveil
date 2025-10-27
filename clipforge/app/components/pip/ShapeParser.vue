<template>
	<UCard>
		<UInput
			v-model="input"
			placeholder="Describe shape (e.g., 'spiky star', 'wavy heart')"
			@keyup.enter="handleParse"
			class="mb-4"
		/>
		<UButton @click="handleParse" :loading="loading" block>
			Generate Shape
		</UButton>

		<div v-if="error" class="mt-4">
			<UAlert color="red" :title="error" />
		</div>
	</UCard>
</template>

<script setup lang="ts">
const { parseShapePrompt, loading } = useAI()

const input = ref('')
const error = ref('')

const emit = defineEmits<{
	shapeGenerated: [shape: any]
}>()

const handleParse = async () => {
	if (!input.value.trim()) return

	error.value = ''
	
	try {
		const shape = await parseShapePrompt(input.value)
		emit('shapeGenerated', shape)
		input.value = ''
	} catch (err: any) {
		error.value = err.message || 'Failed to generate shape'
	}
}
</script>

