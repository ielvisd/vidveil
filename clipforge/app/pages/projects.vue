<template>
	<UContainer class="projects-page">
		<div class="page-header">
			<h1>My Projects</h1>
			<UButton @click="createNewProject" color="primary" icon="i-heroicons-plus">
				New Project
			</UButton>
		</div>

		<div v-if="loading" class="loading">
			<p>Loading projects...</p>
		</div>

		<div v-else-if="projects.length === 0" class="empty-state">
			<h2>No projects yet</h2>
			<p>Create your first project to start editing videos</p>
			<UButton @click="createNewProject" color="primary" size="xl" class="mt-4">
				Create Project
			</UButton>
		</div>

		<div v-else class="projects-grid">
			<UCard 
				v-for="project in projects" 
				:key="project.id"
				@click="openProject(project.id)"
				class="project-card"
			>
				<h3>{{ project.name }}</h3>
				<p class="text-sm text-gray-500">{{ project.clips?.length || 0 }} clips</p>
				<p class="text-xs text-gray-400">{{ formatDate(project.updated_at) }}</p>
			</UCard>
		</div>
	</UContainer>
</template>

<script setup lang="ts">
const { projects, fetchProjects, createProject } = useProject()
const loading = ref(true)

onMounted(async () => {
	await fetchProjects()
	loading.value = false
})

const createNewProject = async () => {
	const name = prompt('Enter project name:')
	if (!name) return

	const result = await createProject({ name })
	if (result.project) {
		await navigateTo(`/project/${result.project.id}`)
	}
}

const openProject = (projectId: string) => {
	navigateTo(`/project/${projectId}`)
}

const formatDate = (date: string) => {
	return new Date(date).toLocaleDateString()
}
</script>

<style scoped>
.projects-page {
	padding: 2rem;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 2rem;
}

.loading {
	text-align: center;
	padding: 4rem;
	color: rgb(156 163 175);
}

.empty-state {
	text-align: center;
	padding: 4rem;
}

.projects-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 1.5rem;
}

.project-card {
	cursor: pointer;
	transition: transform 0.2s;
}

.project-card:hover {
	transform: translateY(-4px);
}
</style>

