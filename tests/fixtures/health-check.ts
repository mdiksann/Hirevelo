import { NextRequest } from "next/server";
import { GET } from "@/app/api/health/route";
async function main() {
  const response = await GET(new NextRequest("http://localhost/api/health"));
  process.stdout.write(
    JSON.stringify({ status: response.status, body: await response.json() }),
  );
}
void main();
