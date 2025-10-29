import type { NavigationMenuItem } from '@nuxt/ui'

export const useNavigation = () => {
	const route = useRoute()
	const { isAuthenticated } = useAuth()

	const navigationItems = computed<NavigationMenuItem[]>(() => {
		const items: NavigationMenuItem[] = [
			{
				label: 'Projects',
				to: '/projects',
				icon: 'i-lucide-folder',
				active: route.path === '/projects' || route.path.startsWith('/project/')
			},
			{
				label: 'Library',
				to: '/library',
				icon: 'i-lucide-video',
				active: route.path === '/library'
			},
			{
				label: 'Recorder',
				to: '/recorder',
				icon: 'i-lucide-record',
				active: route.path === '/recorder'
			}
		]

		// Add Login link only when not authenticated
		if (!isAuthenticated.value) {
			items.push({
				label: 'Login',
				to: '/login',
				icon: 'i-lucide-log-in',
				active: route.path === '/login'
			})
		}

		return items
	})

	const commandPaletteItems = computed(() => {
		return [
			{
				id: 'navigation',
				label: 'Navigation',
				items: [
					{
						label: 'Projects',
						to: '/projects',
						icon: 'i-lucide-folder',
						suffix: 'View and manage your projects',
						kbds: ['g', 'p']
					},
					{
						label: 'Library',
						to: '/library',
						icon: 'i-lucide-video',
						suffix: 'Browse your media library',
						kbds: ['g', 'l']
					},
					{
						label: 'Recorder',
						to: '/recorder',
						icon: 'i-lucide-record',
						suffix: 'Record screen and webcam',
						kbds: ['g', 'r']
					},
					{
						label: 'Home',
						to: '/',
						icon: 'i-lucide-home',
						suffix: 'Go to home page'
					}
				]
			},
			...(isAuthenticated.value
				? [
						{
							id: 'actions',
							label: 'Actions',
							items: [
								{
									label: 'New Project',
									icon: 'i-lucide-folder-plus',
									suffix: 'Create a new video project',
									kbds: ['meta', 'n'],
									onSelect: () => {
										// Navigate to projects and trigger create action
										navigateTo('/projects')
									}
								}
							]
						}
					]
				: [
						{
							id: 'auth',
							label: 'Authentication',
							items: [
								{
									label: 'Login',
									to: '/login',
									icon: 'i-lucide-log-in',
									suffix: 'Sign in to your account'
								}
							]
						}
					])
		]
	})

	return {
		navigationItems,
		commandPaletteItems
	}
}
