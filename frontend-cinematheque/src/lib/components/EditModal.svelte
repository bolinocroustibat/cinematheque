<script lang="ts">
import FixPosterPanel from "$lib/components/FixPosterPanel.svelte"
import type { Item, TabType } from "$lib/types"
import { isAcquired, isConsumed } from "$lib/types"

let {
	item,
	type,
	onClose,
	onSave,
}: {
	item: Item
	type: TabType
	onClose: () => void
	onSave: (id: number, updates: Partial<Item>) => void
} = $props()

const isFilm = $derived(type === "films" || type === "documentaries")
const isSeries = $derived(type === "series")
const isMedia = $derived(isFilm || isSeries)

interface FormState {
	title: string
	director: string
	creator: string
	author: string
	year: string | number
	country: string
	recommendation_source: string
	seasons: string | number
	owned: boolean
	watched: boolean
	rating: number
	poster: string
}

let form = $state<FormState>({
	title: item.title || "",
	director: "director" in item ? item.director || "" : "",
	creator: "creator" in item ? item.creator || "" : "",
	author: "author" in item ? item.author || "" : "",
	year: item.year || "",
	country: "country" in item ? item.country || "" : "",
	recommendation_source: item.recommendation_source || "",
	seasons: "seasons" in item ? item.seasons || "" : "",
	owned: isAcquired(item),
	watched: isConsumed(item),
	rating: item.rating || 0,
	poster: item.poster || "",
})

function handlePosterPick(updates: {
	poster: string
	title?: string
	year?: number
}) {
	form = {
		...form,
		poster: updates.poster,
		...(updates.title !== undefined && updates.title !== ""
			? { title: updates.title }
			: {}),
		...(updates.year !== undefined ? { year: updates.year } : {}),
	}
}

function handleSubmit(e: SubmitEvent) {
	e.preventDefault()
	if (!form.title) return
	const { owned, watched, ...rest } = form
	onSave(item.id, {
		...rest,
		year: parseInt(String(form.year), 10) || item.year,
		seasons: form.seasons ? parseInt(String(form.seasons), 10) : undefined,
		rating: form.rating || undefined,
		poster: form.poster.trim() ? form.poster.trim() : undefined,
		acquired_at: owned ? item.acquired_at || new Date().toISOString() : null,
		consumed_at: watched ? item.consumed_at || new Date().toISOString() : null,
	} as Partial<Item>)
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-bg" onclick={onClose} onkeydown={() => {}} role="presentation">
	<div
		class="modal add-modal"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
	>
		<div class="modal-head">
			<div class="modal-title">Edit</div>
			<button type="button" class="modal-close" onclick={onClose}>×</button>
		</div>
		<div class="modal-body">
			<form onsubmit={handleSubmit}>
				{#if form.poster}
					<div class="form-poster">
						<img src={form.poster} alt="" />
						<button
							type="button"
							onclick={() => {
								form = { ...form, poster: "" }
							}}
						>
							Remove poster
						</button>
					</div>
				{/if}
				<div class="form-grid">
					<label class="full">
						<span>Title *</span>
						<input type="text" bind:value={form.title} required />
					</label>
					<label>
						<span>{isFilm ? "Director" : isSeries ? "Creator" : "Author"}</span>
						{#if isFilm}
							<input type="text" bind:value={form.director} />
						{:else if isSeries}
							<input type="text" bind:value={form.creator} />
						{:else}
							<input type="text" bind:value={form.author} />
						{/if}
					</label>
					<label>
						<span>Year</span>
						<input type="number" bind:value={form.year} />
					</label>
					{#if isSeries}
						<label>
							<span>Seasons</span>
							<input type="number" bind:value={form.seasons} />
						</label>
					{/if}
					<label class="full">
						<span>Country</span>
						<input type="text" bind:value={form.country} />
					</label>
					<label class="full">
						<span>Source / recommendation</span>
						<input
							type="text"
							bind:value={form.recommendation_source}
							placeholder="Friend tip..."
						/>
					</label>
					<label class="checkbox">
						<input type="checkbox" bind:checked={form.owned} />
						<span>In my collection</span>
					</label>
					<label class="checkbox">
						<input type="checkbox" bind:checked={form.watched} />
						<span>{isMedia ? "Watched" : "Read"}</span>
					</label>
					{#if form.watched}
						<div class="form-field">
							<span>Rating</span>
							<div class="rating-input">
								{#each [1, 2, 3, 4, 5] as n (n)}
									<button
										type="button"
										class="star"
										class:active={form.rating >= n}
										onclick={() =>
											(form.rating = form.rating === n ? 0 : n)}
									>
										★
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<div class="edit-poster-block">
					<h4 class="edit-poster-heading">Poster</h4>
					<p class="edit-poster-hint">
						Search TMDB/OMDb or paste an image URL. A result may update title/year.
					</p>
					<FixPosterPanel {item} {type} onPick={handlePosterPick} />
				</div>

				<div class="form-actions">
					<button type="button" class="btn btn-secondary" onclick={onClose}>
						Cancel
					</button>
					<button type="submit" class="btn btn-primary">Save</button>
				</div>
			</form>
		</div>
	</div>
</div>
