export interface TextViewerSlices {
  before: string;
  marked: string;
  after: string;
  located: "offsets" | "passage" | "none";
}

export interface TextViewerSection {
  start_utf16?: number | null;
  end_utf16?: number | null;
  passage?: string | null;
}

export function buildTextViewer(text: string, section: TextViewerSection | null | undefined): TextViewerSlices;
