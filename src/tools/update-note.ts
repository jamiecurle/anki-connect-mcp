import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { invoke, type NoteInfo } from "../anki-client.js";

export function registerUpdateNote(server: McpServer): void {
  server.registerTool(
    "update_note",
    {
      title: "Update Note",
      description:
        "Edit the field contents of an Anki note (e.g. fix the Back of a card). This changes the user's collection. Get the note_id from search_cards. Only the fields you pass are changed; others are left as they are.",
      inputSchema: {
        note_id: z.number().describe("The note to edit (note_id from search_cards)."),
        fields: z
          .record(z.string())
          .describe(
            'Field names mapped to their new content. Example: { "Back": "General Data Protection Regulation (EU) 2016/679" }',
          ),
      },
    },
    async ({ note_id, fields }) => {
      try {
        if (Object.keys(fields).length === 0) {
          return errorResult("No fields given to update.");
        }

        const [note] = await invoke<NoteInfo[]>("notesInfo", { notes: [note_id] });

        // AnkiConnect returns [{}] rather than an error for unknown IDs
        if (!note || !note.fields) {
          return errorResult(`No note found with ID ${note_id}.`);
        }

        // AnkiConnect silently ignores field names that don't exist on the note,
        // so check them here to avoid reporting an edit that never happened
        const validNames = Object.keys(note.fields);
        const unknownNames = Object.keys(fields).filter((name) => !validNames.includes(name));
        if (unknownNames.length > 0) {
          return errorResult(
            `Unknown field(s) for this note: ${unknownNames.join(", ")}. Valid fields are: ${validNames.join(", ")}.`,
          );
        }

        await invoke("updateNoteFields", { note: { id: note_id, fields } });

        // Show before/after so the user can see exactly what changed
        const changes = Object.entries(fields).map(([name, value]) => ({
          field: name,
          before: note.fields[name].value,
          after: value,
        }));

        const result = { note_id, updated: changes };

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
