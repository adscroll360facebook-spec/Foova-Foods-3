import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Keep-alive: ping the Render backend every 5 minutes to prevent cold starts
const BACKEND_URL = import.meta.env.VITE_API_URL || "https://foova-foods-3.onrender.com";
const pingBackend = () => {
    fetch(`${BACKEND_URL}/api/ping`, { method: "GET", cache: "no-store" })
        .catch(() => { }); // silent fail — just keeping the server warm
};
// Ping immediately on load (warms up Render) + every 4 minutes
pingBackend();
setInterval(pingBackend, 4 * 60 * 1000);

createRoot(document.getElementById("root")!).render(<App />);
