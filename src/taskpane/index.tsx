import React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
// import App from "./App";
 
function render() {
  const container = document.getElementById("container");
  if (container) {
    const root = createRoot(container);
    root.render(<App />);
  } else {
    console.error("Container not found");
  }
}
 
// Wait until Office is ready before rendering React
if (window.Office) {
  Office.onReady(() => {
    render();
  });
} else {
  console.warn("Office.js not found — running outside of Office");
  render(); // optional fallback if testing locally in browser
}