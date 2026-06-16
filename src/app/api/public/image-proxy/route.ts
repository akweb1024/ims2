import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_HOSTS = [
  "journals.stmjournals.com",
  "stmjournals.com",
  "ims.panoptical.org",
];

const isPrivateHostname = (hostname: string) => {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0") return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true; // link-local / cloud metadata
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // IPv6 ULA
  if (h.startsWith("fe80")) return true; // IPv6 link-local
  return false;
};

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get("url");
    if (!source) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 },
      );
    }

    let sourceUrl: URL;
    try {
      sourceUrl = new URL(source);
    } catch {
      return NextResponse.json({ error: "Invalid image url" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(sourceUrl.protocol)) {
      return NextResponse.json(
        { error: "Only http/https images are supported" },
        { status: 400 },
      );
    }

    if (isPrivateHostname(sourceUrl.hostname)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    }

    const envAllowlist = (process.env.IMAGE_PROXY_ALLOWLIST || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    const allowlist = new Set([
      ...DEFAULT_ALLOWED_HOSTS,
      ...envAllowlist,
      request.nextUrl.hostname.toLowerCase(),
    ]);

    const isAllowedTarget = (url: URL) =>
      ["http:", "https:"].includes(url.protocol) &&
      !isPrivateHostname(url.hostname) &&
      allowlist.has(url.hostname.toLowerCase());

    if (!isAllowedTarget(sourceUrl)) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    }

    // Follow redirects MANUALLY, re-validating every hop against the allowlist
    // and private-IP filter. With redirect:"follow" an allowlisted host could
    // 302 to an internal address (e.g. 169.254.169.254) — an SSRF vector.
    let currentUrl = sourceUrl;
    let upstream: Response | null = null;
    const MAX_REDIRECTS = 5;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      upstream = await fetch(currentUrl.toString(), {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
      });

      if (upstream.status >= 300 && upstream.status < 400) {
        const location = upstream.headers.get("location");
        if (!location) break;
        let nextUrl: URL;
        try {
          nextUrl = new URL(location, currentUrl);
        } catch {
          return NextResponse.json({ error: "Invalid redirect target" }, { status: 502 });
        }
        if (!isAllowedTarget(nextUrl)) {
          return NextResponse.json({ error: "Redirect target not allowed" }, { status: 403 });
        }
        currentUrl = nextUrl;
        continue;
      }
      break;
    }

    if (!upstream || !upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch source image" },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "application/octet-stream";
    const bytes = await upstream.arrayBuffer();

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500 },
    );
  }
}

