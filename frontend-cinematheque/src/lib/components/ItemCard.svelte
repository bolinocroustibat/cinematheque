<script lang="ts">
import { getSmallPoster } from "$lib/poster"
import type { Item } from "$lib/types"
import { isConsumed } from "$lib/types"

let {
	item,
	onSelect,
	onToggleWatch,
}: {
	item: Item
	onSelect: (item: Item) => void
	onToggleWatch: (id: number, e: MouseEvent) => void
} = $props()

const small = $derived(getSmallPoster(item.poster))
</script>

<button
	type="button"
	class="card"
	class:is-watched={isConsumed(item)}
	class:is-unwatched={!isConsumed(item)}
	onclick={() => onSelect(item)}
>
	{#if item.poster && small}
		<img class="card-img" src={small} alt={item.title} loading="lazy" />
		<div class="card-info">
			<div class="card-title">{item.title}</div>
			<div class="card-year">{item.year}</div>
		</div>
	{:else}
		<div class="card-noimg">
			<div class="card-title">{item.title}</div>
			<div class="card-year">{item.year}</div>
		</div>
	{/if}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="watch-btn"
		class:watched={isConsumed(item)}
		onclick={(e) => {
			e.stopPropagation()
			onToggleWatch(item.id, e)
		}}
		onkeydown={(e) => e.stopPropagation()}
		role="checkbox"
		aria-checked={isConsumed(item)}
		tabindex="0"
	>
		✓
	</div>
</button>
