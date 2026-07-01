"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Phase = "idle" | "running" | "done";

// Thin top progress bar that provides immediate feedback on navigation.
// Starts on anchor clicks and programmatic pushState; completes when the
// new pathname commits. No external dependency — pure CSS transitions.
export default function NavigationProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const mountedRef = useRef(false);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start bar on anchor clicks for immediate per-interaction feedback.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank") return;
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        )
          return;
      } catch {
        return;
      }
      setPhase("running");
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  // Also intercept programmatic navigation (router.push / router.replace).
  useEffect(() => {
    const orig = history.pushState;
    history.pushState = function (state, title, url) {
      setPhase("running");
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
      return orig.call(history, state, title, url);
    };
    return () => {
      history.pushState = orig;
    };
  }, []);

  // Complete bar when pathname commits (route resolved).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    setPhase("done");
    doneTimerRef.current = setTimeout(() => setPhase("idle"), 450);
    return () => {
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    };
  }, [pathname]);

  // The bar is always in the DOM to avoid layout shifts; opacity hides it
  // when idle. Using identical transition for idle+running lets CSS animate
  // width 0%→75% when running starts.
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 bg-primary"
      style={{
        opacity: phase === "idle" ? 0 : 1,
        width: phase === "done" ? "100%" : phase === "running" ? "75%" : "0%",
        transition:
          phase === "done"
            ? "width 0.1s linear, opacity 0.35s ease 0.1s"
            : "width 2s cubic-bezier(0.05, 0.8, 0.5, 1), opacity 0.1s ease",
      }}
    />
  );
}
