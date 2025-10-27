<template>
	<UContainer class="home-page">
		<div class="hero-section">
			<h1 class="hero-title">ClipForge</h1>
			<p class="hero-subtitle">AI-Powered Video Editor with PiP Magic</p>
		<div class="cta-buttons">
			<UButton to="/projects" size="xl" color="primary">
				My Projects
			</UButton>
			<UButton to="/library" size="xl" variant="outline">
				Import Media
			</UButton>
			<UButton to="/login" size="xl" variant="soft">
				Login
			</UButton>
		</div>
		</div>

		<div class="features-section">
			<h2>Features</h2>
			<div class="features-grid">
				<div class="feature">
					<span class="feature-icon">📁</span>
					<h3>Import & Organize</h3>
					<p>Drag and drop videos into your library</p>
				</div>
				<div class="feature">
					<span class="feature-icon">✂️</span>
					<h3>Timeline Editing</h3>
					<p>Trim, split, and arrange your clips</p>
				</div>
				<div class="feature">
					<span class="feature-icon">✨</span>
					<h3>PiP Shapes</h3>
					<p>AI-powered custom shapes for picture-in-picture</p>
				</div>
				<div class="feature">
					<span class="feature-icon">🎥</span>
					<h3>Screen Recording</h3>
					<p>Record your screen with webcam overlay</p>
				</div>
			</div>
		</div>
	</UContainer>
</template>

<script setup lang="ts">
definePageMeta({
	layout: 'home'
})
</script>

<style scoped>
.home-page {
	padding: 0;
}

.hero-section {
	text-align: center;
	padding: 6rem 2rem;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero-title {
	font-size: 4rem;
	font-weight: bold;
	color: white;
	margin-bottom: 1rem;
}

.hero-subtitle {
	font-size: 1.5rem;
	color: white;
	opacity: 0.9;
	margin-bottom: 3rem;
}

.cta-buttons {
	display: flex;
	gap: 1rem;
	justify-content: center;
}

.features-section {
	padding: 4rem 2rem;
}

.features-section h2 {
	text-align: center;
	font-size: 2rem;
	margin-bottom: 3rem;
}

.features-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 2rem;
	max-width: 1200px;
	margin: 0 auto;
}

.feature {
	padding: 2rem;
	background: white;
	border-radius: 1rem;
	text-align: center;
}

.feature-icon {
	font-size: 3rem;
	display: block;
	margin-bottom: 1rem;
}

.feature h3 {
	font-size: 1.25rem;
	font-weight: 600;
	margin-bottom: 0.5rem;
}

.feature p {
	color: rgb(107 114 128);
}
</style>

