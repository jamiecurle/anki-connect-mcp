import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { invoke, stripHtml, easeToPercent, type CardInfo } from "../anki-client.js";

export function registerSearchCards(server: McpServer): void {
  server.registerTool(
    "search_cards",
    {
      title: "Search Cards",
      description:
        "Search Anki cards using Anki's query syntax. Returns card content, tags, study stats, and the note_id needed by the editing tools. Examples: 'deck:CIPP tag:chapter3', 'GDPR', 'is:due deck:CIPP'.",
      inputSchema: {
        query: z
          .string()
          .describe(
            "Anki search query. Examples: 'deck:CIPP/E tag:chapter3', 'deck:CIPP/E GDPR', 'is:due deck:CIPP/E'",
          ),
        limit: z
          .number()
          .optional()
          .default(10)
          .describe("Maximum number of cards to return."),
      },
    },
    async ({ query, limit }) => {
      try {
        const cardIds = await invoke<number[]>("findCards", { query });

        if (cardIds.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No cards found matching query: "${query}"`,
              },
            ],
          };
        }

        // Take only up to limit
        const selectedIds = cardIds.slice(0, limit);
        const cards = await invoke<CardInfo[]>("cardsInfo", { cards: selectedIds });

        const results = cards.map((card) => {
          // Get front and back fields
          const sortedFields = Object.entries(card.fields).sort(
            ([, a], [, b]) => a.order - b.order,
          );
          const front = sortedFields[0] ? stripHtml(sortedFields[0][1].value).slice(0, 300) : "";
          const back = sortedFields[1] ? stripHtml(sortedFields[1][1].value).slice(0, 300) : "";

          return {
            card_id: card.cardId,
            // Edits in Anki apply to notes, so the editing tools need this ID
            note_id: card.note,
            front,
            back,
            tags: card.tags,
            deck: card.deckName,
            ease_percent: easeToPercent(card.ease),
            interval_days: card.interval,
            lapses: card.lapses,
            reps: card.reps,
          };
        });

        const result = {
          total_matches: cardIds.length,
          showing: results.length,
          cards: results,
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return handleError(error);
      }
    },
  );
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ECONNREFUSED") || message.includes("fetch failed")) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Could not connect to Anki. Make sure Anki is running with the AnkiConnect addon installed (addon code: 2055492159).",
        },
      ],
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: `AnkiConnect error: ${message}` }],
    isError: true,
  };
}
