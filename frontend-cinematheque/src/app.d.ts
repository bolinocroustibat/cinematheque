/// <reference types="vite/client" />

import type { LoadedCollections } from "$lib/api/normalize"

declare global {
	namespace App {
		interface Error {
			message: string
		}
		interface PageData {
			initial: LoadedCollections | null
		}
	}
	const __APP_VERSION__: string
}
