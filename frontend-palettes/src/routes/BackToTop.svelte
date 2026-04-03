<script lang="ts">
import { fade } from "svelte/transition"
import { browser } from "$app/environment"

let showButton = false

if (browser) {
	window.addEventListener("scroll", () => {
		showButton = window.scrollY > 500
	})
}

function scrollToTop() {
	window.scrollTo({ top: 0, behavior: "smooth" })
}
</script>

{#if showButton}
	<button
		on:click={scrollToTop}
		aria-label="Scroll to top"
		class="fixed bottom-8 right-8 bg-violet-300/10 hover:bg-violet-300/20 text-violet-300/90 
			   rounded-full p-3 transition-all duration-300 backdrop-blur-xs"
		transition:fade={{ duration: 200 }}
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
		</svg>
	</button>
{/if} 