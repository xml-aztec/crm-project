import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { HelmetProvider } from "react-helmet-async";
import { store, persistor } from "./store/store";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

// Инициализация продакшн утилит
import "./utils/production-utils";
import { validateEnvironment } from "./utils/production-utils";

// Валидируем окружение при запуске
try {
  validateEnvironment();
} catch (error) {
  if (import.meta.env.DEV) {
    console.error("Environment validation failed:", error);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <App />
          </PersistGate>
        </Provider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);