import type { Item } from "@/types"
import { getSmallPoster } from "@/utils/poster"

interface ItemCardProps {
	item: Item
	onSelect: (item: Item) => void
	onToggleWatch: (id: number, e: React.MouseEvent) => void
}

const ItemCard = ({ item, onSelect, onToggleWatch }: ItemCardProps) => {
	return (
		<button
			type="button"
			className={`card ${item.watched ? "is-watched" : "is-unwatched"}`}
			onClick={() => onSelect(item)}
		>
			{item.poster ? (
				<>
					<img
						className="card-img"
						src={getSmallPoster(item.poster) ?? undefined}
						alt={item.title}
						loading="lazy"
					/>
					<div className="card-info">
						<div className="card-title">{item.title}</div>
						<div className="card-year">{item.year}</div>
					</div>
				</>
			) : (
				<div className="card-noimg">
					<div className="card-title">{item.title}</div>
					<div className="card-year">{item.year}</div>
				</div>
			)}
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

export default ItemCard
