import { getDomainFromUrl } from "../types/bookmark";
import type { FaviconOverride } from "../types/favicon";

export type FaviconSource = "override" | "browser" | "google" | "letter";

export interface FaviconCandidate {
	/** Identifies the image across renders, used to remember which sources failed. */
	key: string;
	source: FaviconSource;
	src?: string;
	letter?: string;
}

const ICON_SIZE = 256;

/** Firefox has no favicon API for extensions, so only Chrome gets the browser's own cache. */
const HAS_BROWSER_FAVICONS = !import.meta.env.FIREFOX;

export function getGoogleFaviconUrl(domain: string, size: number = ICON_SIZE): string {
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

export function getBrowserFaviconUrl(pageUrl: string, size: number = ICON_SIZE): string {
	return chrome.runtime.getURL(`_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`);
}

/** The icon sources to try for a bookmark, best first. The last one is always a letter. */
export function getBookmarkFaviconCandidates(params: {
	url?: string;
	title: string;
	override?: FaviconOverride;
	useGoogle: boolean;
}): FaviconCandidate[] {
	const { url, title, override, useGoogle } = params;
	const candidates: FaviconCandidate[] = [];

	if (override?.value) {
		candidates.push({
			key: `override:${override.bookmarkId}:${override.updatedAt}`,
			source: "override",
			src: override.value
		});
	}

	if (url && HAS_BROWSER_FAVICONS) {
		candidates.push({ key: `browser:${url}`, source: "browser", src: getBrowserFaviconUrl(url) });
	}

	const domain = url ? getDomainFromUrl(url) : "";
	if (domain && useGoogle) {
		candidates.push({ key: `google:${domain}`, source: "google", src: getGoogleFaviconUrl(domain) });
	}

	const letter = (title || domain || "?").trim().charAt(0).toUpperCase() || "?";
	candidates.push({ key: `letter:${letter}`, source: "letter", letter });

	return candidates;
}

/** A stable hue for the letter avatar, so the same site always gets the same colour. */
export function letterHue(seed: string): number {
	let hash = 0;
	for (const char of seed) {
		hash = (hash * 31 + char.charCodeAt(0)) | 0;
	}
	return Math.abs(hash) % 360;
}

const SIGNATURE_SIZE = 16;

/** A cheap fingerprint of an image's pixels (FNV-1a over a 16x16 rendering). */
function imageSignature(image: HTMLImageElement): number | null {
	const canvas = document.createElement("canvas");
	canvas.width = SIGNATURE_SIZE;
	canvas.height = SIGNATURE_SIZE;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) return null;

	try {
		context.drawImage(image, 0, 0, SIGNATURE_SIZE, SIGNATURE_SIZE);
		const { data } = context.getImageData(0, 0, SIGNATURE_SIZE, SIGNATURE_SIZE);
		let hash = 0x811c9dc5;
		for (const byte of data) {
			hash ^= byte;
			hash = Math.imul(hash, 0x01000193);
		}
		return hash >>> 0;
	} catch {
		return null;
	}
}

let defaultSignature: Promise<number | null> | undefined;

function getDefaultFaviconSignature(): Promise<number | null> {
	defaultSignature ??= new Promise(resolve => {
		const image = new Image();
		image.onload = () => resolve(imageSignature(image));
		image.onerror = () => resolve(null);
		// A page Chrome cannot have an icon for, so it answers with its placeholder.
		image.src = getBrowserFaviconUrl("https://nicer-tab.invalid/");
	});
	return defaultSignature;
}

/**
 * Chrome's favicon endpoint never fails: for sites it has no icon cached for it
 * returns a generic globe. Comparing against that placeholder lets the better
 * fallbacks (Google, then a letter) take over.
 */
export async function isPlaceholderBrowserFavicon(image: HTMLImageElement): Promise<boolean> {
	const placeholder = await getDefaultFaviconSignature();
	return placeholder !== null && imageSignature(image) === placeholder;
}

/**
 * Google's favicon service answers unknown sites with a 16x16 globe (and a 404 the
 * page cannot read). It is cross-origin, so its pixels cannot be compared; the
 * size gives it away instead. Real icons that small would be blurry at card size,
 * so losing them to the letter avatar is no great loss.
 */
export function isPlaceholderGoogleFavicon(image: HTMLImageElement): boolean {
	return image.naturalWidth <= 16 && image.naturalHeight <= 16;
}
