<template>
	<UHeader
		class="bg-black/80 backdrop-blur-md border-b border-pink-500/20"
		:ui="{
			root: 'bg-black/80 backdrop-blur-md border-b border-pink-500/20 shadow-lg',
			container: 'px-4 md:px-6 lg:px-8'
		}"
	>
		<template #title>
			<NuxtLink to="/" class="group/logo flex items-center gap-2">
				<SvgoLogo :font-controlled="false" class="opacity-90 group-hover/logo:opacity-100 transition-opacity size-7 text-pink-500" />
				<span class="font-bold text-xl text-white hidden sm:inline">VidVeil</span>
			</NuxtLink>
		</template>
		<UNavigationMenu
			:items="pages"
			variant="link"
			:ui="{
				viewportWrapper: 'w-2xl absolute-center-h',
				list: 'gap-x-1 md:gap-x-3',
				link: {
					base: 'text-gray-300 hover:text-pink-500 transition-colors',
					active: 'text-pink-500 font-semibold'
				}
			}"
		/>
		<template #body>
			<UNavigationMenu
				:items="pages"
				orientation="vertical"
				variant="link"
				:ui="{
					link: {
						base: 'text-gray-300 hover:text-pink-500 transition-colors',
						active: 'text-pink-500 font-semibold'
					}
				}"
			/>
		</template>
		<template #right>
			<div class="flex items-center gap-3">
				<!-- Dev Mode Indicator -->
				<UBadge 
					v-if="isDev"
					variant="subtle" 
					:class="[
						'hidden md:inline-flex',
						isHMR ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
					]"
					:title="isHMR ? 'Hot Module Replacement Active' : 'Development Mode'"
				>
					{{ isHMR ? '🔄 HMR' : '⚙️ DEV' }}
				</UBadge>
				<UBadge 
					v-else
					variant="subtle" 
					class="bg-blue-500/20 text-blue-400 border-blue-500/30 hidden md:inline-flex"
					title="Production Build"
				>
					🚀 PROD
				</UBadge>
				<!-- Tauri Version Badge -->
				<UBadge 
					v-if="showTauriVersion"
					variant="subtle" 
					class="bg-pink-500/10 text-pink-400 border-pink-500/20 hidden md:inline-flex"
				>
					Tauri v{{ tauriVersion }}
				</UBadge>
			</div>
		</template>
	</UHeader>
</template>

<script lang="ts" setup>
	const { pages } = usePages();
	
	// Dev mode detection
	const isDev = computed(() => import.meta.dev)
	const isHMR = computed(() => import.meta.hot !== undefined && import.meta.hot !== null)
	const isProduction = computed(() => import.meta.prod)
	
	// Only use Tauri in Tauri environment
	const tauriVersion = ref('n/a')
	const showTauriVersion = ref(false)
	
	onMounted(async () => {
		if (import.meta.env.TAURI_PLATFORM) {
			try {
				const version = await useTauriAppGetTauriVersion()
				tauriVersion.value = version
				showTauriVersion.value = true
			} catch (error) {
				console.warn('Tauri not available:', error)
				showTauriVersion.value = false
			}
		}
	})
</script>
