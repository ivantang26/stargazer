/**
 * Answer synthesis (PRD §10.2, §14).
 *
 * This build ships a deterministic extractive engine: it selects the passages
 * the retriever found, composes an answer from the most question-relevant
 * sentences, attaches citations assembled from server-side document metadata,
 * and behaves honestly at the edges — insufficient evidence is stated as
 * insufficient, and contradictory-looking passages are surfaced for human
 * review rather than silently resolved. A hosted model adapter can replace
 * composeAnswer(); the citation contract and persistence around it stay fixed.
 */
import {
  retrieve,
  evidenceStrength,
  detectConflict,
  detectLanguage,
  tokenize,
  type RetrievedChunk,
  type ChunkRowLike,
  type DocMetaLike,
  type VersionMetaLike,
} from "./retrieval";

export interface Citation {
  n: number;
  documentId: string;
  versionId: string;
  docTitle: string;
  versionNo: number;
  section: string | null;
  locLabel: string | null;
  excerpt: string;
  superseded: boolean;
}

export interface SynthesisResult {
  status: "complete" | "insufficient";
  answer: string;
  citations: Citation[];
  conflict: Citation[] | null;
  answerLang: "en" | "zh";
  retrievedCount: number;
  evidenceStrength: number;
}

const EVIDENCE_THRESHOLD = 2.2;

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？；;])\s+|(?<=。)(?=[^。])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function sentenceRelevance(sentence: string, qTokens: Set<string>): number {
  const tokens = tokenize(sentence);
  let hits = 0;
  for (const t of tokens) if (qTokens.has(t)) hits++;
  const coverage = tokens.length ? hits / tokens.length : 0;
  return hits * 2 + coverage * 3;
}

export function synthesize(
  question: string,
  chunks: ChunkRowLike[],
  docMeta: Map<string, DocMetaLike>,
  versionMeta: Map<string, VersionMetaLike>,
  supersededVersionIds: Set<string>
): SynthesisResult {
  const answerLang = detectLanguage(question) === "zh" ? "zh" : "en";
  const results = retrieve(question, chunks, docMeta, versionMeta, 6);
  const strength = evidenceStrength(results, question);
  const qTokens = new Set(tokenize(question));

  const toCitation = (r: RetrievedChunk, n: number): Citation => ({
    n,
    documentId: r.documentId,
    versionId: r.versionId,
    docTitle: r.docTitle,
    versionNo: r.versionNo,
    section: r.section,
    locLabel: r.locLabel,
    excerpt: r.content,
    superseded: supersededVersionIds.has(r.versionId),
  });

  if (results.length === 0 || strength < EVIDENCE_THRESHOLD) {
    const closest = results.slice(0, 2).map((r, i) => toCitation(r, i + 1));
    const answer =
      answerLang === "zh"
        ? `目前的文件未能確立您所問的事實。${closest.length ? `與問題最接近的資料是「${closest.map((c) => c.docTitle).join("」、「")}」，但內容不足以直接回答。` : ""}建議：檢查問題用詞是否與文件一致，或補充相關的政策、產品說明或程序文件後再試。`
        : `The current documents do not establish the fact you asked about. ${
            closest.length
              ? `The closest material is in ${closest.map((c) => `“${c.docTitle}”`).join(" and ")}, but it does not directly answer this question. `
              : ""
          }Suggestions: check that your wording matches the documents, or upload the relevant policy, product note, or procedure and ask again.`;
    return {
      status: "insufficient",
      answer,
      citations: closest,
      conflict: null,
      answerLang,
      retrievedCount: results.length,
      evidenceStrength: strength,
    };
  }

  const used = results.filter((r) => r.score >= results[0].score * 0.45).slice(0, 3);
  const citations = used.map((r, i) => toCitation(r, i + 1));
  const conflictPair = detectConflict(results);
  const conflict = conflictPair
    ? conflictPair.map((r, i) => toCitation(r, i + 1 + citations.length))
    : null;

  // Rank sentences inside the used passages by question relevance, then quote
  // the best ones — extractive, so every claim traces to a passage.
  const picked: Array<{ text: string; citation: Citation }> = [];
  for (const c of citations) {
    const body = c.excerpt.split("\n").slice(1).join(" ") || c.excerpt;
    const sentences = splitSentences(body).slice(0, 8);
    const ranked = sentences
      .map((s) => ({ s, score: sentenceRelevance(s, qTokens) }))
      .sort((a, b) => b.score - a.score);
    const take = ranked.slice(0, 2).filter((r) => r.score > 0);
    for (const r of take) picked.push({ text: r.s, citation: c });
  }
  if (picked.length === 0) {
    const body = citations[0].excerpt.split("\n").slice(1).join(" ") || citations[0].excerpt;
    picked.push({ text: splitSentences(body)[0] ?? body, citation: citations[0] });
  }

  const lead =
    answerLang === "zh"
      ? `根據目前的文件：`
      : `Based on the current documents:`;
  const parts = picked.map((p) => `${p.text} [${p.citation.n}]`);
  let answer = `${lead}\n${parts.join(answerLang === "zh" ? "" : " ")}`;
  if (answerLang === "zh") answer = `${lead}\n${parts.join("")}`;

  if (conflict) {
    answer +=
      answerLang === "zh"
        ? `\n\n注意：「${conflict[0].docTitle}」與「${conflict[1].docTitle}」對相關主題的表述可能不一致，請核對兩份文件的版本及日期 [${conflict[0].n}][${conflict[1].n}]。`
        : `\n\nNote: “${conflict[0].docTitle}” and “${conflict[1].docTitle}” may describe this topic inconsistently — please review both documents' versions and dates [${conflict[0].n}][${conflict[1].n}].`;
  }

  return {
    status: "complete",
    answer,
    citations: [...citations, ...(conflict ?? [])],
    conflict,
    answerLang,
    retrievedCount: results.length,
    evidenceStrength: strength,
  };
}
