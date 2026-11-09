import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const postcode = (request.nextUrl.searchParams.get("q") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/.test(postcode)) return NextResponse.json({ error: "Enter a full UK postcode, for example M1 1AD." }, { status: 400 });
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`, { signal: AbortSignal.timeout(6000), cache: "no-store" });
    if (response.status === 404) return NextResponse.json({ error: "That postcode was not found. Try searching for the local authority instead." }, { status: 404 });
    if (!response.ok) throw new Error("lookup unavailable");
    const data = await response.json();
    const code = data.result?.codes?.admin_district;
    if (!code) throw new Error("No district code");
    return NextResponse.json({ code, name: data.result.admin_district, postcode: data.result.postcode });
  } catch { return NextResponse.json({ error: "Postcode lookup is temporarily unavailable. You can still search by area name." }, { status: 503 }); }
}
