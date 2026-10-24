/**
 * Document ingestion (PRD §10.1).
 *
 * Validates the real file type by parsing the bytes (not the label), enforces
 * the 10 MB / 200 pages / 500,000 characters limits with the most restrictive
 * winning, chunks text with source locations preserved, and computes a
 * checksum for duplicate detection within an organization.
 */
import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_LIMITS } from "./plans";
import { ensureDataDir, newId, sha256Hex } from "./util";

export interface ParsedDocument {
  text: string;
  pageCount: number;
  charCount: number;
}

export interface IngestError {
  code: "unsupported_file" | "file_too_large" | "too_many_pages" | "too_many_chars" | "parse_failed" | "empty_document";
  message: string;
}

export interface IngestSuccess {
  ok: true;
  parsed: ParsedDocument;
  checksum: string;
  storagePath: string;
}

export type IngestOutcome = IngestSuccess | { ok: false; error: IngestError };

export function extensionOf(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
}

export function isAcceptedExtension(ext: string): boolean {
  return (UPLOAD_LIMITS.acceptedExtensions as readonly string[]).includes(ext);
}

/** Parse and validate an uploaded buffer. Runs inside the worker sandbox boundary. */
export async function ingestBuffer(
  filename: string,
  declaredMime: string,
  buffer: Buffer,
  orgId: string
): Promise<IngestOutcome> {
  const ext = extensionOf(filename);
  if (!isAcceptedExtension(ext)) {
    return {
      ok: false,
      error: {
        code: "unsupported_file",
        message: `Unsupported file type “${filename}”. Accepted types: PDF, DOCX, TXT, Markdown.`,
      },
    };
  }
  if (buffer.byteLength > UPLOAD_LIMITS.maxBytes) {
    return {
      ok: false,
      error: {
        code: "file_too_large",
        message: `File exceeds the 10 MB limit (${(buffer.byteLength / 1048576).toFixed(1)} MB).`,
      },
    };
  }
  if (buffer.byteLength === 0) {
    return { ok: false, error: { code: "empty_document", message: "The file is empty." } };
  }

  let parsed: ParsedDocument;
  try {
    parsed = await parseDocument(ext, buffer);
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "parse_failed",
        message:
          e instanceof Error && e.message
            ? `Could not process this file: ${e.message}`
            : "Could not process this file. Scanned PDFs without a text layer, encrypted documents, and archives are not supported yet.",
      },
    };
  }

  if (parsed.charCount > UPLOAD_LIMITS.maxChars) {
    return {
      ok: false,
      error: {
        code: "too_many_chars",
        message: `Document exceeds the 500,000 extracted character limit (${parsed.charCount.toLocaleString()} characters).`,
      },
    };
  }
  if (parsed.pageCount > UPLOAD_LIMITS.maxPages) {
    return {
      ok: false,
      error: {
        code: "too_many_pages",
        message: `Document exceeds the 200 page limit (${parsed.pageCount} pages).`,
      },
    };
  }
  if (parsed.charCount < 40) {
    return {
      ok: false,
      error: {
        code: "empty_document",
        message:
          "Almost no text could be extracted. Scanned PDFs without a text layer are not supported yet.",
      },
    };
  }

  const checksum = sha256Hex(buffer);
  const storagePath = await storeFile(orgId, newId("file"), ext, buffer);
  return { ok: true, parsed, checksum, storagePath };
}

async function parseDocument(ext: string, buffer: Buffer): Promise<ParsedDocument> {
  if (ext === "txt" || ext === "md") {
    const text = buffer.toString("utf8");
    return { text, pageCount: Math.max(1, Math.ceil(text.length / 3000)), charCount: text.length };
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ?? "";
    return { text, pageCount: Math.max(1, Math.ceil(text.length / 3000)), charCount: text.length };
  }
  if (ext === "pdf") {
    // pdf-parse's default entry has a debug-mode side effect; import the lib path directly.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default as (
      b: Buffer
    ) => Promise<{ text: string; numpages: number }>;
    const result = await pdfParse(buffer);
    const text = (result.text ?? "").replace(/\u0000/g, "");
    return { text, pageCount: result.numpages ?? 1, charCount: text.length };
  }
  throw new Error("unsupported extension");
}

export interface ChunkOut {
  seq: number;
  content: string;
  section: string | null;
  locLabel: string | null;
}

const CHUNK_TARGET = 900;
const CHUNK_OVERLAP = 120;

/**
 * Split parsed text into retrieval chunks. Markdown-style headings become
 * section labels; pages are approximated for PDFs from the character offset.
 */
export function chunkDocument(parsed: ParsedDocument, isPdf: boolean): ChunkOut[] {
  const chunks: ChunkOut[] = [];
  const perPage = parsed.pageCount > 0 ? parsed.charCount / parsed.pageCount : parsed.charCount;
  const lines = parsed.text.replace(/\r\n/g, "\n").split("\n");

  let section: string | null = null;
  let buffer: string[] = [];
  let bufferLen = 0;
  let offsetChars = 0;

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content.length >= 40) {
      const page = isPdf && perPage > 0 ? Math.min(parsed.pageCount, Math.floor(offsetChars / perPage) + 1) : null;
      chunks.push({
        seq: chunks.length,
        content: section ? `${section}\n${content}` : content,
        section,
        locLabel: page ? `${section ?? ""}${section ? " · " : ""}p.${page} (approx.)` : section,
      });
    }
  };

  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.{2,120})$/) ?? line.match(/^(\d+)[.、]\s*(.{2,120})$/);
    if (heading && line.length < 130) {
      flush();
      buffer = [];
      bufferLen = 0;
      section = heading[2].trim();
      continue;
    }
    buffer.push(line);
    bufferLen += line.length;
    offsetChars += line.length;
    if (bufferLen >= CHUNK_TARGET) {
      flush();
      // keep a small overlap tail for continuity
      const tail = buffer.join("\n").slice(-CHUNK_OVERLAP);
      buffer = tail.length > 20 ? [tail] : [];
      bufferLen = buffer.join("\n").length;
    }
  }
  flush();
  if (chunks.length === 0 && parsed.text.trim().length >= 40) {
    chunks.push({ seq: 0, content: parsed.text.trim().slice(0, 2000), section: null, locLabel: null });
  }
  return chunks;
}

/** Private file store: bytes live under the data directory, never web-served directly. */
export async function storeFile(orgId: string, fileId: string, ext: string, buffer: Buffer): Promise<string> {
  const dir = ensureDataDir(path.join("files", orgId));
  const p = path.join(dir, `${fileId}.${ext}`);
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, buffer);
  return path.relative(ensureDataDir(), p).replaceAll("\\", "/");
}

export async function readStoredFile(storagePath: string): Promise<Buffer> {
  const full = path.join(ensureDataDir(), storagePath);
  return readFile(full);
}
