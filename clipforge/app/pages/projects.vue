<template>
	<div class="projects-page min-h-screen bg-black">
		<UContainer class="py-6 md:py-8 lg:py-10">
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 md:mb-12">
				<div>
					<h1 class="text-3xl md:text-4xl font-bold text-white mb-2">My Projects</h1>
					<p class="text-gray-400">Manage your video editing projects</p>
				</div>
				<UButton 
					@click="createNewProject" 
					color="primary" 
					icon="i-lucide-plus"
					size="lg"
					class="shrink-0"
				>
					New Project
				</UButton>
			</div>

			<div v-if="error" class="mb-6">
				<UAlert color="red" variant="soft" :title="error" icon="i-lucide-alert-circle" />
			</div>

			<div v-if="loading" class="flex items-center justify-center py-24">
				<div class="text-center">
					<SharedLoadingSpinner size="lg" message="Loading projects..." />
				</div>
			</div>

			<div v-else-if="projects.length === 0" class="flex items-center justify-center py-24">
				<UCard class="max-w-md w-full bg-zinc-900/50 border-zinc-800 text-center">
					<template #header>
						<div class="flex justify-center mb-4">
							<div class="p-4 bg-pink-500/10 rounded-full border border-pink-500/20">
								<UIcon name="i-lucide-folder-plus" class="w-12 h-12 text-pink-500" />
							</div>
						</div>
						<h2 class="text-2xl font-bold text-white mb-2">No projects yet</h2>
						<p class="text-gray-400">Create your first project to start editing videos</p>
					</template>
					<UButton 
						@click="createNewProject" 
						color="primary" 
						size="lg"
						icon="i-lucide-plus"
						class="mt-6"
					>
						Create Project
					</UButton>
				</UCard>
			</div>

			<div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
				<UCard 
					v-for="project in projects" 
					:key="project.id"
					@click="openProject(project.id)"
					class="project-card bg-zinc-900/50 border-zinc-800 hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 transition-all cursor-pointer group"
				>
					<template #header>
						<div class="flex items-start justify-between mb-3">
							<div class="flex-1 min-w-0">
								<h3 class="text-lg font-semibold text-white truncate group-hover:text-pink-500 transition-colors">{{ project.name }}</h3>
							</div>
							<UIcon name="i-lucide-chevron-right" class="w-5 h-5 text-gray-500 group-hover:text-pink-500 transition-colors shrink-0 ml-2" />
						</div>
					</template>
					<div class="space-y-2">
						<div class="flex items-center gap-2 text-sm text-gray-400">
							<UIcon name="i-lucide-film" class="w-4 h-4" />
							<span>{{ project.clips?.length || 0 }} clip{{ (project.clips?.length || 0) !== 1 ? 's' : '' }}</span>
						</div>
						<div class="flex items-center gap-2 text-xs text-gray-500">
							<UIcon name="i-lucide-clock" class="w-4 h-4" />
							<span>Updated {{ formatDate(project.updated_at) }}</span>
						</div>
					</div>
				</UCard>
			</div>
		</UContainer>
	</div>
</template>

<script setup lang="ts">
const { projects, fetchProjects, createProject } = useProject()
const { isAuthenticated, user } = useAuth()
const loading = ref(true)
const error = ref('')

onMounted(async () => {
	// Wait for auth to initialize
	const { loading: authLoading, user: authUser } = useAuth()
	
	// Wait for auth loading to complete
	while (authLoading.value) {
		await new Promise(resolve => setTimeout(resolve, 50))
	}
	
	// Small delay to ensure auth state is set
	await nextTick()
	
	// Check auth status
	console.log('Auth status:', isAuthenticated.value, user.value, authUser.value)
	
	// Force re-check after a short delay
	await new Promise(resolve => setTimeout(resolve, 100))
	
	if (!isAuthenticated.value && !authUser.value) {
		error.value = 'Please log in to view your projects'
		// Redirect to login after 2 seconds
		setTimeout(() => {
			navigateTo('/login')
		}, 2000)
		loading.value = false
		return
	}
	
	const result = await fetchProjects()
	if (result.error) {
		error.value = result.error
	}
	loading.value = false
})

const createNewProject = async () => {
	const name = prompt('Enter project name:')
	if (!name) return

	const result = await createProject({ name })
	if (result.error) {
		alert('Error creating project: ' + result.error)
		return
	}
	
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
.project-card {
	transition: all 0.2s ease;
}

.project-card:hover {
	transform: translateY(-2px);
}
</style>

