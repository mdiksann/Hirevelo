import "server-only";
import { AppError, ValidationError } from "@/lib/errors";
import { MAX_CV_BYTES } from "@/lib/validation/applications";
// Bound the multipart body as well as the file; 64 KB covers ordinary multipart fields/headers.
export async function readUpload(request: Request) {
  const limit = MAX_CV_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > limit)
    throw new AppError("CV must be 5 MB or smaller.", "CV_TOO_LARGE", 413);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;"))
    throw new ValidationError("Send a multipart CV upload.");
  const reader = request.body?.getReader();
  if (!reader) throw new ValidationError("Choose a CV file.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new AppError("CV must be 5 MB or smaller.", "CV_TOO_LARGE", 413);
    }
    chunks.push(chunk.value);
  }
  try {
    return await new Response(Buffer.concat(chunks), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new ValidationError("The upload could not be read.");
  }
}
