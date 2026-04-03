<script lang="ts">
import type { Palette } from "$lib/types"
import { formatDate, hexToRgb } from "$lib/utils"

interface Props {
	palette: Palette
	isExpanded: boolean
}
const { palette, isExpanded }: Props = $props()
</script>

<div class="bg-neutral-900 rounded-lg shadow-lg hover:shadow-xl transition-shadow border border-neutral-700 w-[220px]">
	<div class="flex flex-col h-44 rounded-lg overflow-hidden">
		{#each palette.colors as color}
			{@const rgb = hexToRgb(color)}
			<div
				class="flex-1 relative group"
				style:background-color={color}
			>
				<div class="opacity-0 group-hover:opacity-100 absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/75 text-white text-xs px-2 py-1 rounded-sm transition-opacity">
					{color}<br>
					R: {rgb[0]}<br>
					G: {rgb[1]}<br>
					B: {rgb[2]}
				</div>
			</div>
		{/each}
	</div>

	{#if isExpanded}
		<div class="px-4 py-4 grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm font-light">
			<p class="text-neutral-500">ID</p>
			<p class="text-neutral-400">{palette.id}</p>
			
			<p class="text-neutral-500">Calculation date</p>
			<p class="text-neutral-400">
				{#if palette.calculation_date}
					{formatDate(palette.calculation_date)}
				{:else}
					-
				{/if}
			</p>
			
			<p class="text-neutral-500">Calculation duration</p>
			<p class="text-neutral-400">
				{#if palette.calculation_duration_seconds}
					{Math.round(palette.calculation_duration_seconds)}s
				{:else}
					-
				{/if}
			</p>
			
			<p class="text-neutral-500">Colors</p>
			<p class="text-neutral-400">{palette.colors.length}</p>
			
			<p class="text-neutral-500">Resolution</p>
			<p class="text-neutral-400">
				{#if palette.resize_width && palette.resize_height}
					{palette.resize_width}×{palette.resize_height}
				{:else}
					-
				{/if}
			</p>

			<p class="text-neutral-500">Clustering method</p>
			<p class="text-neutral-400">{palette.clustering_method || '-'}</p>

			<p class="text-neutral-500">Saturation factor</p>
			<p class="text-neutral-400">{palette.saturation_factor || '-'}</p>
			
			<p class="text-neutral-500">Saturation threshold</p>
			<p class="text-neutral-400">{palette.saturation_threshold || '-'}</p>

			<p class="text-neutral-500">Frame skip</p>
			<p class="text-neutral-400">{palette.frame_skip}</p>
			
			<p class="text-neutral-500">Batch size</p>
			<p class="text-neutral-400">{palette.batch_size}</p>

			<p class="text-neutral-500">Runtime type</p>
			<p class="text-neutral-400">{palette.runtime || '-'}</p>
		</div>
	{/if}
</div>
