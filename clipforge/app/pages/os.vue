<template>
	<LayoutTile
		title="OS Information"
		description="Read information about the operating system using the OS Information plugin."
	>
		<UAccordion :items="items" type="multiple" />
	</LayoutTile>
</template>

<script lang="ts" setup>
	definePageMeta({
		name: "OS Informations",
		icon: "lucide:info",
		category: "system",
		description: "Read operating system informations."
	});

	// Guard Tauri calls - only run in Tauri environment
	const items = ref([
		{
			label: "System",
			icon: "lucide:monitor",
			content: "Loading..."
		},
		{
			label: "Arch",
			icon: "lucide:microchip",
			content: "Loading..."
		},
		{
			label: "Locale",
			icon: "lucide:globe",
			content: "Loading..."
		}
	]);

	onMounted(async () => {
		if (import.meta.env.TAURI_PLATFORM) {
			try {
				items.value = [
					{
						label: "System",
						icon: "lucide:monitor",
						content: `${useTauriOsPlatform()} ${useTauriOsVersion()}`
					},
					{
						label: "Arch",
						icon: "lucide:microchip",
						content: useTauriOsArch()
					},
					{
						label: "Locale",
						icon: "lucide:globe",
						content: await useTauriOsLocale() || "Not detectable"
					}
				]
			} catch (error) {
				console.warn('Tauri OS plugin not available:', error)
			}
		} else {
			items.value = [
				{
					label: "System",
					icon: "lucide:monitor",
					content: "Browser - Not available in browser"
				},
				{
					label: "Arch",
					icon: "lucide:microchip",
					content: "Browser - Not available in browser"
				},
				{
					label: "Locale",
					icon: "lucide:globe",
					content: "Browser - Not available in browser"
				}
			]
		}
	});
</script>
