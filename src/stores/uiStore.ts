import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { chromeStorage } from "../lib/chrome-storage";
import type { CardSize, ThemeMode } from "../types/bookmark";

/** Everything the user can configure; this is what is persisted and exported. */
export interface UISettings {
	theme: ThemeMode;
	cardSize: CardSize;
	sidebarWidth: number;
	showFolderBookmarkCount: boolean;
	accentColor: string;
	/** Open bookmarks in a new tab instead of replacing the new tab page. */
	openInNewTab: boolean;
	/** Ask Google's favicon service for icons the browser has not cached. */
	useGoogleFavicons: boolean;
}

interface UIState extends UISettings {
	setTheme: (theme: ThemeMode) => void;
	setCardSize: (size: CardSize) => void;
	setSidebarWidth: (width: number) => void;
	setShowFolderBookmarkCount: (show: boolean) => void;
	setAccentColor: (color: string) => void;
	setOpenInNewTab: (openInNewTab: boolean) => void;
	setUseGoogleFavicons: (useGoogleFavicons: boolean) => void;
	applySettings: (settings: Partial<UISettings>) => void;
}

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_DEFAULT_WIDTH = 256;
const STARTUP_THEME_KEY = "nicer-tab-startup-theme";
const STARTUP_ACCENT_KEY = "nicer-tab-startup-accent";
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function getStartupTheme(): ThemeMode {
	if (typeof window === "undefined") return "system";
	try {
		const cached = window.localStorage.getItem(STARTUP_THEME_KEY);
		if (cached === "light" || cached === "dark" || cached === "system") {
			return cached;
		}
	} catch {
		// Ignore localStorage access errors (private mode/policy restrictions)
	}
	return "system";
}

function getStartupAccent(): string {
	if (typeof window === "undefined") return "#3B82F6";
	try {
		const cached = window.localStorage.getItem(STARTUP_ACCENT_KEY);
		if (cached && HEX_COLOR.test(cached)) {
			return cached.toUpperCase();
		}
	} catch {
		// Ignore localStorage access errors (private mode/policy restrictions)
	}
	return "#3B82F6";
}

function cacheStartupTheme(theme: ThemeMode) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STARTUP_THEME_KEY, theme);
	} catch {
		// Ignore localStorage access errors (private mode/policy restrictions)
	}
}

function cacheStartupAccent(color: string) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STARTUP_ACCENT_KEY, color);
	} catch {
		// Ignore localStorage access errors (private mode/policy restrictions)
	}
}

/** "#f80" becomes "#FF8800", so every stored colour has the same shape. */
function normalizeHexColor(color: string): string {
	const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
	return (short ? `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}` : color).toUpperCase();
}

function clampSidebarWidth(width: number): number {
	return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}

/** Keep only well-formed settings from an untrusted object, such as an imported backup. */
export function sanitizeUISettings(input: unknown): Partial<UISettings> {
	if (!input || typeof input !== "object") return {};
	const raw = input as Record<string, unknown>;
	const settings: Partial<UISettings> = {};

	if (raw.theme === "system" || raw.theme === "light" || raw.theme === "dark") settings.theme = raw.theme;
	if (raw.cardSize === "small" || raw.cardSize === "medium" || raw.cardSize === "large") {
		settings.cardSize = raw.cardSize;
	}
	if (typeof raw.sidebarWidth === "number" && Number.isFinite(raw.sidebarWidth)) {
		settings.sidebarWidth = clampSidebarWidth(raw.sidebarWidth);
	}
	if (typeof raw.accentColor === "string") {
		const accentColor = normalizeHexColor(raw.accentColor);
		if (HEX_COLOR.test(accentColor)) settings.accentColor = accentColor;
	}
	for (const key of ["showFolderBookmarkCount", "openInNewTab", "useGoogleFavicons"] as const) {
		if (typeof raw[key] === "boolean") settings[key] = raw[key];
	}

	return settings;
}

