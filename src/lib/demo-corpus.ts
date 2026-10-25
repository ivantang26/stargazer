/**
 * Synthetic demonstration dataset (PRD §9.1).
 *
 * "Northlight Trading Co." is a fictional company. All documents below are
 * synthetic and reviewed; no customer document, internal company file, or real
 * employee record may ever enter this corpus. The demo corpus lives under the
 * reserved DEMO_ORG_ID so it can never intersect a real organization.
 */
import type { Database } from "better-sqlite3";
import { DEMO_ORG_ID } from "./db";
import { newId, nowIso } from "./util";
import { DEMO_SUGGESTED_QUESTIONS, DEMO_COMPANY } from "./demo-data";

export { DEMO_SUGGESTED_QUESTIONS, DEMO_COMPANY };

export interface DemoSection {
  heading: string;
  text: string;
}

export interface DemoDoc {
  slug: string;
  title: string;
  filename: string;
  ext: "md" | "txt";
  mime: string;
  lang: "en" | "zh";
  effectiveDate: string;
  sections: DemoSection[];
}

export const DEMO_DOCS: DemoDoc[] = [
  {
    slug: "purchase-request-policy",
    title: "Purchase Request Policy",
    filename: "purchase-request-policy-v3.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-03-02",
    sections: [
      {
        heading: "1. Purpose and scope",
        text: "This policy explains how employees of Northlight Trading Co. request purchases of goods and services. It applies to all staff except directors, who follow the Board procurement rules. Personal purchases are not permitted through company accounts.",
      },
      {
        heading: "2. Approval thresholds",
        text: "Purchases up to HKD 1,000 require approval from the requesting employee's department manager. Purchases between HKD 1,000 and HKD 5,000 require approval from the department head and the Finance Officer. Any purchase above HKD 5,000, and all recurring vendor contracts regardless of value, require written approval from the Managing Director. Splitting one purchase into several smaller requests to stay under a threshold is a disciplinary matter.",
      },
      {
        heading: "3. How to submit a request",
        text: "Submit a Purchase Request Form through the Orbit portal under Finance > Purchase Requests. Attach at least one quotation for amounts up to HKD 5,000 and at least two quotations for amounts above HKD 5,000. Requests are processed within three working days. Urgent requests marked as such are reviewed within one working day, but urgent handling does not bypass the approval thresholds in section 2.",
      },
      {
        heading: "4. After approval",
        text: "The Finance team issues a purchase order to the selected vendor. Employees must not place orders with vendors before a purchase order number is issued. Goods received must be inspected within two working days and the receipt confirmed in the portal so that payment can be scheduled.",
      },
      {
        heading: "5. Card purchases",
        text: "Company credit cards may be used for purchases up to HKD 2,000 when a vendor cannot accept purchase orders. Card purchases still require the same approvals by value, and the employee must upload the receipt and a short note within five working days.",
      },
    ],
  },
  {
    slug: "expense-reimbursement-policy",
    title: "Expense Reimbursement Policy",
    filename: "expense-reimbursement-policy-v2.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-01-15",
    sections: [
      {
        heading: "1. Principles",
        text: "Northlight Trading reimburses reasonable business expenses that are properly documented. Claims must be genuine, necessary for business, and submitted with original receipts. Alcohol is never reimbursable. Personal entertainment is not reimbursable.",
      },
      {
        heading: "2. Submitting a claim",
        text: "Submit claims through the Orbit portal within thirty days of the expense date. Late claims beyond sixty days require the Finance Officer's written approval and an explanation. Each claim needs the receipt, the business purpose, and the project code where applicable.",
      },
      {
        heading: "3. Meal and travel limits",
        text: "Client meals are capped at HKD 500 per person. Staff meals during same-day business travel are capped at HKD 250 per person. Local transport is reimbursed at actual cost; taxi rides require a short justification. Air travel for regional business trips must be economy class unless the Managing Director approves otherwise in writing before booking.",
      },
      {
        heading: "4. Payment timing",
        text: "Approved claims are paid together with the month-end payroll run. Claims approved after the 25th of a month are paid in the following month. Reimbursement is by bank transfer to the employee's registered salary account only.",
      },
    ],
  },
  {
    slug: "remote-work-policy",
    title: "Remote Work Policy",
    filename: "remote-work-policy.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-06-01",
    sections: [
      {
        heading: "1. Who can work remotely",
        text: "Office-based employees may work remotely up to two days per week with their manager's agreement. Customer-facing roles that require physical presence, including warehouse and showroom staff, follow separate roster arrangements. Fully remote arrangements require a written agreement with the department head reviewed every six months.",
      },
      {
        heading: "2. Equipment and allowance",
        text: "The company provides a laptop and one monitor for remote days. A monthly home internet allowance of HKD 200 is paid with salary; no separate claim is needed. Employees are responsible for a safe workspace and a reliable connection. Additional equipment requests go through the Purchase Request Policy.",
      },
      {
        heading: "3. Availability and security",
        text: "Remote staff must be reachable on the company chat between 10:00 and 17:00 Hong Kong time and keep their calendar current. Customer documents may only be handled on company devices; printing customer information at home is not permitted. Company laptops must use the managed VPN when connecting from public networks.",
      },
    ],
  },
  {
    slug: "annual-leave-policy",
    title: "Annual Leave Policy",
    filename: "annual-leave-policy.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-01-01",
    sections: [
      {
        heading: "1. Entitlement",
        text: "Full-time employees receive twelve days of annual leave per leave year, increasing to fourteen days after completing three years of service. Part-time employees receive leave on a pro-rata basis. The leave year runs from 1 January to 31 December. New joiners may take leave after completing their probation period of three months.",
      },
      {
        heading: "2. Applying for leave",
        text: "Apply at least fourteen days before the planned start date through the Orbit portal under People > Leave. Your manager responds within five working days. Leave applications during the December trading peak require the department head's approval and may be limited by staffing needs.",
      },
      {
        heading: "3. Carry-over",
        text: "Up to four days of unused leave may be carried into the first three months of the next leave year. Unused days beyond that expire without compensation unless the Managing Director approves an extension in writing for exceptional work demands.",
      },
      {
        heading: "4. Sick leave and other absence",
        text: "Sickness absence of more than one day requires a medical certificate. Sick leave does not reduce annual leave. Employees should notify their manager before 09:30 on the first day of absence.",
      },
    ],
  },
  {
    slug: "product-notes-aurora-desk-lamp",
    title: "Product Notes: Aurora Desk Lamp",
    filename: "product-notes-aurora-lamp.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-05-20",
    sections: [
      {
        heading: "Overview",
        text: "The Aurora Desk Lamp (models A-100 and A-200) is an adjustable LED desk lamp sold with a two-year manufacturer warranty. It offers three colour temperatures and stepless dimming. The A-100 has a single arm; the A-200 has a dual arm and a built-in USB-C charging port rated at 15 W.",
      },
      {
        heading: "Specifications",
        text: "Both models use a 12 V power adapter, draw a maximum of 9 W, and have a colour rendering index of Ra 95. The lamp head rotates 180 degrees. Rated lifetime of the LED module is 25,000 hours. The A-200 charging port continues to work when the lamp is switched off, as long as the adapter is connected.",
      },
      {
        heading: "Common customer questions",
        text: "If the lamp flickers, first check that the adapter is fully inserted and try another wall socket. Flickering that continues after a reset by holding the touch panel for ten seconds indicates a driver fault covered by warranty. Replacement adapters are sold separately and are not covered by the lamp warranty after the first year.",
      },
      {
        heading: "Care guidance",
        text: "Clean the lamp only with a dry or lightly damp microfibre cloth. Solvent-based cleaners damage the finish. The lamp is for indoor use only and must not be used in bathrooms or covered outdoor areas.",
      },
    ],
  },
  {
    slug: "product-notes-halo-coffee-machine",
    title: "Product Notes: Halo Coffee Machine",
    filename: "product-notes-halo-cm.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-04-11",
    sections: [
      {
        heading: "Overview",
        text: "The Halo Coffee Machine H-1 is a bean-to-cup machine for small offices, serving up to thirty cups per day. It carries a one-year warranty covering parts and labour. Descaling tablets and water filters are consumables and are not covered by warranty.",
      },
      {
        heading: "Maintenance schedule",
        text: "Rinse the brew unit weekly under running water and lubricate it every two months with the supplied grease. Replace the water filter every two months or 200 litres. Descale when the machine displays the descale icon, at minimum every three months in Hong Kong water conditions. Delayed descaling is the most common cause of pump faults and may void warranty coverage for pump damage.",
      },
      {
        heading: "Troubleshooting",
        text: "If the machine reports 'No beans' while the hopper has beans, the bean sensor may be blocked by chaff; vacuum the hopper and reset by switching the machine off for thirty seconds. Weak coffee usually means the grind is too coarse; turn the grinder dial one step finer while the grinder is running. Never adjust the grind when the grinder is idle, as this can jam the mechanism.",
      },
      {
        heading: "Water quality",
        text: "Use filtered or bottled water with total hardness below 100 ppm. Direct tap water accelerates limescale and is the most frequent reason for early service visits in our service records.",
      },
    ],
  },
  {
    slug: "warranty-repair-procedure",
    title: "Warranty and Repair Procedure",
    filename: "warranty-repair-procedure.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-02-01",
    sections: [
      {
        heading: "1. Warranty periods",
        text: "Aurora lamps carry a two-year warranty from the purchase date. Halo coffee machines carry a one-year warranty. Accessories such as adapters, milk jugs, and filters carry a six-month warranty. Warranty covers manufacturing defects; it does not cover physical damage, liquid spills, unauthorised repairs, or consumables.",
      },
      {
        heading: "2. Raising a warranty claim",
        text: "Check the serial number and purchase date in the sales system first. Ask the customer for a photo of the fault and the serial number. Create a Service Case in Orbit under Support > Service Cases and select 'Warranty' with the product family. Warranty claims need manager approval only when the repair estimate exceeds HKD 1,500.",
      },
      {
        heading: "3. Turnaround",
        text: "Standard repair turnaround is ten working days from collection. If a repair part is on backorder beyond fifteen working days, offer the customer a replacement unit of the same model or a refund of the purchase price; both require the Support Manager's approval.",
      },
      {
        heading: "4. Out-of-warranty repairs",
        text: "Out-of-warranty repairs are quoted at HKD 280 per half hour of labour plus parts. Quotes are free. If a customer declines the quote, return the unit unrepaired within five working days at no charge.",
      },
    ],
  },
  {
    slug: "customer-refund-policy-zh",
    title: "客戶退款政策",
    filename: "customer-refund-policy-zh.md",
    ext: "md",
    mime: "text/markdown",
    lang: "zh",
    effectiveDate: "2026-07-01",
    sections: [
      {
        heading: "一、適用範圍",
        text: "本政策適用於北光貿易有限公司（下稱「本公司」）直接售出的貨品，包括門市及網上訂單。企業批量訂單（單一訂單超過五十件）按個別合約條款處理，不適用本政策。",
      },
      {
        heading: "二、七天退款保證",
        text: "客戶於收貨後七天內，如貨品未經使用且包裝完整，可申請全數退款。退款以原支付方式退回，處理時間為七至十四個工作天。以下情況不符合退款資格：已拆封的個人衞生用品、載有客戶資料的訂製貨品，以及標明「最後出售」的清貨商品。",
      },
      {
        heading: "三、貨品損壞或不符合",
        text: "收貨時發現貨品損壞，請於四十八小時內拍照並聯絡客戶服務部，本公司會安排免費換貨或退款。超過四十八小時而無法證明運輸損壞的個案，將轉入保養維修程序處理。",
      },
      {
        heading: "四、企業客戶退貨",
        text: "企業客戶的退貨須於收貨後十四天內提出，並保留原有棧板及外箱。批次退貨超過二十件的，須先與客戶經理預約收貨時間，否則倉庫有權拒收。",
      },
    ],
  },
  {
    slug: "data-handling-guidelines",
    title: "Data Handling Guidelines",
    filename: "data-handling-guidelines.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-08-10",
    sections: [
      {
        heading: "1. Classification",
        text: "Company information is classified as Public, Internal, Confidential, or Restricted. Customer personal data is always Confidential or above. Payment card numbers must never be stored in any company system, including email, chat, and the CRM notes field.",
      },
      {
        heading: "2. Sharing rules",
        text: "Confidential information may be shared with a named external party only after a non-disclosure agreement is registered with Legal. Internal information may be shared with vendors under a standard confidentiality clause in the contract. Restricted information, such as customer lists with pricing, may not leave company systems under any circumstance except by Managing Director approval.",
      },
      {
        heading: "3. Incidents",
        text: "Report a suspected data incident, including a lost device or a misdirected email with customer data, to the Data Protection Officer within two hours of discovery. Do not attempt to delete evidence; preserve the original message or file. All incidents are reviewed weekly by the management team.",
      },
    ],
  },
  {
    slug: "office-access-visitor-policy",
    title: "Office Access and Visitor Policy",
    filename: "office-access-policy.md",
    ext: "md",
    mime: "text/markdown",
    lang: "en",
    effectiveDate: "2026-05-05",
    sections: [
      {
        heading: "1. Staff access",
        text: "Office doors operate with staff cards between 07:00 and 21:30 on working days. Access outside these hours requires a prior email approval from Facilities listing the date and reason. Lost cards must be reported immediately; the first replacement card is free, further replacements cost HKD 100 deducted from the monthly allowance.",
      },
      {
        heading: "2. Visitors",
        text: "All visitors register at reception with a photo identity document and wear a visitor badge. Hosts must collect visitors from reception and remain with them in meeting areas. Visits longer than one day require Facilities approval in advance.",
      },
      {
        heading: "3. Deliveries",
        text: "Personal deliveries to the office are accepted only for items under 30 cm x 30 cm x 30 cm. Business deliveries go to the goods lift entrance and are received by the warehouse team between 09:00 and 12:00 and between 14:00 and 17:00.",
      },
    ],
  },
];

