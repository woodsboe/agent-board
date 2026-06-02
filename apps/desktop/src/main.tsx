import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider, defaultTheme } from "@adobe/react-spectrum";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { useAppStore } from "./store";
import "./styles.css";

const queryClient = new QueryClient();

function DesktopRoot() {
  const themeMode = useAppStore((state) => state.themeMode);

  return (
    <Provider theme={defaultTheme} colorScheme={themeMode} height="100vh">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DesktopRoot />
    </QueryClientProvider>
  </React.StrictMode>,
);
