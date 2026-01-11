import Suggestions from "@/components/Suggestions.jsx"
import { getLargePoster } from "@/utils/poster.js"

const ItemModal = ({
	item,
	tab,
	onClose,
	onToggleWatch,
	onEdit,
	onFix,
	onDelete,
	items,
	onAdd,
}) => {
	return (
		<div className="modal-bg" onClick={onClose}>
			<div className="modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-head">
					<div className="modal-title">{item.title}</div>
					<button type="button" className="modal-close" onClick={onClose}>
						×
					</button>
				</div>
				<div className="modal-body">
					{item.poster && (
						<img
							className="modal-poster"
							src={getLargePoster(item.poster)}
							alt=""
						/>
					)}
					<div className="modal-meta">
						{item.director || item.creator || item.author} · {item.year}{" "}
						{item.country && `· ${item.country}`}
					</div>
					{item.rating > 0 && (
						<div className="modal-rating">
							{[1, 2, 3, 4, 5].map((n) => (
								<span
									key={n}
									className={`star ${item.rating >= n ? "" : "empty"}`}
								>
									★
								</span>
							))}
						</div>
					)}
					{item.seasons && (
						<div className="modal-section">
							<h4>Saisons</h4>
							<p>
								{item.seasons} saison{item.seasons > 1 ? "s" : ""}
							</p>
						</div>
					)}
					{item.genre && (
						<div className="modal-section">
							<h4>Genre</h4>
							<div>
								{item.genre.split(",").map((g) => (
									<span key={g} className="tag">
										{g.trim()}
									</span>
								))}
							</div>
						</div>
					)}
					{item.actors && (
						<div className="modal-section">
							<h4>Casting</h4>
							<p>{item.actors}</p>
						</div>
					)}
					{item.source && (
						<div className="modal-section">
							<h4>Source</h4>
							<p>{item.source}</p>
						</div>
					)}
					<div className="modal-buttons">
						<button
							type="button"
							className={`btn ${item.watched ? "btn-primary" : "btn-secondary"}`}
							onClick={() => onToggleWatch(item.id)}
						>
							{item.watched
								? tab === "books" || tab === "comics"
									? "✓ Lu"
									: "✓ Vu"
								: tab === "books" || tab === "comics"
									? "Marquer lu"
									: "Marquer vu"}
						</button>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={onEdit}
						>
							Modifier
						</button>
						<button type="button" className="btn btn-secondary" onClick={onFix}>
							Affiche
						</button>
						<button
							type="button"
							className="btn btn-danger"
							onClick={() => {
								if (confirm("Supprimer ?")) onDelete(item.id)
							}}
						>
							✕
						</button>
					</div>
				</div>
				<div className="modal-actions">
					{tab === "films" || tab === "series" ? (
						<>
							<a
								className="btn btn-secondary"
								href={`https://www.imdb.com/find?q=${encodeURIComponent(item.title)}`}
								target="_blank"
							>
								IMDb
							</a>
							<a
								className="btn btn-primary"
								href={`https://www.justwatch.com/fr/recherche?q=${encodeURIComponent(item.title)}`}
								target="_blank"
							>
								Où regarder
							</a>
						</>
					) : (
						<>
							<a
								className="btn btn-secondary"
								href={`https://www.goodreads.com/search?q=${encodeURIComponent(item.title)}`}
								target="_blank"
							>
								Goodreads
							</a>
							<a
								className="btn btn-primary"
								href={`https://www.babelio.com/recherche.php?Recherche=${encodeURIComponent(item.title)}`}
								target="_blank"
							>
								Babelio
							</a>
						</>
					)}
				</div>
				<Suggestions
					item={item}
					type={tab}
					existingIds={items.map((i) => i.title.toLowerCase())}
					onAdd={onAdd}
				/>
			</div>
		</div>
	)
}

export default ItemModal
