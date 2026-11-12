import { z } from "zod";
import { admin } from "./admin";
import { fail } from "./http";
import type { UploadTicket } from "@/shared/types";

export const uploadTicketSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
  size: z.number(),
});
export type UploadMeta = z.infer<typeof uploadTicketSchema>;

const IMAGE_TYPES = ["image/jpeg", "image/png"];
const MAX = 5 * 1024 * 1024;

/** Issues a signed upload URL into a private bucket; server-validates type and size. */
export async function signedUpload(bucket: string, prefix: string, meta: UploadMeta): Promise<UploadTicket> {
  if (!IMAGE_TYPES.includes(meta.contentType)) throw fail("VALIDATION", 422, { file: "fileType" });
  if (meta.size > MAX) throw fail("VALIDATION", 422, { file: "fileSize" });
  const ext = meta.contentType === "image/png" ? "png" : "jpg";
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await admin().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) throw fail("INTERNAL", 500);
  return { uploadUrl: data.signedUrl, path: data.path };
}
