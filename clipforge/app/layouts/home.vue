<template>
	<div class="min-h-screen bg-black">
		<SiteNavbar class="fixed w-full z-50" />
		
		<div class="relative">
			<div class="relative z-10 pt-20 md:pt-24">
				<slot />
			</div>
		</div>
	</div>
</template>
