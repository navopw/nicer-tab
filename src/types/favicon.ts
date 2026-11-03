/** `custom_url` points at a remote image (older versions stored a data URL here), `upload` is a resized data URL. */
export type FaviconOverrideType = "custom_url" | "upload";

export interface FaviconOverride {
	bookmarkId: string;
	type: FaviconOverrideType;
	value: string;
	source: "manual" | "upload";
	updatedAt: number;
}

export interface FaviconStorageState {
	overrides: Record<string, FaviconOverride>;
}