export function getUISettings(state: UISettings = useUIStore.getState()): UISettings {
	return {
		theme: state.theme,
		cardSize: state.cardSize,
		sidebarWidth: state.sidebarWidth,
		showFolderBookmarkCount: state.showFolderBookmarkCount,
		accentColor: state.accentColor,
		openInNewTab: state.openInNewTab,
		useGoogleFavicons: state.useGoogleFavicons
	};
}

export const useUIStore = create<UIState>()(
	persist(
		set => ({
			theme: getStartupTheme(),
			cardSize: "medium",
			sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
			showFolderBookmarkCount: true,
			accentColor: getStartupAccent(),
			openInNewTab: false,
			useGoogleFavicons: true,
			setTheme: theme => {
				cacheStartupTheme(theme);
				set({ theme });
			},
			setCardSize: size => set({ cardSize: size }),
			setSidebarWidth: width => set({ sidebarWidth: clampSidebarWidth(width) }),
			setShowFolderBookmarkCount: show => set({ showFolderBookmarkCount: show }),
			setAccentColor: color => {
				const accentColor = normalizeHexColor(color);
				cacheStartupAccent(accentColor);
				set({ accentColor });
			},
			setOpenInNewTab: openInNewTab => set({ openInNewTab }),
			setUseGoogleFavicons: useGoogleFavicons => set({ useGoogleFavicons }),
			applySettings: settings => {
				if (settings.theme) cacheStartupTheme(settings.theme);
				if (settings.accentColor) cacheStartupAccent(settings.accentColor);
				set(settings);
			}
		}),
		{
			name: "nicer-tab-ui",
			storage: createJSONStorage(() => chromeStorage),
			partialize: state => getUISettings(state),
			// Ignore keys that older versions persisted, e.g. `sidebarCollapsed`.
			merge: (persisted, current) => ({ ...current, ...sanitizeUISettings(persisted) }),
			onRehydrateStorage: () => state => {
				if (!state) return;
				cacheStartupTheme(state.theme);
				cacheStartupAccent(state.accentColor);
			}
		}
	)
);

// Helper to apply theme to document
export function applyTheme(theme: ThemeMode) {
	const root = document.documentElement;

	if (theme === "system") {
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		root.classList.toggle("dark", prefersDark);
	} else {
		root.classList.toggle("dark", theme === "dark");
	}
}

// Listen for system theme changes
export function setupThemeListener(getTheme: () => ThemeMode) {
	const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

	const handleChange = () => {
		if (getTheme() === "system") {
			applyTheme("system");
		}
	};

	mediaQuery.addEventListener("change", handleChange);
	return () => mediaQuery.removeEventListener("change", handleChange);
}

// Default accent color
export const DEFAULT_ACCENT_COLOR = "#3B82F6";

// Predefined accent color presets
export const ACCENT_COLOR_PRESETS = [
	{ name: "Blue", color: "#3B82F6" },
	{ name: "Purple", color: "#8B5CF6" },
	{ name: "Green", color: "#10B981" },
	{ name: "Red", color: "#EF4444" },
	{ name: "Orange", color: "#F59E0B" },
	{ name: "Pink", color: "#EC4899" },
	{ name: "Cyan", color: "#06B6D4" },
	{ name: "Indigo", color: "#6366F1" }
];

// Helper to generate hover color (darken for light mode feel, lighten for dark mode feel)
function adjustColor(hex: string, amount: number): string {
	const num = parseInt(hex.slice(1), 16);
	const r = Math.min(255, Math.max(0, (num >> 16) + amount));
	const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
	const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
	return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Apply accent color to CSS variables
export function applyAccentColor(color: string) {
	const root = document.documentElement;
	root.style.setProperty("--accent-color", color);
	// Generate hover variants
	root.style.setProperty("--accent-hover-dark", adjustColor(color, -30)); // Darker for light mode hover
	root.style.setProperty("--accent-hover-light", adjustColor(color, 40)); // Lighter for dark mode hover
}
