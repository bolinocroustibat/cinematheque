<script lang="ts">
import Suggestions from "$lib/components/Suggestions.svelte"
import { getLargePoster } from "$lib/poster"
import type { Item, TabType } from "$lib/types"
import { isConsumed } from "$lib/types"

let {
	item,
	tab,
	onClose,
	onToggleWatch,
	onEdit,
	onFix,
	onDelete,
	items,
	onAdd,
}: {
	item: Item
	tab: TabType
	onClose: () => void
	onToggleWatch: (id: number) => void
	onEdit: () => void
	onFix: () => void
	onDelete: (id: number) => void
	items: Item[]
	onAdd: (item: Item) => void
} = $props()

const creator = $derived(
	("director" in item ? item.director : undefined) ||
		("creator" in item ? item.creator : undefined) ||
		("author" in item ? item.author : undefined),
)

const large = $derived(getLargePoster(item.poster))
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-bg" onclick={onClose} onkeydown={() => {}} role="presentation">
	<div
		class="modal"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
	>
		<div class="modal-head">
			<div class="modal-title">{item.title}</div>
			<button type="button" class="modal-close" onclick={onClose}>×</button>
		</div>
		<div class="modal-body">
			{#if item.poster && large}
				<img class="modal-poster" src={large} alt="" />
			{/if}
			<div class="modal-meta">
				{creator} · {item.year}
				{" "}
				{#if "country" in item && item.country}
					· {item.country}
				{/if}
			</div>
			{#if item.rating && item.rating > 0}
				<div class="modal-rating">
					{#each [1, 2, 3, 4, 5] as n (n)}
						<span class="star" class:empty={!item.rating || item.rating < n}>
							★
						</span>
					{/each}
				</div>
			{/if}
			{#if "seasons" in item && item.seasons}
				<div class="modal-section">
					<h4>Seasons</h4>
					<p>
						{item.seasons} season{item.seasons > 1 ? "s" : ""}
					</p>
				</div>
			{/if}
			{#if item.recommendation_source}
				<div class="modal-section">
					<h4>Recommendation</h4>
					<p>{item.recommendation_source}</p>
				</div>
			{/if}
			<div class="modal-buttons">
				<button
					type="button"
					class="btn"
					class:btn-primary={isConsumed(item)}
					class:btn-secondary={!isConsumed(item)}
					onclick={() => onToggleWatch(item.id)}
				>
					{isConsumed(item)
						? tab === "books" || tab === "comics"
							? "✓ Read"
							: "✓ Watched"
						: tab === "books" || tab === "comics"
							? "Mark as read"
							: "Mark as watched"}
				</button>
				<button type="button" class="btn btn-secondary" onclick={onEdit}>
					Edit
				</button>
				<button type="button" class="btn btn-secondary" onclick={onFix}>
					Poster
				</button>
				<button
					type="button"
					class="btn btn-danger"
					onclick={() => {
						if (confirm("Delete this item?")) onDelete(item.id)
					}}
				>
					✕
				</button>
			</div>
		</div>
		<div class="modal-actions">
			{#if tab === "films" || tab === "documentaries" || tab === "series"}
				<a
					class="btn btn-secondary"
					href="https://www.imdb.com/find?q={encodeURIComponent(item.title)}"
					target="_blank"
					rel="noreferrer"
				>
					IMDb
				</a>
				<a
					class="btn btn-primary"
					href="https://www.justwatch.com/us/search?q={encodeURIComponent(item.title)}"
					target="_blank"
					rel="noreferrer"
				>
					Where to watch
				</a>
			{:else}
				<a
					class="btn btn-secondary"
					href="https://www.goodreads.com/search?q={encodeURIComponent(item.title)}"
					target="_blank"
					rel="noreferrer"
				>
					Goodreads
				</a>
				<a
					class="btn btn-primary"
					href="https://openlibrary.org/search?q={encodeURIComponent(item.title)}"
					target="_blank"
					rel="noreferrer"
				>
					Open Library
				</a>
			{/if}
		</div>
		<Suggestions {item} type={tab} {items} {onAdd} />
	</div>
</div>
