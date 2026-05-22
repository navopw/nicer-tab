import { useEffect, useState } from "react";
import type { BookmarkNode } from "../../types/bookmark";
import { Modal } from "./Modal";
import { getFaviconOverride, removeFaviconOverride, setFaviconOverride } from "../../lib/favicon-storage";

interface CustomizeFaviconModalProps {
	isOpen: boolean;
	onClose: () => void;
	bookmark: BookmarkNode | null;
}

function isValidCustomImageUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result || ""));
		reader.onerror = () => reject(new Error("failed to read image data"));
		reader.readAsDataURL(blob);
	});
}

async function downloadImageAsDataUrl(url: string): Promise<string> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error("failed to fetch image");
	}

	const contentType = response.headers.get("content-type") || "";
	if (!contentType.startsWith("image/")) {
		throw new Error("url does not point to an image");
	}

	const blob = await response.blob();
	return blobToDataUrl(blob);
}

export function CustomizeFaviconModal({ isOpen, onClose, bookmark }: CustomizeFaviconModalProps) {
	const [customUrl, setCustomUrl] = useState("");
	const [urlError, setUrlError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [activeSourceLabel, setActiveSourceLabel] = useState<string>("Default favicon chain");

	useEffect(() => {
		if (!isOpen || !bookmark) return;
		let canceled = false;

		setUrlError(null);

		getFaviconOverride(bookmark.id)
			.then(override => {
				if (canceled) return;
				if (!override) {
					setCustomUrl("");
					setActiveSourceLabel("Default favicon chain");
					return;
				}

				setCustomUrl(override.type === "custom_url" ? override.value : "");
				setActiveSourceLabel(override.type === "iconify" ? "Custom icon (Iconify)" : "Custom icon URL");
			})
			.catch(() => {
				if (canceled) return;
				setCustomUrl("");
				setActiveSourceLabel("Default favicon chain");
			});

		return () => {
			canceled = true;
		};
	}, [bookmark, isOpen]);

	const saveCustomUrl = async () => {
		if (!bookmark) return;
		const trimmed = customUrl.trim();
		if (!isValidCustomImageUrl(trimmed)) {
			setUrlError("Use a valid http(s) image URL");
			return;
		}

		setUrlError(null);
		setIsSaving(true);
		try {
			const cachedDataUrl = await downloadImageAsDataUrl(trimmed);
			await setFaviconOverride({
				bookmarkId: bookmark.id,
				type: "custom_url",
				value: cachedDataUrl,
				source: "manual"
			});
			onClose();
		} catch {
			setUrlError("Could not cache this image URL. Try another direct image link.");
		} finally {
			setIsSaving(false);
		}
	};

	const resetToDefault = async () => {
		if (!bookmark) return;
		setIsSaving(true);
		try {
			await removeFaviconOverride(bookmark.id);
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Customize Icon">
			<div className="space-y-5">
				<div>
					<p className="text-sm text-primary font-medium">{bookmark?.title || "Bookmark"}</p>
					<p className="text-xs text-tertiary mt-1">Current source: {activeSourceLabel}</p>
				</div>

				<div>
					<label htmlFor="custom-icon-url" className="block text-sm font-medium text-secondary mb-2">
						Paste a custom icon URL
					</label>
					<div className="flex gap-2">
						<input
							id="custom-icon-url"
							type="url"
							value={customUrl}
							onChange={e => {
								setCustomUrl(e.target.value);
								setUrlError(null);
							}}
							placeholder="https://example.com/icon.png"
							className="flex-1 px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
						/>
						<button
							onClick={saveCustomUrl}
							disabled={isSaving}
							className="px-3 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
						>
							Apply
						</button>
					</div>
					{urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
				</div>

				<div className="flex justify-between pt-1">
					<button
						onClick={resetToDefault}
						disabled={isSaving}
						className="px-3 py-2 text-secondary hover:text-primary hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
					>
						Reset to default
					</button>
					<button
						onClick={onClose}
						className="px-3 py-2 text-secondary hover:text-primary hover:bg-secondary rounded-lg transition-colors cursor-pointer"
					>
						Close
					</button>
				</div>
			</div>
		</Modal>
	);
}
