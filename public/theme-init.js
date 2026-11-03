// Runs before the first paint: applies the theme and accent colour cached by the
// app (see uiStore.ts), so a page in dark mode does not flash white while it loads.
// It is a plain script file because extension pages do not allow inline scripts.
(function () {
	try {
		var root = document.documentElement;
		var theme = localStorage.getItem("nicer-tab-startup-theme");
		var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		root.classList.toggle("dark", theme === "dark" || (theme !== "light" && prefersDark));

		var accent = localStorage.getItem("nicer-tab-startup-accent");
		if (accent && /^#[0-9a-fA-F]{6}$/.test(accent)) {
			root.style.setProperty("--accent-color", accent);
		}
	} catch (error) {
		// Storage can be unavailable; the app applies the theme itself once it loads.
	}
})();
