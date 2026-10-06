import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { PageSecondaryNavProvider } from "@/contexts/PageSecondaryNavContext";
import { ThemeStorageSync } from "@/components/app/ThemeStorageSync";
import { AppCrashBoundary } from "@/components/app/AppCrashBoundary";
import { PublicCiviHost } from "@/components/public/PublicCiviHost";
import { PendingAuthReturnRedirect } from "@/components/auth/PendingAuthReturnRedirect";
import { permissionListHas } from "@/lib/access-control";
import { lazyWithChunkReload } from "@/lib/lazy-with-chunk-reload";
import { appRoutes1 } from "@/app-routes/app-routes-1";
import { appRoutes2 } from "@/app-routes/app-routes-2";
import { appRoutesSupport } from "@/app-routes/app-routes-support";
import { RouteErrorBoundary } from "@/components/app/RouteErrorBoundary";
import { NotFound } from "@/app-routes/lazy-pages";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

// Pages (lazy-loaded to keep bundle sizes small). lazyWithChunkReload auto-recovers
// when a deploy removes hashed chunks the open tab still references.
const AppUpdatePrompt = lazyWithChunkReload(() => import('@/components/app/AppUpdatePrompt').then((module) => ({ default: module.AppUpdatePrompt })));
const BuildOverlay = lazyWithChunkReload(() => import('@/components/layout/BuildOverlay').then((module) => ({ default: module.BuildOverlay })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
const BUILD_OVERLAY_STORAGE_KEY = 'civizen-build-overlay-enabled-v1';

function RouteFallback() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
    </div>
  );
}

function scheduleAfterIdle(callback: () => void, fallbackDelay = 1200) {
  if (typeof window === 'undefined') return () => undefined;

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: fallbackDelay });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = globalThis.setTimeout(callback, fallbackDelay);
  return () => globalThis.clearTimeout(timeoutId);
}

function DeferredAppUpdatePrompt() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => scheduleAfterIdle(() => setShouldLoad(true), 1500), []);

  if (!shouldLoad) return null;

  return (
    <Suspense fallback={null}>
      <AppUpdatePrompt />
    </Suspense>
  );
}

function DeferredGlobalFeedback() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => scheduleAfterIdle(() => setShouldLoad(true), 900), []);

  if (!shouldLoad) return null;

  // Toaster/Sonner are part of the main graph (not lazy chunks) so a post-deploy
  // open tab cannot fail solely on a missing toaster-*.js hash at first paint.
  return (
    <>
      <Toaster />
      <Sonner />
    </>
  );
}

function BuildOverlayLoader() {
  const { profile } = useAuth();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canUseBuildOverlay = permissionListHas(profile?.effective_permissions || [], 'build.use');
    if (!canUseBuildOverlay) return;

    const params = new URLSearchParams(window.location.search);
    const buildModeRequested = params.get('build') === '1';
    const persistedMode = window.localStorage.getItem(BUILD_OVERLAY_STORAGE_KEY) === '1';

    if (buildModeRequested || persistedMode) {
      setShouldLoad(true);
      if (buildModeRequested) {
        window.localStorage.setItem(BUILD_OVERLAY_STORAGE_KEY, '1');
      }
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.shiftKey && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b')) {
        return;
      }

      event.preventDefault();
      window.localStorage.setItem(BUILD_OVERLAY_STORAGE_KEY, '1');
      setShouldLoad(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile?.effective_permissions]);

  if (!shouldLoad) return null;

  return (
    <Suspense fallback={null}>
      <BuildOverlay />
    </Suspense>
  );
}

const App = () => (
  <AppCrashBoundary>
    <MotionConfig reducedMotion="user">
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="civizen-theme-v1">
        <ThemeStorageSync />
        <TooltipProvider>
          <AuthProvider>
            <LanguageProvider>
              <DeferredGlobalFeedback />
              <DeferredAppUpdatePrompt />
              <BrowserRouter>
                <PageSecondaryNavProvider>
                <RouteErrorBoundary>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    {appRoutes1}
                    {appRoutes2}
                    {appRoutesSupport}
                  {/* Fallback */}
                  <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </RouteErrorBoundary>
                <PendingAuthReturnRedirect />
                <PublicCiviHost />
                <BuildOverlayLoader />
                </PageSecondaryNavProvider>
              </BrowserRouter>
            </LanguageProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </MotionConfig>
  </AppCrashBoundary>
);

export default App;
