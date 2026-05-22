export type FaviconOverrideType = "custom_url" | "iconify";

export interface FaviconOverride {
	bookmarkId: string;
	type: FaviconOverrideType;
	value: string;
	source: "manual" | "iconify-search";
	updatedAt: number;
}

export interface FaviconStorageState {
	overrides: Record<string, FaviconOverride>;
}
