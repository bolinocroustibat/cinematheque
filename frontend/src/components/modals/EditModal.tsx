import { useState } from "react"
import type { Item, TabType } from "@/types"

interface EditModalProps {
	item: Item
	type: TabType
	onClose: () => void
	onSave: (id: number, updates: Partial<Item>) => void
}

interface FormState {
	title: string
	director: string
	creator: string
	author: string
	year: string | number
	genre: string
	actors: string
	country: string
	source: string
	seasons: string | number
	watched: boolean
	rating: number
}

const EditModal = ({ item, type, onClose, onSave }: EditModalProps) => {
	const isFilm = type === "films"
	const isSeries = type === "series"
	const isMedia = isFilm || isSeries

	const [form, setForm] = useState<FormState>({
		title: item.title || "",
		director: "director" in item ? item.director || "" : "",
		creator: "creator" in item ? item.creator || "" : "",
		author: "author" in item ? item.author || "" : "",
		year: item.year || "",
		genre: item.genre || "",
		actors: "actors" in item ? item.actors || "" : "",
		country: "country" in item ? item.country || "" : "",
		source: item.source || "",
		seasons: "seasons" in item ? item.seasons || "" : "",
		watched: item.watched || false,
		rating: item.rating || 0,
	})

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (!form.title) return
		onSave(item.id, {
			...form,
			year: parseInt(String(form.year), 10) || item.year,
			seasons: form.seasons ? parseInt(String(form.seasons), 10) : undefined,
			rating: form.rating || undefined,
		} as Partial<Item>)
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
		// biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop pattern
		<div className="modal-bg" onClick={onClose}>
			<div
				className="modal add-modal"
				onClick={(e) => e.stopPropagation()}
				onKeyDown={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
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
								<div className="form-field">
									<span>Note</span>
									<div className="rating-input">
										{[1, 2, 3, 4, 5].map((n) => (
											<button
												key={n}
												type="button"
												className={`star ${form.rating >= n ? "active" : ""}`}
												onClick={() =>
													setForm({
														...form,
														rating: form.rating === n ? 0 : n,
													})
												}
											>
												★
											</button>
										))}
									</div>
								</div>
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
