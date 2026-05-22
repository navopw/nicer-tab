import { getDomainFromUrl } from "../types/bookmark";
import { getFaviconOverride } from "./favicon-storage";

export interface FaviconCandidate {
	key: string;
	type: "image" | "letter";
	src?: string;
	letter?: string;
}

// Get favicon URL from Google's service (max 256px)
export function getGoogleFaviconUrl(domain: string, size: number = 256): string {
	return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

export function getExtensionFaviconUrl(pageUrl: string, size: number = 256): string {
	return chrome.runtime.getURL(`_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${size}`);
}

export async function getBookmarkFaviconCandidates(params: {
	bookmarkId: string;
	url?: string;
	title: string;
	size?: number;
}): Promise<FaviconCandidate[]> {
	const { bookmarkId, url, title, size = 256 } = params;
	const candidates: FaviconCandidate[] = [];
	const firstLetter = (title || "?").trim().charAt(0).toUpperCase() || "?";

	const override = await getFaviconOverride(bookmarkId);
	if (override?.value) {
		candidates.push({
			key: `${override.type}:${override.value}`,
			type: "image",
			src: override.value
		});
	}

	if (url) {
		candidates.push({
			key: `extension:${url}:${size}`,
			type: "image",
			src: getExtensionFaviconUrl(url, size)
		});

		const domain = getDomainFromUrl(url);
		if (domain) {
			candidates.push({
				key: `google:${domain}:${size}`,
				type: "image",
				src: getGoogleFaviconUrl(domain, size)
			});
		}
	}

	candidates.push({
		key: `letter:${firstLetter}`,
		type: "letter",
		letter: firstLetter
	});

	const seen = new Set<string>();
	return candidates.filter(candidate => {
		const identity = candidate.type === "image" ? candidate.src : candidate.letter;
		if (!identity || seen.has(identity)) return false;
		seen.add(identity);
		return true;
	});
}
