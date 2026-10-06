import { Readable } from "node:stream";
import { getFileForDownload } from "@/lib/queries/files";
import { readFile } from "@/lib/files";
import { sanitizeFilename } from "@/lib/validation/applications";
import { handleActionError } from "@/types/action-result";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const file = await getFileForDownload((await params).id);
    const bytes = await readFile(file.storageKey);
    const stream = Readable.toWeb(
      Readable.from([bytes]),
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `attachment; filename="${sanitizeFilename(file.originalName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const result = handleActionError(error);
    return Response.json(result, {
      status: result.ok ? 500 : (result.status ?? 500),
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
