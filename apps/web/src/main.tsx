import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./ui/App";
import { ThemeProvider } from "./ui/theme/theme-provider";
import "./ui/styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
