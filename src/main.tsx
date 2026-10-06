import { migrateLegacyBrandStorageKeys } from '@/lib/storage-brand-migration';
migrateLegacyBrandStorageKeys();

import { createRoot } from "react-dom/client";
import {
  clearChunkRecoveryFlag,
  getErrorMessage,
  isChunkLoadError,
  reloadForNewDeployment,
} from "@/lib/chunk-load-recovery";
import { reportError } from "@/lib/error-reporting";
import "./index.css";

declare global {
  interface Window {
    __CIVIZEN_BOOT_READY__?: () => void;
  }
}

function markBootReady() {
  if (typeof window === "undefined") return;
  window.__CIVIZEN_BOOT_READY__?.();
}

function attemptBootRecovery(reason: unknown) {
  if (!isChunkLoadError(reason)) return false;
  return reloadForNewDeployment(reason);
}

function renderFatalBootScreen(reason: unknown) {
  if (typeof document === "undefined") return;

  const message = getErrorMessage(reason);
  const root = document.getElementById("root");
  if (!root) return;
  const chunkStale = isChunkLoadError(reason);

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#050b12;color:#e8f2ff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
      <div style="width:100%;max-width:520px;border:1px solid rgba(88,117,146,.35);border-radius:24px;background:rgba(10,22,34,.92);padding:20px;">
        <h1 style="margin:0 0 8px 0;font-size:24px;line-height:1.2;">${chunkStale ? "Civizen updated" : "Civizen couldn't start"}</h1>
        <p style="margin:0 0 14px 0;font-size:14px;line-height:1.5;color:#aac2da;">
          ${chunkStale
            ? "A newer version of the site is available. Reload once to pick up the latest files."
            : "A startup error blocked the app from loading. Reload to recover. If this keeps happening, use the latest APK."}
        </p>
        <pre style="margin:0 0 16px 0;padding:12px;border-radius:14px;background:#07121e;color:#90adc9;white-space:pre-wrap;word-break:break-word;font-size:12px;line-height:1.4;">${message}</pre>
        <button id="civizen-startup-reload-btn" style="height:40px;border:0;border-radius:12px;background:#34d1c6;color:#02151f;font-weight:600;padding:0 16px;cursor:pointer;">
          Reload app
        </button>
      </div>
    </div>
  `;

  const reloadButton = document.getElementById("civizen-startup-reload-btn");
  reloadButton?.addEventListener("click", () => {
    clearChunkRecoveryFlag();
    if (!reloadForNewDeployment(reason)) {
      window.location.reload();
    }
  });
}

window.addEventListener("error", (event) => {
  if (attemptBootRecovery(event.error || event.message)) {
    event.preventDefault();
    return;
  }
  reportError(event.error || event.message, "window");
});

window.addEventListener("unhandledrejection", (event) => {
  if (attemptBootRecovery(event.reason)) {
    event.preventDefault();
    return;
  }
  reportError(event.reason, "promise");
});

async function bootstrapApp() {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root container #root was not found.");
    }

    // Prefetch English base strings while the App chunk downloads so LanguageProvider
    // can paint without a full-screen gate or raw translation keys.
    const [{ default: App }] = await Promise.all([
      import("./App.tsx"),
      import("@/lib/i18n.runtime").then((mod) => mod.loadBaseTranslations()),
    ]);
    // Signal boot progress before first paint so the HTML watchdog does not fire
    // while React commits a large tree on slow phones.
    markBootReady();
    createRoot(rootElement).render(<App />);
    clearChunkRecoveryFlag();
  } catch (error) {
    if (!attemptBootRecovery(error)) {
      renderFatalBootScreen(error);
    }
  }
}

void bootstrapApp();
