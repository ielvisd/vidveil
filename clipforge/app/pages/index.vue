<template>
	<div class="home-page">
		<UPageHero
			headline="AI-Powered Video Editor"
			title="VidVeil"
			description="Create stunning tutorials with AI-assisted picture-in-picture overlays. Record, edit, and export polished videos with effortless masking and natural language shape generation."
			:links="heroLinks"
			orientation="vertical"
		/>

		<UPageSection
			headline="Features"
			title="Everything you need to create professional videos"
			description="Powerful tools combined in one intuitive desktop application"
			:features="features"
			orientation="vertical"
		/>

		<UPageCTA
			title="Ready to get started?"
			description="Create your first project and start producing professional videos today."
			:links="ctaLinks"
		/>
	</div>
</template>

<script setup lang="ts">
definePageMeta({
	layout: 'home'
})

const heroLinks = [
	{
		label: 'Get Started',
		to: '/projects',
		size: 'xl' as const,
		color: 'primary' as const,
		variant: 'solid' as const
	},
	{
		label: 'Learn More',
		to: '/library',
		size: 'xl' as const,
		variant: 'outline' as const
	}
]

const features = [
	{
		icon: 'i-lucide-folder-open',
		title: 'Import & Organize',
		description: 'Drag and drop videos into your library with ease',
		orientation: 'vertical' as const
	},
	{
		icon: 'i-lucide-scissors',
		title: 'Timeline Editing',
		description: 'Trim, split, and arrange your clips on a professional timeline',
		orientation: 'vertical' as const
	},
	{
		icon: 'i-lucide-sparkles',
		title: 'AI PiP Shapes',
		description: 'Natural language shape generation for picture-in-picture overlays',
		orientation: 'vertical' as const
	},
	{
		icon: 'i-lucide-video',
		title: 'Screen Recording',
		description: 'Record your screen with webcam overlay in one seamless workflow',
		orientation: 'vertical' as const
	}
]

const ctaLinks = [
	{
		label: 'View Projects',
		to: '/projects',
		size: 'lg' as const,
		color: 'primary' as const,
		variant: 'solid' as const
	},
	{
		label: 'Sign In',
		to: '/login',
		size: 'lg' as const,
		variant: 'outline' as const
	}
]
</script>

<style scoped>
.home-page {
	min-height: calc(100vh - var(--ui-header-height, 64px));
}
</style>

