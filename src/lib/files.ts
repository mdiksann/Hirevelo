import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile as read, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { env } from "@/lib/env";
import { AppError, NotFoundError, StorageError } from "@/lib/errors";
import { cvValidation } from "@/lib/validation/applications";
function path(key: string) {
  if (!/^cv\/[a-z0-9-]{1,64}\.(pdf|doc|docx)$/.test(key))
    throw new StorageError();
  return resolve(env.STORAGE_DIR, key);
}
export async function saveFile(file: File) {
  const invalid = cvValidation(file);
  if (invalid)
    throw new AppError(invalid.message, "INVALID_CV", invalid.status);
  const key = `cv/c${randomBytes(12).toString("hex")}.${file.name.split(".").at(-1)?.toLowerCase()}`;
  try {
    await mkdir(resolve(env.STORAGE_DIR, "cv"), { recursive: true });
    await writeFile(path(key), Buffer.from(await file.arrayBuffer()), {
      flag: "wx",
      mode: 0o600,
    });
    return { key, size: file.size, mime: file.type };
  } catch {
    throw new StorageError();
  }
}
export async function readFile(key: string) {
  try {
    return await read(path(key));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    )
      throw new NotFoundError("This file could not be found.");
    throw new StorageError("The file could not be read. Please try again.");
  }
}
export async function removeFile(key: string) {
  try {
    await unlink(path(key));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return;
    throw new StorageError("The file could not be removed.");
  }
}
