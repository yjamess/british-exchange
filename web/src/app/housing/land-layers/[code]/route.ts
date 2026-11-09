import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Land Explorer layers for one English local authority district.
 * Pinned plates (curated/{code}.json) are served as files.
 * Any other district is queried from Planning Data once and cached in curated/live/.
 */
const root = path.resolve(process.cwd(), "../data/housing/planning-layers/curated");
const repo = path.resolve(process.cwd(), "..");

export const dynamic = "force-dynamic";
export const maxDuration = 90;

function isDistrict(code: string) {
  return /^(index|E0[6-9]\d{6})$/.test(code);
}

async function readJson(file: string) {
  return readFile(file, "utf8");
}

function queryLive(code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "uv",
      ["run", "python", "src/housing/connectors/planning_layers.py", "--place", code],
      { cwd: repo },
    );
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Planning Data query timed out"));
    }, 80_000);
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (status) => {
      clearTimeout(timer);
      if (status === 0) resolve();
      else reject(new Error(stderr.trim() || `query exited ${status}`));
    });
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isDistrict(code)) return new Response("Not found", { status: 404 });

  const pinned = path.join(root, `${code}.json`);
  const live = path.join(root, "live", `${code}.json`);
  try {
    const body = await readJson(pinned);
    return new Response(body, {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  } catch {
    if (code === "index") return new Response("Not found", { status: 404 });
  }

  try {
    const body = await readJson(live);
    return new Response(body, {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  } catch {
    /* cache miss — query Planning Data */
  }

  try {
    await queryLive(code);
    const body = await readJson(live);
    return new Response(body, {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Planning Data query failed";
    return new Response(message, { status: 502 });
  }
}
