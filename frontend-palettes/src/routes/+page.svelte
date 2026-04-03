<script lang="ts">
import "../app.css"
import type { Movie } from "$lib/types"
import type { PageProps } from "./$types"
import BackToTop from "./BackToTop.svelte"
import MovieCard from "./MovieCard.svelte"
import ThemeToggle from "./ThemeToggle.svelte"

const { data }: PageProps = $props()
const { movies } = data

// Log the version when the component initializes
console.log("App version:", __APP_VERSION__)

let expandedMovieId = $state<number | null>(null)

const validMovies = $derived(
	movies.filter((movie: Movie) => movie.palettes && movie.palettes.length > 0),
)
</script>

<div class="min-h-screen bg-linear-to-b from-white via-gray-50 to-gray-100/95 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900/95 py-12">
	<div class="container mx-auto px-4 animate-fade-in">
		<h1 class="text-5xl font-extrabold mb-4 text-center text-violet-600 dark:text-violet-300/90 font-windsor animate-slide-down">
			Movie Color Palettes
		</h1>
		<p class="text-center text-gray-600 dark:text-neutral-400/80 text-sm tracking-wider mb-16 font-light">
			Generated using <a 
				href="https://github.com/bolinocroustibat/movies-palettes/blob/main/movies_palettes.ipynb" 
				class="text-violet-600/80 dark:text-violet-300/80 hover:text-violet-500/90 dark:hover:text-violet-200/90 transition-colors underline underline-offset-4 decoration-violet-400/30" 
				target="_blank" 
				rel="noopener noreferrer"
			>this homemade algorithm</a>
		</p>
		<div class="flex flex-wrap gap-10 justify-center">
			{#each validMovies as movie, i}
				<div 
					class="opacity-0"
					style="animation: fade-in 0.5s ease-out forwards; animation-delay: {i * 50}ms"
				>
					<MovieCard 
						{movie} 
						isExpanded={expandedMovieId === movie.id}
						onToggle={() => expandedMovieId = expandedMovieId === movie.id ? null : movie.id}
					/>
				</div>
			{/each}
		</div>
	</div>
</div>

<ThemeToggle />
<BackToTop />
