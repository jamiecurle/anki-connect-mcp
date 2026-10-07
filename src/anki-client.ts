const ANKI_CONNECT_URL = "http://localhost:8765";

export async function invoke<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(ANKI_CONNECT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: 6, params }),
  });

  if (!response.ok) {
    throw new Error(`AnkiConnect HTTP error: ${response.status}`);
  }

  const data = (await response.json()) as { error: string | null; result: T };

  if (data.error) {
    throw new Error(`AnkiConnect error: ${data.error}`);
  }

  return data.result;
}

// Strip HTML tags from card content for readable text previews
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

// Convert AnkiConnect ease integer (e.g. 2500) to percentage (e.g. 250)
export function easeToPercent(ease: number): number {
  return Math.round(ease / 10);
}

// Types for AnkiConnect responses

export interface CardInfo {
  cardId: number;
  fields: Record<string, { value: string; order: number }>;
  fieldOrder: number;
  question: string;
  answer: string;
  modelName: string;
  deckName: string;
  css: string;
  interval: number;
  note: number;
  type: number; // 0=new, 1=learning, 2=review
  queue: number; // -1=suspended, 0=new, 1=learning, 2=review, 3=day-learning
  due: number;
  reps: number;
  lapses: number;
  left: number;
  mod: number;
  ease: number; // e.g. 2500 = 250%
  tags: string[];
}

// AnkiConnect returns an empty object for a note ID that doesn't exist,
// so every property here may be missing in practice
export interface NoteInfo {
  noteId: number;
  modelName: string;
  tags: string[];
  fields: Record<string, { value: string; order: number }>;
  cards: number[];
}

export interface DeckStats {
  deck_id: number;
  name: string;
  new_count: number;
  learn_count: number;
  review_count: number;
  total_in_deck: number;
}
