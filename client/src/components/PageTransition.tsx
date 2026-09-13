import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { PAGE_TRANSITION_DURATION_MS, shouldRunPageTransition } from "@/lib/pageTransition";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      return;
    }

    if (!shouldRunPageTransition(true, prefersReducedMotion)) {
      setIsTransitioning(false);
      return;
    }

    setIsTransitioning(true);
    const timer = window.setTimeout(() => setIsTransitioning(false), PAGE_TRANSITION_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [location, prefersReducedMotion]);

  return (
    <div className="page-transition-shell" data-page-location={location}>
      <div className="page-transition-content" key={location}>{children}</div>
      {isTransitioning && (
        <div className="page-transition-overlay" aria-hidden="true">
          <div className="page-transition-core">
            <span className="page-transition-orbit page-transition-orbit-one" />
            <span className="page-transition-orbit page-transition-orbit-two" />
            <span className="page-transition-signal" />
          </div>
        </div>
      )}
    </div>
  );
}
