/**
 * Seed content for the public Resources area (PRD §19: a practical setup
 * guide, supported-file guide, document preparation checklist, explanation of
 * citations, and two workflow articles — in both launch locales).
 */
import type { Database } from "better-sqlite3";
import { nowIso } from "./util";

interface Entry {
  locale: "en" | "zh-hant";
  slug: string;
  type: "article" | "faq" | "release_note";
  title: string;
  summary: string;
  body: string;
}

const ENTRIES: Entry[] = [
  {
    locale: "en",
    slug: "setup-guide",
    type: "article",
    title: "Getting started",
    summary: "From creating your workspace to your first sourced answer in one sitting.",
    body: `## Create your workspace\nSign up with a work email, verify the address, and name your workspace. A fourteen-day trial starts immediately. No payment card is required.\n\n## Upload approved documents\nAn owner or administrator uploads the documents your team already treats as authoritative: policies, product notes, operating procedures. Every active member of the workspace can read them, so upload only material that is safe for the whole team.\n\n## Wait for processing\nDocuments move through uploading, queued, processing, and ready. A document only becomes ready once its content and retrieval index are usable.\n\n## Ask your first question\nOpen Ask, choose which documents to search, and write the question in English or Traditional Chinese. Answers attach citations to factual statements; open a citation to read the passage, its document, version, and section.\n\n## Keep the collection current\nReplace an outdated document with a new version. New questions immediately use the new version, while earlier answers keep their original references.`,
  },
  {
    locale: "en",
    slug: "supported-files",
    type: "article",
    title: "Supported file types and limits",
    summary: "What you can upload today, and what to do with files we do not accept yet.",
    body: `## Accepted today\nText-based PDF, DOCX, TXT, and Markdown files are supported. Each file may be at most 10 MB, 200 pages, or 500,000 extracted characters. The most restrictive limit that applies wins.\n\n## Not accepted yet\nScanned PDFs without a text layer, encrypted documents, archives such as ZIP, executables, and spreadsheets are rejected with a clear message. Optical character recognition (OCR) for scanned documents is on our roadmap and is not available in the current release.\n\n## Preparing scanned material\nIf a document exists only on paper, convert it to a text-based PDF using a scanning app that performs OCR before uploading, then check that the extracted text is readable.`,
  },
  {
    locale: "en",
    slug: "document-preparation-checklist",
    type: "article",
    title: "Preparing your documents",
    summary: "Five checks that materially improve answer quality.",
    body: `1. **Use the current version.** Before uploading, confirm the document is the version your team should follow today.\n2. **Keep titles meaningful.** "Purchase Request Policy (March 2026)" cites better than "final_v3".\n3. **Prefer text over scans.** A clean text layer makes passages easier to retrieve and quote.\n4. **Split unrelated topics.** One document per topic keeps citations precise.\n5. **Note the language.** You can ask in English or Traditional Chinese regardless of the document's language; names, figures, and source titles are preserved as written.`,
  },
  {
    locale: "en",
    slug: "how-citations-work",
    type: "article",
    title: "How citations work",
    summary: "Citations establish traceability, not interpretation.",
    body: `Every factual statement in an answer carries a reference to the passage that was retrieved to support it. A citation opens the document title, the relevant passage, its version, and its section or page where available. Citations are assembled from document metadata controlled by the server; the assistant cannot invent a source.\n\nWhat a citation does not do: it does not prove that the text correctly interprets the source, and it does not replace professional judgment. When the current documents do not establish a fact, the answer says so and suggests what additional source would help. When documents conflict, the answer identifies both documents rather than silently choosing one.`,
  },
  {
    locale: "en",
    slug: "workflow-operations",
    type: "article",
    title: "Answering operations questions",
    summary: "How a five-person trading company uses the workspace for daily policy questions.",
    body: `Recurring internal questions (how to submit a purchase request, what a meal allowance covers, who approves what) consume manager time every week. In this workflow, an administrator maintains the policy library, and employees ask directly.\n\nA typical exchange: an employee asks how to request a purchase of HKD 6,000. The answer cites the approval-threshold section of the purchase policy, names the required approvals, and links the passage. If the answer lacks a needed detail (for example a vendor list that is not in the library), the response says which document is missing, and the administrator adds it.\n\nThe measure of success is not answer count; it is whether employees stop queueing at a manager's desk for facts the company has already written down.`,
  },
  {
    locale: "en",
    slug: "workflow-support-preparation",
    type: "article",
    title: "Preparing support responses",
    summary: "Comparing two product documents before writing to a customer.",
    body: `Support teams often need to check what a warranty covers and what a product note says about a symptom before replying to a customer. With the workspace, the agent asks one question scoped to the two relevant documents.\n\nThe answer quotes each document's position with citations, so the agent can verify both passages before writing. Where the documents disagree (for example an older note that conflicts with a newer policy), the answer flags the conflict with both versions and dates, and the agent decides what to communicate. The assistant never sends the customer response itself; it prepares the evidence for a person to use.`,
  },
  {
    locale: "zh-hant",
    slug: "setup-guide",
    type: "article",
    title: "知識工作區入門指南",
    summary: "由建立工作區到取得第一個附來源的答案。",
    body: `## 建立工作區\n使用工作電郵註冊並驗證地址，然後為工作區命名。十四天試用即時開始，無需登記信用卡。\n\n## 上載獲核准的文件\n擁有者或管理員上載團隊視為權威的文件：政策、產品說明、操作程序。工作區所有現有成員均可閱讀，因此只應上載適合整個團隊查看的材料。\n\n## 等待處理\n文件會依次進入上載、排隊、處理、就緒狀態。文件只有在內容及檢索索引可用後才會轉為就緒。\n\n## 提出第一個問題\n開啟「提問」，選擇要搜尋的文件，以英文或繁體中文發問。答案會在事實陳述附上引用；點擊引用即可查看段落、文件、版本及章節。\n\n## 保持資料最新\n以新版本取代過時文件。新問題會即時使用新版本，而過往答案則保留原有引用。`,
  },
  {
    locale: "zh-hant",
    slug: "supported-files",
    type: "article",
    title: "支援的檔案類型及限制",
    summary: "現時可上載的檔案，以及暫不支援檔案的處理方法。",
    body: `## 現時支援\n支援文字型 PDF、DOCX、TXT 及 Markdown 檔案。每個檔案上限為 10 MB、200 頁或 500,000 個抽取字元，以最嚴格的限制為準。\n\n## 暫不支援\n沒有文字層的掃描 PDF、加密文件、ZIP 等壓縮檔、執行檔及試算表會被明確拒絕。掃描文件的光學字元識別（OCR）屬規劃中功能，現階段並未提供。\n\n## 掃描文件準備\n如文件只有紙本，請先使用具 OCR 功能的掃描應用程式轉為文字型 PDF，上載前檢查抽取的文字清晰可讀。`,
  },
  {
    locale: "zh-hant",
    slug: "document-preparation-checklist",
    type: "article",
    title: "文件準備清單",
    summary: "五項檢查，明顯提升答案品質。",
    body: `1. **使用現行版本。** 上載前確認文件是團隊現時應依據的版本。\n2. **標題要有意義。**「採購申請政策（2026年3月）」遠比「final_v3」易於引用。\n3. **偏好文字而非掃描。** 清晰的文字層令段落更易檢索及引用。\n4. **拆分無關主題。** 一份文件一個主題，引用更精確。\n5. **留意語言。** 無論文件語言為何，您都可以以英文或繁體中文提問；名稱、數字及來源標題會按原文保留。`,
  },
  {
    locale: "zh-hant",
    slug: "how-citations-work",
    type: "article",
    title: "引用如何運作",
    summary: "引用建立可追溯性，但不等於詮釋正確。",
    body: `答案中每項事實陳述均附有支援該陳述的檢索段落引用。點擊引用可開啟文件標題、相關段落、版本以及章節或頁碼。引用由伺服器控制的文件元數據組成，助理無法虛構來源。\n\n引用做不到的事：引用不能證明文字正確詮釋了原文，也不能取代專業判斷。當現有文件無法確立某項事實時，答案會明確說明並建議補充甚麼資料；當文件之間有矛盾時，答案會指出雙方文件，而不會靜默地二選其一。`,
  },
  {
    locale: "zh-hant",
    slug: "workflow-operations",
    type: "article",
    title: "回應日常營運問題",
    summary: "一間五人貿易公司如何以工作區處理每日政策查詢。",
    body: `重複出現的內部問題，如何提交採購申請、膳食津貼上限、各級審批權限，每星期都佔用管理者時間。在此流程中，管理員維護政策庫，員工直接提問。\n\n典型例子：員工查詢如何申請 6,000 港元的採購。答案引用採購政策的審批門檻章節，列出所需審批，並連結原文段落。若答案缺少所需細節（例如政策庫中沒有供應商名單），回應會指出缺少的文件，管理員再行補充。\n\n成功指標不是答案數量，而是員工是否不再為公司早已寫明的事實排隊等候管理者回覆。`,
  },
  {
    locale: "zh-hant",
    slug: "workflow-support-preparation",
    type: "article",
    title: "準備客服回覆",
    summary: "撰寫客戶回覆前，先比較兩份產品文件。",
    body: `客服團隊回覆客戶前，通常需要查證保養範圍及產品說明對某症狀的描述。使用工作區時，專員可就兩份相關文件提出一條問題。\n\n答案會引用各文件的立場，讓專員落筆前核實兩段原文。當文件之間有出入，例如舊說明與新政策矛盾，答案會連同版本及日期標明衝突，由專員決定如何回覆。助理不會代為發送客戶回覆；它為人準備證據。`,
  },
];

export function seedContentEntries(db: Database): void {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM content_entries").get() as { n: number };
  if (existing.n > 0) return;
  const now = nowIso();
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO content_entries (id, locale, slug, type, title, summary, body, status, owner, revision, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'published', 'content-team', 1, ?)`
  );
  for (const e of ENTRIES) {
    stmt.run(
      `ce-${e.locale}-${e.slug}`,
      e.locale,
      e.slug,
      e.type,
      e.title,
      e.summary,
      e.body,
      now
    );
  }
}
