import type { Item } from "@/types"
import { getSmallPoster } from "@/utils/poster"

interface ItemListRowProps {
	item: Item
	onSelect: (item: Item) => void
	onToggleWatch: (id: number, e: React.MouseEvent) => void
}

const ItemListRow = ({ item, onSelect, onToggleWatch }: ItemListRowProps) => {
	const creator =
		("director" in item && item.director) ||
		("creator" in item && item.creator) ||
		("author" in item && item.author)

	return (
		<button
			type="button"
			className={`list-item ${item.watched ? "is-watched" : "is-unwatched"}`}
			onClick={() => onSelect(item)}
		>
			{item.poster ? (
				<img
					className="list-poster"
					src={getSmallPoster(item.poster) ?? undefined}
					alt=""
					loading="lazy"
				/>
			) : (
				<div className="list-poster-empty">?</div>
			)}
			<div className="list-info">
				<div className="list-title">{item.title}</div>
				<div className="list-meta">
					{creator} · {item.year}
				</div>
			</div>
			{/* biome-ignore lint/a11y/useSemanticElements: styled watch button */}
			<div
				className={`watch-btn ${item.watched ? "watched" : ""}`}
				onClick={(e) => onToggleWatch(item.id, e)}
				onKeyDown={(e) => e.stopPropagation()}
				role="checkbox"
				aria-checked={item.watched}
				tabIndex={0}
			>
				✓
			</div>
		</button>
	)
}

export default ItemListRow
