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

const creator = $derived(
	("director" in item && item.director) ||
		("creator" in item && item.creator) ||
		("author" in item && item.author),
)
const small = $derived(getSmallPoster(item.poster))
</script>

<button
	type="button"
	class="list-item"
	class:is-watched={isConsumed(item)}
	class:is-unwatched={!isConsumed(item)}
	onclick={() => onSelect(item)}
>
	{#if item.poster && small}
		<img class="list-poster" src={small} alt="" loading="lazy" />
	{:else}
		<div class="list-poster-empty">?</div>
	{/if}
	<div class="list-info">
		<div class="list-title">{item.title}</div>
		<div class="list-meta">
			{creator} · {item.year}
		</div>
	</div>
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
