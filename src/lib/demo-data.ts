/**
 * Client-safe demo constants: no server imports so the demo UI can bundle
 * them without pulling the database layer into the client graph.
 */
export const DEMO_COMPANY = {
  nameEn: "Northlight Trading Co.",
  nameZh: "北光貿易有限公司",
  datasetLabelEn: "Sample dataset: Northlight Trading Co. (synthetic data)",
  datasetLabelZh: "示例資料集：北光貿易有限公司（虛構資料）",
};

export const DEMO_SUGGESTED_QUESTIONS: { en: string[]; zh: string[] } = {
  en: [
    "How do I submit a purchase request for HKD 6,000?",
    "How many annual leave days do employees get, and when can new joiners take leave?",
    "A customer's Aurora lamp is flickering. Is that covered by warranty?",
    "What is the meal limit for client entertainment?",
    "Can staff print customer documents when working from home?",
  ],
  zh: [
    "客戶收貨後幾天內可以申請全數退款？",
    "企業客戶批次退貨有什麼程序？",
    "購買超過五千港元的物品需要誰批准？",
    "遙距辦公的員工有什麼設備和津貼？",
  ],
};
