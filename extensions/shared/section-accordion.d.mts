export interface AccordionState {
  open: number | null;
}

export type AccordionAction =
  | { type: "open"; index: number }
  | { type: "toggle"; index: number }
  | { type: "close" }
  | { type: "next" }
  | { type: "previous" };

export interface AccordionStrip {
  index: number;
  number: number;
  total: number;
  level: string | null;
  levelLabel: string;
  score: string;
  canPrevious: boolean;
  canNext: boolean;
  text: string;
  announcement: string;
}

export interface AccordionSection {
  level?: string | null;
  display_score?: string | number | null;
}

export function accordionInitial(): AccordionState;
export function accordionReduce(state: AccordionState, action: AccordionAction, count: number): AccordionState;
export function accordionStrip(state: AccordionState, sections: readonly AccordionSection[], labels?: Record<string, string>): AccordionStrip | null;
