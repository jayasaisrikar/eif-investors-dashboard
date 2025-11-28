import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log('eif:client:main:boot');
createRoot(document.getElementById("root")!).render(<App />);
