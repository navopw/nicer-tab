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
	{ id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
	{ id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> }
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>("general");

	return (
		<Modal isOpen={isOpen} onClose={onClose} title="Settings">
			{/* Tab Navigation */}
			<div className="flex mb-4 border-b border-theme">
				{tabs.map(tab => (
					<button
						key={tab.id}
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

			<div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
				{activeTab === "general" && <GeneralSettings onClose={onClose} />}
				{activeTab === "appearance" && <AppearanceSettings />}
			</div>
		</Modal>
	);
}