interface ChunkRow {
  id: string;
  org_id: string;
  document_id: string;
  version_id: string;
  seq: number;
  content: string;
  section: string;
  loc_label: string;
  created_at: string;
}

/** Idempotently seed the demo corpus into the reserved demo organization. */
export function seedDemoCorpus(db: Database): void {
  const existing = db
    .prepare("SELECT COUNT(*) AS n FROM documents WHERE org_id = ?")
    .get(DEMO_ORG_ID) as { n: number };
  if (existing.n > 0) return;

  const now = nowIso();
  const insertDoc = db.prepare(
    `INSERT INTO documents (id, org_id, title, filename, ext, mime, checksum, state,
       current_version_id, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ready', ?, 'demo', ?)`
  );
  const insertVersion = db.prepare(
    `INSERT INTO document_versions (id, document_id, org_id, version_no, checksum, size_bytes,
       char_count, page_count, state, created_at) VALUES (?, ?, ?, 1, ?, ?, ?, 1, 'ready', ?)`
  );
  const insertChunk = db.prepare(
    `INSERT INTO chunks (id, org_id, document_id, version_id, seq, content, section, loc_label, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const doc of DEMO_DOCS) {
    const docId = newId("doc");
    const versionId = newId("dv");
    let seq = 0;
    const chunkRows: ChunkRow[] = [];
    for (const section of doc.sections) {
      chunkRows.push({
        id: newId("chk"),
        org_id: DEMO_ORG_ID,
        document_id: docId,
        version_id: versionId,
        seq: seq++,
        content: `${doc.title}: ${section.heading}\n${section.text}`,
        section: section.heading,
        loc_label: `${section.heading}`,
        created_at: now,
      });
    }
    const body = doc.sections.map((s) => `# ${s.heading}\n\n${s.text}`).join("\n\n");
    insertDoc.run(
      docId,
      DEMO_ORG_ID,
      doc.title,
      doc.filename,
      doc.ext,
      doc.mime,
      `demo-${doc.slug}`,
      versionId,
      now
    );
    insertVersion.run(
      versionId,
      docId,
      DEMO_ORG_ID,
      `demo-${doc.slug}`,
      Buffer.byteLength(body, "utf8"),
      body.length,
      now
    );
    for (const row of chunkRows) {
      insertChunk.run(
        row.id,
        row.org_id,
        row.document_id,
        row.version_id,
        row.seq,
        row.content,
        row.section,
        row.loc_label,
        row.created_at
      );
    }
  }
}
