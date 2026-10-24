/**
 * Retrieval engine (PRD §14: retrieval, generation, and citation rendering
 * are separate responsibilities).
 *
 * Scoring is BM25 over chunk text. Tokenization handles mixed English and
 * Traditional Chinese: ASCII terms are lowercased; CJK runs are emitted as
 * character bigrams, which gives useful phrase matching for 繁體中文 questions.
 * In production this layer maps onto pgvector embeddings; the interface
 * (retrieve for an organization over eligible current-version chunks) is the
 * boundary the PRD requires.
 */

export function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const normalized = text.toLowerCase();
  const ascii = normalized.match(/[a-z0-9][a-z0-9'.-]*/g) ?? [];
  for (const t of ascii) tokens.push(t.replace(/[.'-]+$/, ""));
  const cjkRuns = normalized.match(/[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]+/g) ?? [];
  for (const run of cjkRuns) {
    const chars = [...run].filter((c) => /[\u3400-\u9fff]/.test(c));
    if (chars.length === 1) tokens.push(chars[0]);
    for (let i = 0; i < chars.length - 1; i++) tokens.push(chars[i] + chars[i + 1]);
  }
  return tokens.filter((t) => t.length > 0);
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  versionId: string;
  docTitle: string;
  versionNo: number;
  seq: number;
  content: string;
  section: string | null;
  locLabel: string | null;
  score: number;
}

export interface ChunkRowLike {
  id: string;
  document_id: string;
  version_id: string;
  seq: number;
  content: string;
  section: string | null;
  loc_label: string | null;
}

export interface DocMetaLike {
  id: string;
  title: string;
  current_version_id: string;
}

export interface VersionMetaLike {
  id: string;
  version_no: number;
}

const K1 = 1.4;
const B = 0.72;

/** Retrieve the top-K scoring eligible chunks for a question within one organization. */
export function retrieve(
  question: string,
  chunks: ChunkRowLike[],
  docMeta: Map<string, DocMetaLike>,
  versionMeta: Map<string, VersionMetaLike>,
  topK = 6
): RetrievedChunk[] {
  const qTokens = tokenize(question);
  if (qTokens.length === 0 || chunks.length === 0) return [];

  const docs: Array<{ terms: Map<string, number>; len: number }> = chunks.map((c) => {
    const terms = new Map<string, number>();
    for (const t of tokenize(c.content)) terms.set(t, (terms.get(t) ?? 0) + 1);
    return { terms, len: terms.size ? [...terms.values()].reduce((a, b) => a + b, 0) : 1 };
  });
  const avgLen = docs.reduce((a, d) => a + d.len, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const q of new Set(qTokens)) {
    let n = 0;
    for (const d of docs) if (d.terms.has(q)) n++;
    df.set(q, n);
  }

  const scored: RetrievedChunk[] = [];
  chunks.forEach((chunk, i) => {
    const d = docs[i];
    let score = 0;
    for (const q of new Set(qTokens)) {
      const tf = d.terms.get(q);
      if (!tf) continue;
      const n = df.get(q) ?? 0;
      if (n === 0) continue;
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      const denom = tf + K1 * (1 - B + (B * d.len) / avgLen);
      score += idf * ((tf * (K1 + 1)) / denom);
    }
    if (score <= 0) return;
    const doc = docMeta.get(chunk.document_id);
    const ver = versionMeta.get(chunk.version_id);
    if (!doc || !ver) return;
    scored.push({
      chunkId: chunk.id,
      documentId: chunk.document_id,
      versionId: chunk.version_id,
      docTitle: doc.title,
      versionNo: ver.version_no,
      seq: chunk.seq,
      content: chunk.content,
      section: chunk.section,
      locLabel: chunk.loc_label,
      score,
    });
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/** Rough evidence-quality gate: normalized top score against corpus size. */
export function evidenceStrength(results: RetrievedChunk[], question: string): number {
  if (results.length === 0) return 0;
  const qTokens = new Set(tokenize(question));
  let best = 0;
  for (const r of results) {
    const cTokens = new Set(tokenize(r.content));
    let overlap = 0;
    for (const t of qTokens) if (cTokens.has(t)) overlap++;
    const coverage = qTokens.size ? overlap / qTokens.size : 0;
    const normalized = r.score / (1 + 0.02 * qTokens.size);
    best = Math.max(best, normalized * 0.5 + coverage * 6);
  }
  return best;
}

/** Detect a possible contradiction: strong hits from different documents that barely share vocabulary. */
export function detectConflict(results: RetrievedChunk[]): RetrievedChunk[] | null {
  if (results.length < 2) return null;
  const top = results[0];
  for (const other of results.slice(1, 3)) {
    if (other.documentId === top.documentId) continue;
    if (other.score < top.score * 0.55) continue;
    const a = new Set(tokenize(top.content));
    const b = tokenize(other.content);
    let shared = 0;
    for (const t of b) if (a.has(t)) shared++;
    const jaccard = shared / Math.max(1, a.size + b.length - shared);
    // Same topic (decent vocabulary overlap) but different documents both scoring
    // close to the top is the signal we surface for human review.
    if (jaccard > 0.14 && jaccard < 0.32) return [top, other];
  }
  return null;
}

export function detectLanguage(text: string): "en" | "zh" {
  const cjk = text.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latin = text.match(/[a-zA-Z]/g)?.length ?? 0;
  return cjk > latin * 0.5 && cjk > 2 ? "zh" : "en";
}
