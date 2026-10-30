import { useState } from "react";
import { Settings, Palette } from "lucide-react";
import { Modal } from "./Modal";
import { GeneralSettings } from "./settings/GeneralSettings";
import { AppearanceSettings } from "./settings/AppearanceSettings";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

type SettingsTab = "general" | "appearance";

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
	{ id: "general", label: "General", icon: <Settings className="w-4 h-4" aria-hidden="true" /> },
	{ id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" aria-hidden="true" /> }
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>("general");

	// Arrow keys move between tabs, as in any tab list.
	const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
		e.preventDefault();
		const index = tabs.findIndex(tab => tab.id === activeTab);
		const next = tabs[(index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
		if (!next) return;
		setActiveTab(next.id);
		document.getElementById(`settings-tab-${next.id}`)?.focus();
	};

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Settings">
			{/* Tab Navigation */}
			<div
				role="tablist"
				aria-label="Settings sections"
				className="flex mb-4 border-b border-theme"
				onKeyDown={handleTabKeyDown}
			>
				{tabs.map(tab => (
					<button
						key={tab.id}
						id={`settings-tab-${tab.id}`}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.id}
						aria-controls="settings-panel"
						tabIndex={activeTab === tab.id ? 0 : -1}
						onClick={() => setActiveTab(tab.id)}
						className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
							activeTab === tab.id
								? "border-[var(--accent-color)] text-[var(--accent-color)]"
								: "border-transparent text-secondary hover:text-primary"
						}`}
					>
						{tab.icon}
						{tab.label}
					</button>
				))}
			</div>

			<div
				id="settings-panel"
				role="tabpanel"
				aria-labelledby={`settings-tab-${activeTab}`}
				className="max-h-[60vh] overflow-y-auto pr-2 -mr-2"
			>
				{activeTab === "general" && <GeneralSettings />}
				{activeTab === "appearance" && <AppearanceSettings />}
			</div>
		</Modal>
	);
}
