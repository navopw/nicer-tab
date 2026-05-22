import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import type { CardSize, ThemeMode } from "../types/bookmark";

interface UIState {
	theme: ThemeMode;
	cardSize: CardSize;
	sidebarCollapsed: boolean;
	sidebarWidth: number;
	showFolderBookmarkCount: boolean;
	accentColor: string;
	setTheme: (theme: ThemeMode) => void;
	setCardSize: (size: CardSize) => void;
	setSidebarCollapsed: (collapsed: boolean) => void;
	setSidebarWidth: (width: number) => void;
	setShowFolderBookmarkCount: (show: boolean) => void;
	setAccentColor: (color: string) => void;
}

export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_MAX_WIDTH = 400;
export const SIDEBAR_DEFAULT_WIDTH = 256;
const STARTUP_THEME_KEY = "nicer-tab-startup-theme";
const STARTUP_ACCENT_KEY = "nicer-tab-startup-accent";

// Chrome storage adapter for Zustand
const chromeStorage: StateStorage = {
	getItem: async (name: string): Promise<string | null> => {
		const result = await chrome.storage.local.get(name);
		const value = result[name];
		return typeof value === "string" ? value : null;
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await chrome.storage.local.set({ [name]: value });
	},
	removeItem: async (name: string): Promise<void> => {
		await chrome.storage.local.remove(name);
	}
};

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
		if (cached && /^#[0-9a-fA-F]{6}$/.test(cached)) {
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

export const useUIStore = create<UIState>()(
	persist(
		set => ({
			theme: getStartupTheme(),
			cardSize: "medium",
			sidebarCollapsed: false,
			sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
			showFolderBookmarkCount: true,
			accentColor: getStartupAccent(),
			setTheme: theme => {
				cacheStartupTheme(theme);
				set({ theme });
			},
			setCardSize: size => set({ cardSize: size }),
			setSidebarCollapsed: collapsed => set({ sidebarCollapsed: collapsed }),
			setSidebarWidth: width =>
				set({ sidebarWidth: Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH) }),
			setShowFolderBookmarkCount: show => set({ showFolderBookmarkCount: show }),
			setAccentColor: color => {
				cacheStartupAccent(color);
				set({ accentColor: color });
			}
		}),
		{
			name: "nicer-tab-ui",
			storage: createJSONStorage(() => chromeStorage),
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
