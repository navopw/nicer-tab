import { useMemo, useReducer } from "react";
import { getDomainFromUrl, type BookmarkNode } from "../../types/bookmark";
import {
	getBookmarkFaviconCandidates,
	isPlaceholderBrowserFavicon,
	isPlaceholderGoogleFavicon,
	letterHue,
	type FaviconCandidate
} from "../../lib/favicon";
import { useFaviconStore } from "../../stores/faviconStore";
import { useUIStore } from "../../stores/uiStore";

// Remembered for the lifetime of the page, so revisiting a folder does not walk
// through broken sources or re-check placeholders again.
const failedSources = new Set<string>();
const verifiedSources = new Set<string>();

/** Whether a loaded image is a real icon rather than the source's "no icon" placeholder. */
async function isRealIcon(candidate: FaviconCandidate, image: HTMLImageElement): Promise<boolean> {
	if (candidate.source === "browser") return !(await isPlaceholderBrowserFavicon(image));
	if (candidate.source === "google") return !isPlaceholderGoogleFavicon(image);
	return true;
}

interface BookmarkIconProps {
	bookmark: BookmarkNode;
	/** Rendered size in CSS pixels. */
	size: number;
}

/** A bookmark's icon: a custom one, the browser's cached favicon, Google's, or a coloured letter. */
export function BookmarkIcon({ bookmark, size }: BookmarkIconProps) {
	const override = useFaviconStore(state => state.overrides[bookmark.id]);
	const useGoogle = useUIStore(state => state.useGoogleFavicons);
	const [, rerender] = useReducer((count: number) => count + 1, 0);

	const domain = bookmark.url ? getDomainFromUrl(bookmark.url) : "";
	const candidates = useMemo(
		() => getBookmarkFaviconCandidates({ url: bookmark.url, title: bookmark.title, override, useGoogle }),
		[bookmark.url, bookmark.title, override, useGoogle]
	);
	const candidate = candidates.find(item => item.source === "letter" || !failedSources.has(item.key));

	if (!candidate || candidate.source === "letter") {
		const letter = candidate?.letter ?? "?";
		return (
			<span
				className="letter-avatar flex items-center justify-center rounded-lg font-semibold select-none"
				style={
					{
						width: size,
						height: size,
						fontSize: size * 0.45,
						"--letter-hue": letterHue(domain || bookmark.title)
					} as React.CSSProperties
				}
				aria-hidden="true"
			>
				{letter}
			</span>
		);
	}

	const fail = () => {
		failedSources.add(candidate.key);
		rerender();
	};

	// Chrome and Google answer unknown sites with a placeholder globe; hide it until it is ruled out.
	const needsCheck = candidate.source !== "override" && !verifiedSources.has(candidate.key);

	return (
		<img
			key={candidate.key}
			src={candidate.src}
			alt=""
			width={size}
			height={size}
			className="object-contain"
			style={needsCheck ? { opacity: 0 } : undefined}
			draggable={false}
			loading="lazy"
			onError={fail}
			onLoad={event => {
				if (!needsCheck) return;
				void isRealIcon(candidate, event.currentTarget).then(isReal => {
					if (!isReal) {
						fail();
						return;
					}
					verifiedSources.add(candidate.key);
					rerender();
				});
			}}
		/>
	);
}
