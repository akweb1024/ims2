import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_HOSTS = [
  "journals.stmjournals.com",
  "stmjournals.com",
  "ims.panoptical.org",
];

const isPrivateHostname = (hostname: string) => {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
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

    if (!allowlist.has(sourceUrl.hostname.toLowerCase())) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    }

    const upstream = await fetch(sourceUrl.toString(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
    });

    if (!upstream.ok) {
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

