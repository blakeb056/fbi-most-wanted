import { GET as callsGet } from "../calls/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return callsGet();
}
