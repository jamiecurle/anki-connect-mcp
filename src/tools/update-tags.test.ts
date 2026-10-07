import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerUpdateTags } from "./update-tags.js";

vi.mock("../anki-client.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../anki-client.js")>();
  return { ...actual, invoke: vi.fn() };
});

import { invoke } from "../anki-client.js";
const mockInvoke = vi.mocked(invoke);

async function setup() {
  const server = new McpServer({ name: "test", version: "0.0.1" });
  registerUpdateTags(server);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.1" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

function textOf(result: { content: unknown[] }) {
  return (result.content[0] as { text: string }).text;
}

beforeEach(() => {
  mockInvoke.mockReset();
});

describe("update_tags", () => {
  it("adds and removes tags, then returns the final tags", async () => {
    const client = await setup();

    mockInvoke
      .mockResolvedValueOnce(null) // addTags
      .mockResolvedValueOnce(null) // removeTags
      .mockResolvedValueOnce([
        { noteId: 1, tags: ["chapter3", "hard"] },
        { noteId: 2, tags: ["hard"] },
      ]); // notesInfo

    const result = await client.callTool({
      name: "update_tags",
      arguments: { note_ids: [1, 2], add: ["hard"], remove: ["easy", "old"] },
    });
    const data = JSON.parse(textOf(result));

    expect(mockInvoke).toHaveBeenCalledWith("addTags", { notes: [1, 2], tags: "hard" });
    expect(mockInvoke).toHaveBeenCalledWith("removeTags", { notes: [1, 2], tags: "easy old" });
    expect(data.notes).toEqual([
      { note_id: 1, tags: ["chapter3", "hard"] },
      { note_id: 2, tags: ["hard"] },
    ]);
  });

  it("only calls addTags when nothing is removed", async () => {
    const client = await setup();

    mockInvoke
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce([{ noteId: 1, tags: ["hard"] }]);

    await client.callTool({
      name: "update_tags",
      arguments: { note_ids: [1], add: ["hard"] },
    });

    expect(mockInvoke).not.toHaveBeenCalledWith("removeTags", expect.anything());
  });

  it("marks unknown note IDs as not found", async () => {
    const client = await setup();

    mockInvoke.mockResolvedValueOnce(null).mockResolvedValueOnce([{}]);

    const result = await client.callTool({
      name: "update_tags",
      arguments: { note_ids: [999], add: ["hard"] },
    });
    const data = JSON.parse(textOf(result));

    expect(data.notes).toEqual([{ note_id: 999, error: "not found" }]);
  });

  it("rejects tags containing spaces", async () => {
    const client = await setup();

    const result = await client.callTool({
      name: "update_tags",
      arguments: { note_ids: [1], add: ["data transfers"] },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('"data transfers"');
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("rejects a call with nothing to add or remove", async () => {
    const client = await setup();

    const result = await client.callTool({
      name: "update_tags",
      arguments: { note_ids: [1] },
    });

    expect(result.isError).toBe(true);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
