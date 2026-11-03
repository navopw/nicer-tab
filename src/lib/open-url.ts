import { showErrorToast } from "../stores/toastStore";

export type OpenTarget = "current" | "new-tab" | "new-window";

/** Web pages can be linked to directly. Anything else (chrome://, file://, about:) needs the tabs API. */
export function isWebUrl(url: string): boolean {
	return /^https?:\/\//i.test(url);
}

/** Where a click should open a bookmark, following the usual browser modifier keys. */
export function openTargetFromEvent(
	event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; button?: number },
	openInNewTab: boolean
): OpenTarget {
	if (event.shiftKey) return "new-window";
	if (event.metaKey || event.ctrlKey || event.button === 1 || openInNewTab) return "new-tab";
	return "current";
}

export async function openUrl(url: string, target: OpenTarget): Promise<void> {
	if (/^javascript:/i.test(url)) {
		showErrorToast("Bookmarklets only run on regular web pages, not on the new tab page.");
		return;
	}

	try {
		if (target === "new-window") {
			await chrome.windows.create({ url });
		} else if (target === "new-tab") {
			await chrome.tabs.create({ url });
		} else if (isWebUrl(url)) {
			window.location.assign(url);
		} else {
			const tab = await chrome.tabs.getCurrent();
			await (tab?.id !== undefined ? chrome.tabs.update(tab.id, { url }) : chrome.tabs.update({ url }));
		}
	} catch (error) {
		showErrorToast(`Could not open ${url}`, error);
	}
}
