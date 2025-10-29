<script setup lang="ts">
interface Props {
	open?: boolean
}

const props = withDefaults(defineProps<Props>(), {
	open: false
})

const emit = defineEmits<{
	'update:open': [value: boolean]
}>()

const { commandPaletteItems } = useNavigation()

const isOpen = computed({
	get: () => props.open,
	set: (value) => emit('update:open', value)
})

// Keyboard shortcut: Cmd/Ctrl+K to open
defineShortcuts({
	meta_k: () => {
		isOpen.value = true
	},
	ctrl_k: () => {
		isOpen.value = true
	}
})

function handleSelect(item: any) {
	if (item.to) {
		navigateTo(item.to)
		isOpen.value = false
	} else if (item.onSelect) {
		item.onSelect()
		isOpen.value = false
	}
}
</script>

<template>
	<UModal v-model:open="isOpen" :ui="{ content: 'p-0' }">
		<template #content>
			<UCommandPalette
				:groups="commandPaletteItems"
				placeholder="Search or navigate..."
				class="h-[32rem]"
				@update:model-value="handleSelect"
			/>
		</template>
	</UModal>
</template>
