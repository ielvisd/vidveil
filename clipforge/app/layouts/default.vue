<template>
	<div class="min-h-screen bg-black">
		<SiteNavbar />
		<UMain>
			<UContainer class="py-6 md:py-8 lg:py-10">
				<slot />
			</UContainer>
		</UMain>
	</div>
</template>
