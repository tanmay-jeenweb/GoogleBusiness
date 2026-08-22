import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { PermissionProvider } from "./context/PermissionContext";
import { ThemeProvider } from "./context/ThemeContext";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(
    document.getElementById("root")
).render(

    <BrowserRouter>
        <PermissionProvider>
            <ThemeProvider>
                <App />
                <Toaster position="top-right" />
            </ThemeProvider>
        </PermissionProvider>
    </BrowserRouter>
);