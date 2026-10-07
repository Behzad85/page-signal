"use client";

import { useEffect, useState } from "react";

const REPOSITORY_URL = "https://github.com/Behzad85/page-signal";
const REPOSITORY_API = "https://api.github.com/repos/Behzad85/page-signal";
const REFRESH_MS = 5 * 60 * 1000;

export default function GitHubStars() {
  const [result, setResult] = useState({ stars: null, status: "loading" });

  useEffect(() => {
    let disposed = false;
    let controller = null;
    let lastAttempt = 0;

    async function refresh() {
      if (document.visibilityState === "hidden" || controller || Date.now() - lastAttempt < REFRESH_MS) return;
      lastAttempt = Date.now();
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 8000);
      try {
        const response = await fetch(REPOSITORY_API, {
          headers: { Accept: "application/vnd.github+json" },
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("GitHub unavailable");
        const data = await response.json();
        if (!Number.isSafeInteger(data.stargazers_count) || data.stargazers_count < 0) throw new Error("Invalid star count");
        if (!disposed) setResult({ stars: data.stargazers_count, status: "ready" });
      } catch {
        if (!disposed) setResult({ stars: null, status: "unavailable" });
      } finally {
        clearTimeout(timeout);
        controller = null;
      }
    }

    void refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      disposed = true;
      clearInterval(interval);
      controller?.abort();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const count = result.stars === null ? null : result.stars.toLocaleString("en-US");
  const description = count === null
    ? result.status === "loading" ? "Loading star count" : "Star count temporarily unavailable"
    : `${count} ${result.stars === 1 ? "star" : "stars"}; refreshed every five minutes`;

  return <a className="github-stars" href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer"
    aria-label={`PageSignal on GitHub. ${description}. Opens in a new tab.`} title={description}>
    {/* GitHub Octicons mark-github-16, MIT: docs/licenses/octicons.txt. */}
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656" /></svg>
    <span>GitHub</span><span className="github-stars-count" aria-hidden="true">{count ?? (result.status === "loading" ? "…" : "—")}<span> {result.stars === 1 ? "star" : "stars"}</span></span>
  </a>;
}
