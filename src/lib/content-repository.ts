import { pb } from "./pb";

export type ContentRecord = Record<string, unknown>;

export type FieldType =
  "text" | "textarea" | "number" | "boolean" | "select" | "string-list" | "file";

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export interface ContentTypeMeta {
  key: ContentKey;
  collection: string;
  label: string;
  sort: string;
  fields: FieldSchema[];
  /** true for the single app_settings row: no list, no create/delete. */
  singleton?: boolean;
}

const activeField: FieldSchema = { name: "active", label: "Active", type: "boolean" };
const orderField: FieldSchema = { name: "order", label: "Order", type: "number" };
const levelField: FieldSchema = {
  name: "level",
  label: "Level",
  type: "select",
  options: ["easy", "medium", "hard", "expert"],
};

export const contentMeta: ContentTypeMeta[] = [
  {
    key: "openingCallScripts",
    collection: "opening_call_scripts",
    label: "Opening scripts",
    sort: "order",
    fields: [
      { name: "part", label: "Part number", type: "number" },
      { name: "part_title", label: "Part title", type: "text" },
      { name: "purpose", label: "Purpose", type: "textarea" },
      { name: "exact_script", label: "Exact script", type: "textarea" },
      { name: "success_indicators", label: "Success indicators", type: "string-list" },
      { name: "common_mistakes", label: "Common mistakes", type: "string-list" },
      activeField,
      orderField,
    ],
  },
  {
    key: "openingCallScenarios",
    collection: "opening_call_scenarios",
    label: "Opening scenarios",
    sort: "order",
    fields: [
      { name: "name", label: "Contact name", type: "text" },
      { name: "address", label: "Address", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "hail_date", label: "Hail date", type: "text" },
      activeField,
      orderField,
    ],
  },
  {
    key: "objections",
    collection: "objections",
    label: "Objections",
    sort: "order",
    fields: [
      { name: "objection_id", label: "Objection ID", type: "text" },
      { name: "title", label: "Title", type: "text" },
      levelField,
      { name: "prompts", label: "Prompts", type: "string-list" },
      { name: "rebuttal", label: "Rebuttal", type: "textarea" },
      { name: "required_keywords", label: "Required keywords", type: "string-list" },
      { name: "optional_keywords", label: "Optional keywords", type: "string-list" },
      { name: "forbidden_keywords", label: "Forbidden keywords", type: "string-list" },
      { name: "hints", label: "Hints", type: "string-list" },
      activeField,
      orderField,
    ],
  },
  {
    key: "closingScripts",
    collection: "closing_scripts",
    label: "Closing scripts",
    sort: "order",
    fields: [
      { name: "close_type", label: "Close type", type: "text" },
      { name: "title", label: "Title", type: "text" },
      { name: "when_to_use", label: "When to use", type: "textarea" },
      { name: "exact_script", label: "Exact script", type: "textarea" },
      { name: "success_indicators", label: "Success indicators", type: "string-list" },
      activeField,
      orderField,
    ],
  },
  {
    key: "objectionMasteryLabs",
    collection: "objection_mastery_labs",
    label: "Objection mastery",
    sort: "order",
    fields: [
      { name: "title", label: "Title", type: "text" },
      levelField,
      { name: "prompt", label: "Prospect prompt", type: "textarea" },
      { name: "rebuttal", label: "Model rebuttal", type: "textarea" },
      { name: "keywords", label: "Keywords", type: "string-list" },
      activeField,
      orderField,
    ],
  },
  {
    key: "trainingVideos",
    collection: "training_videos",
    label: "Training videos",
    sort: "order",
    fields: [
      { name: "category", label: "Category", type: "select", options: ["software", "prospecting"] },
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "video_url", label: "Video URL", type: "text" },
      activeField,
      orderField,
    ],
  },
  {
    key: "modulesContent",
    collection: "modules_content",
    label: "Module content",
    sort: "module_key",
    fields: [
      { name: "module_key", label: "Module key", type: "text" },
      { name: "video_url", label: "Video URL", type: "text" },
      { name: "overview_title", label: "Overview title", type: "text" },
      { name: "overview_description", label: "Overview description", type: "textarea" },
      { name: "overview_topics", label: "Overview topics", type: "string-list" },
    ],
  },
  {
    key: "quizQuestions",
    collection: "quiz_questions",
    label: "Quiz questions",
    sort: "order",
    fields: [
      { name: "module_key", label: "Module key", type: "text" },
      { name: "question", label: "Question", type: "textarea" },
      { name: "type", label: "Type", type: "text" },
      { name: "options", label: "Options", type: "string-list" },
      { name: "correct_index", label: "Correct option index (0-based)", type: "number" },
      { name: "explanation", label: "Explanation", type: "textarea" },
      orderField,
    ],
  },
  {
    key: "signOffs",
    collection: "sign_offs",
    label: "Sign-offs",
    sort: "-created",
    fields: [
      { name: "typed_name", label: "Typed name", type: "text" },
      { name: "user_email", label: "Email", type: "text" },
      { name: "signed_at", label: "Signed at", type: "text" },
      { name: "document_version", label: "Document version", type: "text" },
    ],
  },
  {
    key: "appSettings",
    collection: "app_settings",
    label: "Settings",
    sort: "",
    singleton: true,
    fields: [
      { name: "sop_document_text", label: "Standard of Performance text", type: "textarea" },
      { name: "script_lab_document_title", label: "Script PDF title", type: "text" },
      {
        name: "script_lab_document_description",
        label: "Script PDF description",
        type: "textarea",
      },
      { name: "script_lab_document_file", label: "Script PDF file", type: "file" },
    ],
  },
];

export type ContentKey =
  | "openingCallScripts"
  | "openingCallScenarios"
  | "objections"
  | "closingScripts"
  | "objectionMasteryLabs"
  | "trainingVideos"
  | "modulesContent"
  | "quizQuestions"
  | "signOffs"
  | "appSettings";

export type ContentSnapshot = Record<ContentKey, ContentRecord[] | ContentRecord>;

function metaFor(key: ContentKey): ContentTypeMeta {
  const meta = contentMeta.find((item) => item.key === key);
  if (!meta) throw new Error(`Unknown content key: ${key}`);
  return meta;
}

export async function fetchContentSnapshot(): Promise<ContentSnapshot> {
  const snapshot = {} as ContentSnapshot;
  await Promise.all(
    contentMeta.map(async (meta) => {
      if (meta.singleton) {
        const items = await pb.collection(meta.collection).getFullList({ requestKey: null });
        snapshot[meta.key] = (items[0] as unknown as ContentRecord) ?? {};
        return;
      }
      const items = await pb
        .collection(meta.collection)
        .getFullList({ sort: meta.sort, requestKey: null });
      snapshot[meta.key] = items as unknown as ContentRecord[];
    }),
  );
  return snapshot;
}

export async function createContentRecord(
  key: ContentKey,
  data: Record<string, unknown> | FormData,
) {
  return pb.collection(metaFor(key).collection).create(data);
}

export async function updateContentRecord(
  key: ContentKey,
  id: string,
  data: Record<string, unknown> | FormData,
) {
  return pb.collection(metaFor(key).collection).update(id, data);
}

export async function deleteContentRecord(key: ContentKey, id: string) {
  return pb.collection(metaFor(key).collection).delete(id);
}
