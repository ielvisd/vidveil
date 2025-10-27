<template>
	<UCard>
		<h3>Shape Editor</h3>
		<UFormGroup label="Shape Type">
			<USelect v-model="shapeType" :options="shapeOptions" />
		</UFormGroup>
		<UFormGroup label="Border Color">
			<UInput v-model="borderColor" type="color" />
		</UFormGroup>
		<UFormGroup label="Border Width">
			<URange v-model="borderWidth" :min="0" :max="10" />
		</UFormGroup>
		<UButton @click="applyChanges">Apply</UButton>
	</UCard>
</template>

<script setup lang="ts">
const shapeType = ref('circle')
const borderColor = ref('#ffffff')
const borderWidth = ref(3)

const shapeOptions = ['circle', 'square', 'heart', 'star', 'hexagon']

const emit = defineEmits<{
	update: [config: any]
}>()

const applyChanges = () => {
	emit('update', {
		shapeType: shapeType.value,
		borderColor: borderColor.value,
		borderWidth: borderWidth.value
	})
}
</script>

