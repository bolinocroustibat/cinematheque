export const sortItems = (list, sort) => {
	const sorted = [...list]
	switch (sort) {
		case "alpha-asc":
			return sorted.sort((a, b) =>
				(a.title || "").localeCompare(b.title || "", "fr"),
			)
		case "alpha-desc":
			return sorted.sort((a, b) =>
				(b.title || "").localeCompare(a.title || "", "fr"),
			)
		case "year-desc":
			return sorted.sort((a, b) => (b.year || 0) - (a.year || 0))
		case "year-asc":
			return sorted.sort((a, b) => (a.year || 0) - (b.year || 0))
		case "director":
			return sorted.sort((a, b) =>
				(a.director || a.creator || a.author || "").localeCompare(
					b.director || b.creator || b.author || "",
					"fr",
				),
			)
		case "added":
			return sorted.sort((a, b) => (b.id || 0) - (a.id || 0))
		case "unwatched":
			return sorted.sort((a, b) => {
				if (a.watched === b.watched) return (b.year || 0) - (a.year || 0)
				return a.watched ? 1 : -1
			})
		default:
			return sorted
	}
}

// Group items by separator
export const getGroupKey = (item, sort, tab) => {
	switch (sort) {
		case "alpha-asc":
		case "alpha-desc":
			return (item.title || "")[0]?.toUpperCase() || "#"
		case "year-desc":
		case "year-asc": {
			const decade = Math.floor((item.year || 0) / 10) * 10
			return decade > 0 ? `${decade}s` : "Inconnu"
		}
		case "director":
			return (
				(item.director ||
					item.creator ||
					item.author ||
					"Inconnu")[0]?.toUpperCase() || "#"
			)
		case "unwatched":
			return item.watched
				? tab === "books" || tab === "comics"
					? "Lus"
					: "Vus"
				: tab === "books" || tab === "comics"
					? "À lire"
					: "À voir"
		default:
			return null
	}
}
