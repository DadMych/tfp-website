"use client";

import { useEffect } from "react";
import Script from "next/script";

const CSS_HREF = "https://assets.calendly.com/assets/external/widget.css";

/**
 * Loads Calendly's stylesheet after the page is interactive instead of
 * render-blocking it in <head>. The widget is only needed on click.
 */
export default function CalendlyAssets() {
  useEffect(() => {
    if (document.querySelector(`link[href="${CSS_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = CSS_HREF;
    document.head.appendChild(link);
  }, []);

  return (
    <Script
      src="https://assets.calendly.com/assets/external/widget.js"
      strategy="lazyOnload"
    />
  );
}
