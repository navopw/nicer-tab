import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import type { BookmarkNode } from "../../types/bookmark";
import { Modal } from "./Modal";
import { BookmarkIcon } from "../bookmark-grid/BookmarkIcon";
import { removeFaviconOverrides, setFaviconOverride } from "../../lib/favicon-storage";
import { useFaviconStore } from "../../stores/faviconStore";

interface CustomizeFaviconModalProps {
	isOpen: boolean;
	onClose: () => void;
	bookmark: BookmarkNode | null;
}

/** Uploaded icons are scaled down to this many pixels per side before they are stored. */
const UPLOAD_SIZE = 128;

function isValidCustomImageUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("image failed to load"));
		image.src = src;
	});
}

/** Scale an image file down to a small PNG data URL that fits comfortably in extension storage. */
async function fileToIconDataUrl(file: File): Promise<string> {
	const objectUrl = URL.createObjectURL(file);
	try {
		const image = await loadImage(objectUrl);
		// SVGs without explicit dimensions report 0.
		const naturalWidth = image.naturalWidth || UPLOAD_SIZE;
		const naturalHeight = image.naturalHeight || UPLOAD_SIZE;
		const scale = Math.min(1, UPLOAD_SIZE / Math.max(naturalWidth, naturalHeight));

		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(naturalWidth * scale));
		canvas.height = Math.max(1, Math.round(naturalHeight * scale));
		const context = canvas.getContext("2d");
		if (!context) throw new Error("canvas unavailable");
		context.drawImage(image, 0, 0, canvas.width, canvas.height);
		return canvas.toDataURL("image/png");
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}

export function CustomizeFaviconModal({ isOpen, onClose, bookmark }: CustomizeFaviconModalProps) {
	const override = useFaviconStore(state => (bookmark ? state.overrides[bookmark.id] : undefined));
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [customUrl, setCustomUrl] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		setError(null);
		// Older versions stored remote icons as data URLs, which are not worth showing in the field.
		setCustomUrl(override?.type === "custom_url" && !override.value.startsWith("data:") ? override.value : "");
		// Only reset when the dialog opens, not when the icon changes underneath it.
	}, [isOpen, bookmark?.id]);

	const save = async (task: () => Promise<void>, failureMessage: string) => {
		setError(null);
		setIsSaving(true);
		try {
			await task();
			onClose();
		} catch {
			setError(failureMessage);
		} finally {
			setIsSaving(false);
		}
	};

	const applyUrl = (e: React.FormEvent) => {
		e.preventDefault();
		if (!bookmark) return;
		const url = customUrl.trim();
		if (!isValidCustomImageUrl(url)) {
			setError("Use a valid http(s) image URL");
			return;
		}

		void save(async () => {
			// Make sure it really is an image before replacing the current icon.
			await loadImage(url);
			await setFaviconOverride({ bookmarkId: bookmark.id, type: "custom_url", value: url, source: "manual" });
		}, "That address did not load as an image. Try a direct link to a .png, .svg or .ico file.");
	};

	const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file || !bookmark) return;

		void save(async () => {
			const dataUrl = await fileToIconDataUrl(file);
			await setFaviconOverride({ bookmarkId: bookmark.id, type: "upload", value: dataUrl, source: "upload" });
		}, "Could not read that image.");
	};

	const reset = () => {
		if (!bookmark) return;
		void save(() => removeFaviconOverrides([bookmark.id]), "Could not reset the icon.");
	};

	const currentSource = !override
		? "Website icon"
		: override.type === "upload"
			? "Uploaded image"
			: "Custom image URL";

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Customize Icon">
			<div className="space-y-5">
				<div className="flex items-center gap-3">
					<div className="w-12 h-12 flex items-center justify-center rounded-lg bg-secondary">
						{bookmark && <BookmarkIcon bookmark={bookmark} size={32} />}
					</div>
					<div className="min-w-0">
						<p className="text-sm text-primary font-medium truncate">{bookmark?.title || "Bookmark"}</p>
						<p className="text-xs text-tertiary mt-0.5">Current icon: {currentSource}</p>
					</div>
				</div>

				<form onSubmit={applyUrl}>
					<label htmlFor="custom-icon-url" className="block text-sm font-medium text-secondary mb-2">
						Image URL
					</label>
					<div className="flex gap-2">
						<input
							id="custom-icon-url"
							type="url"
							value={customUrl}
							onChange={e => {
								setCustomUrl(e.target.value);
								setError(null);
							}}
							placeholder="https://example.com/icon.png"
							className="flex-1 min-w-0 px-3 py-2 bg-secondary rounded-lg text-primary focus:outline-none"
							aria-invalid={error ? true : undefined}
							aria-describedby={error ? "custom-icon-error" : undefined}
						/>
						<button
							type="submit"
							disabled={isSaving || !customUrl.trim()}
							className="px-3 py-2 bg-[var(--accent-color)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 cursor-pointer"
						>
							Apply
						</button>
					</div>
				</form>

				<div>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={isSaving}
						className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-theme text-primary hover:bg-sidebar-hover transition-colors disabled:opacity-50 cursor-pointer"
					>
						<Upload className="w-4 h-4" aria-hidden="true" />
						<span className="text-sm">Upload an image</span>
					</button>
					<input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
				</div>

				{error && (
					<p id="custom-icon-error" className="text-xs text-red-500" role="alert">
						{error}
					</p>
				)}

				<div className="flex justify-between pt-1">
					<button
						type="button"
						onClick={reset}
						disabled={isSaving || !override}
						className="px-3 py-2 text-secondary hover:text-primary hover:bg-secondary rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
					>
						Reset to default
					</button>
					<button
						type="button"
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
