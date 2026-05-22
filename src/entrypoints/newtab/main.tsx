import ReactDOM from "react-dom/client";
import App from "./App";
import "../../styles/globals.css";
import { useUIStore, applyTheme, applyAccentColor } from "../../stores/uiStore";

const { theme, accentColor } = useUIStore.getState();
applyTheme(theme);
applyAccentColor(accentColor);

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
