/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_TMDB_KEY: string
	readonly VITE_OMDB_KEY: string
	readonly API_URL?: string
	readonly ENVIRONMENT?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
