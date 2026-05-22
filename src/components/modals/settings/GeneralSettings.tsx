import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { useUIStore } from "../../../stores/uiStore";
import { exportBookmarks, importBookmarks } from "../../../lib/import-export";

interface GeneralSettingsProps {
	onClose: () => void;
}

export function GeneralSettings({ onClose }: GeneralSettingsProps) {
	const showFolderBookmarkCount = useUIStore(state => state.showFolderBookmarkCount);
	const setShowFolderBookmarkCount = useUIStore(state => state.setShowFolderBookmarkCount);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleExport = async () => {
		try {
			await exportBookmarks();
		} catch (error) {
			alert("Failed to export bookmarks");
		}
	};

	const handleImport = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			await importBookmarks(file, "merge");
			onClose();
			window.location.reload();
		} catch (error) {
			alert("Failed to import bookmarks");
		}
	};

	return (
		<div className="space-y-6">
			{/* Sidebar Section */}
			<div>
				<h3 className="text-sm font-medium text-secondary mb-3">Sidebar</h3>
				<div className="flex items-center justify-between">
					<div>
						<label className="text-sm text-primary">Show bookmark count</label>
						<p className="text-xs text-tertiary">Display bookmark count badge in folders</p>
					</div>
					<button
						onClick={() => setShowFolderBookmarkCount(!showFolderBookmarkCount)}
						className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
							showFolderBookmarkCount ? "bg-[var(--accent-color)]" : "bg-tertiary"
						}`}
					>
						<span
							className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
								showFolderBookmarkCount ? "translate-x-4" : ""
							}`}
						/>
					</button>
				</div>
			</div>

			{/* Import/Export Section */}
			<div>
				<h3 className="text-sm font-medium text-secondary mb-3">Data</h3>
				<div className="flex gap-3">
					<button
						onClick={handleExport}
						className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-theme text-primary hover:bg-sidebar-hover transition-colors cursor-pointer"
					>
						<Download className="w-4 h-4" />
						<span className="text-sm">Export</span>
					</button>
					<button
						onClick={handleImport}
						className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-theme text-primary hover:bg-sidebar-hover transition-colors cursor-pointer"
					>
						<Upload className="w-4 h-4" />
						<span className="text-sm">Import</span>
					</button>
				</div>
			</div>

			{/* Hidden file input */}
			<input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="hidden" />
		</div>
	);
}
