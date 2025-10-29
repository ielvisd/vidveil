<template>
	<div class="min-h-screen bg-black">
		<SiteNavbar class="fixed w-full z-50" />
		
		<div class="relative overflow-hidden">
			<!-- Hot pink gradient backgrounds -->
			<div class="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-black to-black" />
			<div class="absolute top-0 right-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
			<div class="absolute bottom-0 left-0 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
			
			<DesignTopBlob />
			<DesignBottomBlob />

			<div class="relative z-10 px-6 lg:px-8 pt-20 md:pt-24">
				<slot />
			</div>
		</div>
	</div>
</template>
