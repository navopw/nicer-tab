import { useState } from "react";
import { Sun, Moon, Monitor, Palette, RotateCcw } from "lucide-react";
import { HexColorPicker, HexColorInput } from "react-colorful";
import { useUIStore, ACCENT_COLOR_PRESETS, DEFAULT_ACCENT_COLOR, applyAccentColor } from "../../../stores/uiStore";
import type { ThemeMode } from "../../../types/bookmark";

const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
	{ value: "system", label: "System", icon: <Monitor className="w-5 h-5" /> },
	{ value: "light", label: "Light", icon: <Sun className="w-5 h-5" /> },
	{ value: "dark", label: "Dark", icon: <Moon className="w-5 h-5" /> }
];

export function AppearanceSettings() {
	const theme = useUIStore(state => state.theme);
	const setTheme = useUIStore(state => state.setTheme);
	const accentColor = useUIStore(state => state.accentColor);
	const setAccentColor = useUIStore(state => state.setAccentColor);

	const [showColorPicker, setShowColorPicker] = useState(false);

	const handleAccentColorChange = (color: string) => {
		setAccentColor(color);
		applyAccentColor(color);
	};

	const handleResetAccentColor = () => {
		handleAccentColorChange(DEFAULT_ACCENT_COLOR);
	};

	return (
		<div className="space-y-6">
			{/* Theme Section */}
			<div>
				<h3 className="text-sm font-medium text-secondary mb-3">Theme</h3>
				<div className="flex gap-2">
					{themeOptions.map(option => (
						<button
							key={option.value}
							onClick={() => setTheme(option.value)}
							className={`
								flex-1 flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors cursor-pointer
								${
									theme === option.value
										? "border-[var(--accent-color)] bg-[var(--accent-color)]/10 text-[var(--accent-color)]"
										: "border-theme text-secondary hover:bg-sidebar-hover hover:text-primary"
								}
							`}
						>
							{option.icon}
							<span className="text-sm">{option.label}</span>
						</button>
					))}
				</div>
			</div>

			{/* Accent Color Section */}
			<div>
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-medium text-secondary">Accent Color</h3>
					{accentColor.toLowerCase() !== DEFAULT_ACCENT_COLOR.toLowerCase() && (
						<button
							onClick={handleResetAccentColor}
							className="flex items-center gap-1 text-xs text-tertiary hover:text-primary transition-colors cursor-pointer"
							title="Reset to default"
						>
							<RotateCcw className="w-3 h-3" />
							Reset
						</button>
					)}
				</div>

				{/* Preset Colors */}
				<div className="grid grid-cols-8 gap-2 mb-3 ml-1">
					{ACCENT_COLOR_PRESETS.map(preset => (
						<button
							key={preset.color}
							onClick={() => handleAccentColorChange(preset.color)}
							className={`aspect-square rounded-lg transition-all cursor-pointer ${
								accentColor.toLowerCase() === preset.color.toLowerCase() &&
								"ring-2 ring-offset-2 ring-[var(--accent-color)] ring-offset-[var(--bg-primary)]"
							}`}
							style={{ backgroundColor: preset.color }}
							title={preset.name}
						/>
					))}
				</div>

				{/* Custom Color Input */}
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<span className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm">#</span>
						<HexColorInput
							color={accentColor}
							onChange={handleAccentColorChange}
							className="w-full pl-7 pr-3 py-2 rounded-lg border border-theme bg-secondary text-primary text-sm uppercase focus:outline-none focus:border-[var(--accent-color)]"
							prefixed={false}
						/>
					</div>
					<button
						onClick={() => setShowColorPicker(!showColorPicker)}
						className={`p-2 rounded-lg border transition-colors cursor-pointer ${
							showColorPicker
								? "border-[var(--accent-color)] bg-[var(--accent-color)]/10"
								: "border-theme hover:bg-sidebar-hover"
						}`}
						title="Color picker"
					>
						<Palette className="w-5 h-5" style={{ color: accentColor }} />
					</button>
				</div>

				{/* Color Picker Dropdown */}
				{showColorPicker && (
					<div className="mt-3 p-3 rounded-lg border border-theme bg-secondary">
						<HexColorPicker
							color={accentColor}
							onChange={handleAccentColorChange}
							style={{ width: "100%" }}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
