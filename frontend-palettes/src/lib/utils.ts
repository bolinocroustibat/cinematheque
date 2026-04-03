import chroma from "chroma-js"

export function hexToRgb(hex: string): [number, number, number] {
	const [r, g, b] = chroma(hex).rgb()
	return [r, g, b]
}

export function formatDate(dateStr: string): string {
	if (!dateStr) return "-"
	const normalizedDate = dateStr.replace("_", " ").replace(/\//g, "-")
	const date = new Date(normalizedDate)
	return date.toLocaleString()
}

export function sortColorsByProximity(colors: string[]): string[] {
	return [...colors].sort((a, b) => {
		const hueA = chroma(a).hsl()[0] || 0
		const hueB = chroma(b).hsl()[0] || 0
		return hueA - hueB
	})
}
