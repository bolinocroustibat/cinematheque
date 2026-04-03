<script lang="ts">
import type { Movie } from "$lib/types"
import PaletteCard from "./PaletteCard.svelte"

interface Props {
	movie: Movie
	isExpanded: boolean
	onToggle: () => void
}
const { movie, isExpanded, onToggle }: Props = $props()

const latestPalette = $derived(
	movie.palettes?.reduce((latest, current) => {
		if (!current.calculation_date) return latest
		if (!latest.calculation_date) return current
		return new Date(current.calculation_date) >
			new Date(latest.calculation_date)
			? current
			: latest
	}),
)
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<a 
	href="#{movie.slug}"
	class="block no-underline"
	onclick={(e) => e.stopPropagation()}
>
	<div 
		class="bg-white/80 dark:bg-neutral-900/80 rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 cursor-pointer shadow-lg hover:shadow-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-[width,transform,opacity] duration-500 ease-in-out relative"
		class:w-[292px]={!isExpanded || movie.palettes?.length === 1}
		class:w-auto={isExpanded && movie.palettes.length > 1}
		class:scale-105={isExpanded}
		class:z-10={isExpanded}
		onclick={onToggle}
	>
		<div class="h-[100px] mb-6 overflow-hidden">
			<h2 class="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 tracking-tight line-clamp-2 font-windsor">
				{movie.title}
			</h2>
			<div class="text-sm font-light text-neutral-400 mt-2 flex gap-2">
				{#if movie.director}
					<p>{movie.director}{#if movie.year}, {/if}</p>
				{/if}
				{#if movie.year}
					<p>{movie.year}</p>
				{/if}
			</div>
		</div>

		<div class="flex flex-row flex-wrap justify-center transition-all duration-500 ease-in-out" style:gap={isExpanded ? '1.5rem' : '0'}>
			<PaletteCard palette={latestPalette} {isExpanded} />
			{#if isExpanded && movie.palettes.length > 1}
				{#each movie.palettes.filter(p => p.id !== latestPalette.id) as palette}
					<PaletteCard palette={palette} isExpanded={true} />
				{/each}
			{/if}
		</div>
	</div>
</a> 