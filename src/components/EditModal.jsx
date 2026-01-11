import { useState } from "react"

const EditModal = ({ item, type, onClose, onSave }) => {
	const isFilm = type === "films"
	const isSeries = type === "series"
	const isMedia = isFilm || isSeries

	const [form, setForm] = useState({
		title: item.title || "",
		director: item.director || "",
		creator: item.creator || "",
		author: item.author || "",
		year: item.year || "",
		genre: item.genre || "",
		actors: item.actors || "",
		country: item.country || "",
		source: item.source || "",
		seasons: item.seasons || "",
		watched: item.watched || false,
		rating: item.rating || 0,
	})

	const handleSubmit = (e) => {
		e.preventDefault()
		if (!form.title) return
		onSave(item.id, {
			...form,
			year: parseInt(form.year, 10) || item.year,
			seasons: form.seasons ? parseInt(form.seasons, 10) : undefined,
			rating: form.rating || undefined,
		})
	}

	return (
		<div className="modal-bg" onClick={onClose}>
			<div className="modal add-modal" onClick={(e) => e.stopPropagation()}>
				<div className="modal-head">
					<div className="modal-title">Modifier</div>
					<button type="button" className="modal-close" onClick={onClose}>
						×
					</button>
				</div>
				<div className="modal-body">
					<form onSubmit={handleSubmit}>
						<div className="form-grid">
							<label className="full">
								<span>Titre *</span>
								<input
									type="text"
									value={form.title}
									onChange={(e) => setForm({ ...form, title: e.target.value })}
									required
								/>
							</label>
							<label>
								<span>
									{isFilm ? "Réalisateur" : isSeries ? "Créateur" : "Auteur"}
								</span>
								<input
									type="text"
									value={
										isFilm
											? form.director
											: isSeries
												? form.creator
												: form.author
									}
									onChange={(e) =>
										setForm({
											...form,
											[isFilm ? "director" : isSeries ? "creator" : "author"]:
												e.target.value,
										})
									}
								/>
							</label>
							<label>
								<span>Année</span>
								<input
									type="number"
									value={form.year}
									onChange={(e) => setForm({ ...form, year: e.target.value })}
								/>
							</label>
							{isSeries && (
								<label>
									<span>Saisons</span>
									<input
										type="number"
										value={form.seasons}
										onChange={(e) =>
											setForm({ ...form, seasons: e.target.value })
										}
									/>
								</label>
							)}
							<label className={isSeries ? "" : "full"}>
								<span>Genre</span>
								<input
									type="text"
									value={form.genre}
									onChange={(e) => setForm({ ...form, genre: e.target.value })}
									placeholder={isMedia ? "Drame, Action..." : "Roman, SF..."}
								/>
							</label>
							{isMedia && (
								<label className="full">
									<span>Casting</span>
									<input
										type="text"
										value={form.actors}
										onChange={(e) =>
											setForm({ ...form, actors: e.target.value })
										}
									/>
								</label>
							)}
							<label className="full">
								<span>Source / Reco</span>
								<input
									type="text"
									value={form.source}
									onChange={(e) => setForm({ ...form, source: e.target.value })}
									placeholder="Reco ami..."
								/>
							</label>
							<label className="checkbox">
								<input
									type="checkbox"
									checked={form.watched}
									onChange={(e) =>
										setForm({ ...form, watched: e.target.checked })
									}
								/>
								<span>{isMedia ? "Vu" : "Lu"}</span>
							</label>
							{form.watched && (
								<label>
									<span>Note</span>
									<div className="rating-input">
										{[1, 2, 3, 4, 5].map((n) => (
											<span
												key={n}
												className={`star ${form.rating >= n ? "active" : ""}`}
												onClick={() =>
													setForm({
														...form,
														rating: form.rating === n ? 0 : n,
													})
												}
											>
												★
											</span>
										))}
									</div>
								</label>
							)}
						</div>

						<div className="form-actions">
							<button
								type="button"
								className="btn btn-secondary"
								onClick={onClose}
							>
								Annuler
							</button>
							<button type="submit" className="btn btn-primary">
								Enregistrer
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}

export default EditModal
