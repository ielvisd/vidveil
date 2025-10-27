import { ref, computed } from 'vue'
import type { Project, ProjectWithClips } from '~/types/project'

// Global state to persist current project across navigation
const globalProjects = ref<Project[]>([])
const globalCurrentProject = ref<ProjectWithClips | null>(null)

export const useProject = () => {
	const projects = globalProjects
	const currentProject = globalCurrentProject
	const loading = ref(false)

	const hasProjects = computed(() => projects.value.length > 0)
	const projectCount = computed(() => projects.value.length)

	const createProject = async (data: { name: string; description?: string }) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()
			const { user } = useAuth()

			if (!user.value) throw new Error('Not authenticated')

			const { data: project, error } = await supabase
				.from('projects')
				.insert({
					name: data.name,
					description: data.description,
					user_id: user.value.id,
					settings: {}
				})
				.select()
				.single()

			if (error) throw error

			projects.value.push(project)
			currentProject.value = { ...project, clips: [] }

			return { project, error: null }
		} catch (error: any) {
			return { project: null, error: error.message }
		} finally {
			loading.value = false
		}
	}

	const fetchProjects = async () => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()
			const { user } = useAuth()

			if (!user.value) throw new Error('Not authenticated')

			const { data, error } = await supabase
				.from('projects')
				.select('*')
				.eq('user_id', user.value.id)
				.order('updated_at', { ascending: false })

			if (error) throw error

			projects.value = data || []

			return { projects: data, error: null }
		} catch (error: any) {
			return { projects: [], error: error.message }
		} finally {
			loading.value = false
		}
	}

	const updateProject = async (projectId: string, updates: Partial<Project>) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()

			const { data, error } = await supabase
				.from('projects')
				.update(updates)
				.eq('id', projectId)
				.select()
				.single()

			if (error) throw error

			const index = projects.value.findIndex(p => p.id === projectId)
			if (index !== -1) {
				projects.value[index] = data
			}

			if (currentProject.value?.id === projectId) {
				currentProject.value = { ...currentProject.value, ...data }
			}

			return { project: data, error: null }
		} catch (error: any) {
			return { project: null, error: error.message }
		} finally {
			loading.value = false
		}
	}

	const deleteProject = async (projectId: string) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()

			const { error } = await supabase
				.from('projects')
				.delete()
				.eq('id', projectId)

			if (error) throw error

			projects.value = projects.value.filter(p => p.id !== projectId)
			
			if (currentProject.value?.id === projectId) {
				currentProject.value = null
			}

			return { error: null }
		} catch (error: any) {
			return { error: error.message }
		} finally {
			loading.value = false
		}
	}

	const selectProject = async (projectId: string) => {
		loading.value = true
		try {
			const supabase = useSupabaseClient()
			const { user } = useAuth()

			if (!user.value) throw new Error('Not authenticated')

			const { data: project, error: projectError } = await supabase
				.from('projects')
				.select('*')
				.eq('id', projectId)
				.eq('user_id', user.value.id)
				.single()

			if (projectError) throw projectError

			const { data: clips, error: clipsError } = await supabase
				.from('clips')
				.select('*')
				.eq('project_id', projectId)

			if (clipsError) throw clipsError

			currentProject.value = {
				...project,
				clips: clips || []
			}

			return { project: currentProject.value, error: null }
		} catch (error: any) {
			return { project: null, error: error.message }
		} finally {
			loading.value = false
		}
	}

	const autoSave = async () => {
		if (!currentProject.value) return

		await updateProject(currentProject.value.id, {
			updated_at: new Date().toISOString()
		})
	}

	return {
		projects,
		currentProject,
		loading,
		hasProjects,
		projectCount,
		createProject,
		fetchProjects,
		updateProject,
		deleteProject,
		selectProject,
		autoSave
	}
}

