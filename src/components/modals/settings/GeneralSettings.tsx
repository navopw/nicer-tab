import { useRef, useState } from "react";
import { Download, FileCode, Upload } from "lucide-react";
import { useUIStore } from "../../../stores/uiStore";
import { showErrorToast, showToast } from "../../../stores/toastStore";
import {
	exportBookmarksHtml,
	exportBookmarksJson,
	importBookmarksFile,
	type ImportResult
} from "../../../lib/import-export";
import { Switch } from "../../common/Switch";

function describeImport(result: ImportResult): string {
	const parts = [`Imported ${result.created} bookmark${result.created === 1 ? "" : "s"}`];
	if (result.skipped > 0) parts.push(`skipped ${result.skipped} already saved`);
	if (result.failed > 0) parts.push(`${result.failed} could not be added`);
	const summary = parts.join(", ");
	return result.settingsRestored ? `${summary}. Settings restored.` : `${summary}.`;
}

const dataButtonClass =
	"flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-theme text-primary hover:bg-sidebar-hover transition-colors disabled:opacity-50 cursor-pointer";

export function GeneralSettings() {
	const openInNewTab = useUIStore(state => state.openInNewTab);
	const setOpenInNewTab = useUIStore(state => state.setOpenInNewTab);
	const showFolderBookmarkCount = useUIStore(state => state.showFolderBookmarkCount);
	const setShowFolderBookmarkCount = useUIStore(state => state.setShowFolderBookmarkCount);
	const useGoogleFavicons = useUIStore(state => state.useGoogleFavicons);
	const setUseGoogleFavicons = useUIStore(state => state.setUseGoogleFavicons);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isImporting, setIsImporting] = useState(false);

	const runExport = async (task: () => Promise<void>) => {
		try {
			await task();
		} catch (error) {
			showErrorToast("Export failed", error);
		}
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;

		setIsImporting(true);
		try {
			showToast({ message: describeImport(await importBookmarksFile(file)) });
		} catch (error) {
			showErrorToast(error instanceof Error ? `Import failed: ${error.message}` : "Import failed", error);
		} finally {
			setIsImporting(false);
		}
	};

	return (
		<div className="space-y-6">
			<section>
				<h3 className="text-sm font-medium text-secondary mb-3">Bookmarks</h3>
				<Switch
					label="Open in a new tab"
					description="Otherwise bookmarks replace this page. Cmd/Ctrl-click always opens a new tab."
					checked={openInNewTab}
					onChange={setOpenInNewTab}
				/>
			</section>

			<section>
				<h3 className="text-sm font-medium text-secondary mb-3">Sidebar</h3>
				<Switch
					label="Show bookmark count"
					description="Display bookmark count badge in folders"
					checked={showFolderBookmarkCount}
					onChange={setShowFolderBookmarkCount}
				/>
			</section>

			<section>
				<h3 className="text-sm font-medium text-secondary mb-3">Privacy</h3>
				<Switch
					label="Fetch missing icons from Google"
					description="Sends a site's domain to Google's favicon service when the browser has no icon for it. Off shows a letter instead."
					checked={useGoogleFavicons}
					onChange={setUseGoogleFavicons}
				/>
			</section>

			<section>
				<h3 className="text-sm font-medium text-secondary mb-1">Data</h3>
				<p className="text-xs text-tertiary mb-3">
					Imports are added to your bookmarks; anything you already have is skipped.
				</p>
				<div className="space-y-3">
					<div className="flex gap-3">
						<button
							type="button"
							onClick={() => runExport(exportBookmarksJson)}
							className={dataButtonClass}
							title="Bookmarks, settings and custom icons"
						>
							<Download className="w-4 h-4" aria-hidden="true" />
							<span className="text-sm">Back up (.json)</span>
						</button>
						<button
							type="button"
							onClick={() => runExport(exportBookmarksHtml)}
							className={dataButtonClass}
							title="A bookmark file other browsers can import"
						>
							<FileCode className="w-4 h-4" aria-hidden="true" />
							<span className="text-sm">Export (.html)</span>
						</button>
					</div>
					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={isImporting}
						className={`w-full ${dataButtonClass}`}
					>
						<Upload className="w-4 h-4" aria-hidden="true" />
						<span className="text-sm">{isImporting ? "Importing..." : "Import (.json or .html)"}</span>
					</button>
				</div>
			</section>

			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				accept=".json,.html,.htm,application/json,text/html"
				onChange={handleFileChange}
				className="hidden"
			/>
		</div>
	);
}
