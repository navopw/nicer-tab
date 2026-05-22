import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ["@wxt-dev/module-react"],
	srcDir: "src",
	outDir: "dist",
	manifest: ({ browser }) => ({
		name: "Nicer Tab",
		description: "A beautiful bookmark organizer for your new tab page",
		permissions: browser === "firefox" ? ["bookmarks", "storage"] : ["bookmarks", "storage", "favicon"]
	}),
	vite: () => ({
		plugins: [tailwindcss()]
	})
});
