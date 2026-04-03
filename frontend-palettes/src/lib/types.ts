export interface Movie {
	id: number
	title: string
	director?: string
	year?: string
	slug: string
	/** From API; documentaries excluded from this app. */
	type?: string
	palettes?: Palette[]
}

export interface Palette {
	id: string
	movie_id: number
	active?: boolean
	calculation_date?: string
	calculation_duration_seconds?: number
	is_black_and_white?: boolean
	colors: string[]
	clusters_nb: number
	frame_skip?: number
	resize_width?: number
	resize_height?: number
	batch_size?: number
	clustering_method?: string
	saturation_factor?: string
	saturation_threshold?: number
	runtime?: string
}
