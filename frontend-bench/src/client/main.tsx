import "./styles.css";
import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import { applyTheme, readRoute, restoreLocal } from "./state.js";

restoreLocal();
applyTheme();
readRoute();
const root = document.getElementById("app");
if (root) createRoot(root).render(<App />);
