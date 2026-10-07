import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerUpdateNote } from "./update-note.js";
import type { NoteInfo } from "../anki-client.js";

vi.mock("../anki-client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../anki-client.js")>();
  return { ...actual, invoke: vi.fn() };
});

import { invoke } from "../anki-client.js";
const mockInvoke = vi.mocked(invoke);

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerUpdateNote(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.1" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

function makeNote(overrides: Partial<NoteInfo> = {}): NoteInfo {
  return {
    noteId: 42,
    modelName: "Basic",
    tags: [],
    fields: {
      Front: { value: "What is GDPR?", order: 0 },
      Back: { value: "General Data Protection Regulation", order: 1 },
    },
    cards: [1],
    ...overrides,
  };
}

function textOf(result: { content: unknown[] }) {
  return (result.content[0] as { text: string }).text;
}

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("update_note", () => {
  it("updates fields and returns before and after values", async () => {
    const client = await setup();

    mockInvoke
      .mockResolvedValueOnce([makeNote()]) // notesInfo
      .mockResolvedValueOnce(null); // updateNoteFields

    const result = await client.callTool({
      name: "update_note",
      arguments: { note_id: 42, fields: { Back: "GDPR (EU) 2016/679" } },
    });
    const data = JSON.parse(textOf(result));

    expect(mockInvoke).toHaveBeenCalledWith("updateNoteFields", {
      note: { id: 42, fields: { Back: "GDPR (EU) 2016/679" } },
    });
    expect(data.updated).toEqual([
      { field: "Back", before: "General Data Protection Regulation", after: "GDPR (EU) 2016/679" },
    ]);
  });

  it("rejects field names the note doesn't have", async () => {
    const client = await setup();

    mockInvoke.mockResolvedValueOnce([makeNote()]);

    const result = await client.callTool({
      name: "update_note",
      arguments: { note_id: 42, fields: { Answer: "x" } },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Unknown field(s) for this note: Answer");
    expect(textOf(result)).toContain("Front, Back");
    expect(mockInvoke).not.toHaveBeenCalledWith("updateNoteFields", expect.anything());
  });

  it("reports a missing note", async () => {
    const client = await setup();

    // AnkiConnect returns an empty object for unknown note IDs
    mockInvoke.mockResolvedValueOnce([{}]);

    const result = await client.callTool({
      name: "update_note",
      arguments: { note_id: 999, fields: { Back: "x" } },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("No note found with ID 999");
  });

  it("rejects an empty fields map", async () => {
    const client = await setup();

    const result = await client.callTool({
      name: "update_note",
      arguments: { note_id: 42, fields: {} },
    });

    expect(result.isError).toBe(true);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("explains when Anki isn't running", async () => {
    const client = await setup();

    mockInvoke.mockRejectedValueOnce(new Error("fetch failed"));

    const result = await client.callTool({
      name: "update_note",
      arguments: { note_id: 42, fields: { Back: "x" } },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("Could not connect to Anki");
  });
});
