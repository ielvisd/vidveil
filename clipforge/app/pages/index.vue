<template>
	<div class="home-page">
		<UPageHero
			headline="AI-Powered Video Editor"
			title="VidVeil"
			description="Create stunning tutorials with AI-assisted picture-in-picture overlays. Record, edit, and export polished videos with effortless masking and natural language shape generation."
			:links="heroLinks"
			orientation="vertical"
			class="text-center"
		>
			<template #default>
				<div class="relative mt-12">
					<div class="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 blur-3xl rounded-full" />
					<div class="relative bg-gradient-to-br from-pink-500/10 to-black border border-pink-500/20 rounded-2xl p-8 backdrop-blur-sm">
						<UIcon name="i-lucide-video" class="w-24 h-24 mx-auto text-pink-500 mb-4" />
						<h3 class="text-2xl font-bold text-white mb-2">PiP Magic</h3>
						<p class="text-gray-400">Natural language shape generation</p>
					</div>
				</div>
			</template>
		</UPageHero>

		<UContainer class="py-16 md:py-24">
			<div class="text-center mb-12 md:mb-16">
				<h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Features</h2>
				<p class="text-gray-400 text-lg">Everything you need to create professional videos</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
				<UCard
					v-for="feature in features"
					:key="feature.title"
					class="bg-zinc-900/50 border-zinc-800 hover:border-pink-500/50 transition-all hover:shadow-lg hover:shadow-pink-500/10"
				>
					<template #header>
						<div class="flex items-center gap-4 mb-4">
							<div class="p-3 bg-pink-500/10 rounded-lg border border-pink-500/20">
								<UIcon :name="feature.icon" class="w-6 h-6 text-pink-500" />
							</div>
							<h3 class="text-xl font-semibold text-white">{{ feature.title }}</h3>
						</div>
					</template>
					<p class="text-gray-400">{{ feature.description }}</p>
				</UCard>
			</div>
		</UContainer>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	layout: 'home'
})

const heroLinks = [
	{
		label: 'My Projects',
		to: '/projects',
		size: 'xl' as const,
		color: 'primary' as const,
		variant: 'solid' as const
	},
	{
		label: 'Import Media',
		to: '/library',
		size: 'xl' as const,
		variant: 'outline' as const,
		class: 'border-pink-500/50 text-white hover:bg-pink-500/10'
	},
	{
		label: 'Login',
		to: '/login',
		size: 'xl' as const,
		variant: 'ghost' as const,
		class: 'text-gray-300 hover:text-pink-500'
	}
]

const features = [
	{
		icon: 'i-lucide-folder-open',
		title: 'Import & Organize',
		description: 'Drag and drop videos into your library with ease'
	},
	{
		icon: 'i-lucide-scissors',
		title: 'Timeline Editing',
		description: 'Trim, split, and arrange your clips on a professional timeline'
	},
	{
		icon: 'i-lucide-sparkles',
		title: 'PiP Shapes',
		description: 'AI-powered custom shapes for picture-in-picture overlays'
	},
	{
		icon: 'i-lucide-video',
		title: 'Screen Recording',
		description: 'Record your screen with webcam overlay in one seamless workflow'
	}
]
</script>

<style scoped>
.home-page {
	min-height: calc(100vh - var(--ui-header-height, 64px));
}
</style>

