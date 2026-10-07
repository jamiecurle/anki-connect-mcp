import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { invoke, type NoteInfo } from "../anki-client.js";

export function registerUpdateTags(server: McpServer): void {
  server.registerTool(
    "update_tags",
    {
      title: "Update Tags",
      description:
        "Add and/or remove tags on one or more Anki notes. This changes the user's collection. Get note IDs from search_cards. Returns each note's tags after the change.",
      inputSchema: {
        note_ids: z
          .array(z.number())
          .min(1)
          .describe("The notes to tag (note_id values from search_cards)."),
        add: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Tags to add. Example: ['chapter3', 'needs-review']"),
        remove: z
          .array(z.string())
          .optional()
          .default([])
          .describe("Tags to remove."),
      },
    },
    async ({ note_ids, add, remove }) => {
      try {
        if (add.length === 0 && remove.length === 0) {
          return errorResult("Nothing to do: pass tags in 'add' and/or 'remove'.");
        }

        // AnkiConnect takes tags as one space-separated string, so a tag
        // containing a space would quietly turn into two separate tags
        const badTags = [...add, ...remove].filter((tag) => tag.trim() === "" || /\s/.test(tag));
        if (badTags.length > 0) {
          return errorResult(
            `Tags can't be empty or contain spaces: ${badTags.map((t) => `"${t}"`).join(", ")}. Use - or _ instead.`,
          );
        }

        if (add.length > 0) {
          await invoke("addTags", { notes: note_ids, tags: add.join(" ") });
        }
        if (remove.length > 0) {
          await invoke("removeTags", { notes: note_ids, tags: remove.join(" ") });
        }

        // Read the notes back so the result shows the real final state
        const notes = await invoke<NoteInfo[]>("notesInfo", { notes: note_ids });
        const result = {
          added: add,
          removed: remove,
          notes: notes.map((note, i) =>
            // Unknown note IDs come back as empty objects
            note.noteId ? { note_id: note.noteId, tags: note.tags } : { note_id: note_ids[i], error: "not found" },
          ),
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

function errorResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    isError: true,
  };
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
