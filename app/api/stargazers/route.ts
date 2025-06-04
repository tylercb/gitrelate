import { getStargazers } from "@/lib/github";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Check if client-side fetching is enabled
  if (process.env.NEXT_PUBLIC_USE_CLIENT_CLICKHOUSE === "true") {
    return NextResponse.json(
      {
        message:
          "Client-side fetching is enabled. Data is fetched directly from ClickHouse in the browser for better performance.",
        suggestion:
          "This API endpoint is available but not recommended when client-side fetching is enabled.",
        clientFetchingEnabled: true,
      },
      { status: 200 }
    );
  }

  // Client-side fetching is disabled, use original API implementation
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get("repo");

  if (!repo) {
    return NextResponse.json(
      { error: "Repo parameter is required" },
      { status: 400 }
    );
  }

  try {
    const stargazers = await getStargazers(repo);
    return NextResponse.json(stargazers);
  } catch (error) {
    console.error("Error fetching stargazers:", error);
    return NextResponse.json(
      { error: "Failed to fetch stargazers" },
      { status: 500 }
    );
  }
}
