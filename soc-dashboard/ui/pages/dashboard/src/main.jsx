import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import {
  useFalconApiContext,
  FalconApiContext,
} from "./contexts/falcon-api-context";
import { ThemeProvider } from "./contexts/theme-context";
import { WidgetStatusProvider } from "./contexts/widget-status-context";
import { Home } from "./routes/home";
import ReactDOM from "react-dom/client";
import './styles/index.css';
import { VERSION } from "./version";

// Version logging for debugging
console.log(`%c🚀 AGENTIC SOC Oversight Dashboard ${VERSION}`, 'color: #00ff00; font-weight: bold; font-size: 14px;');
console.log(`%c📦 Build: ${new Date().toISOString().split('T')[0]}`, 'color: #00aaff; font-size: 12px;');

function Root() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

function App() {
  const { falcon, navigation, isInitialized } = useFalconApiContext();

  if (!isInitialized) {
    return null;  // Wait for Falcon to connect
  }

  return (
    <React.StrictMode>
      <FalconApiContext.Provider value={{ falcon, navigation, isInitialized }}>
        <ThemeProvider>
          <WidgetStatusProvider>
            <HashRouter>
              <Root />
            </HashRouter>
          </WidgetStatusProvider>
        </ThemeProvider>
      </FalconApiContext.Provider>
    </React.StrictMode>
  );
}

const domContainer = document.querySelector("#app");
const root = ReactDOM.createRoot(domContainer);

root.render(<App />);
