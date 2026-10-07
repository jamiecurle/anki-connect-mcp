import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerDeckOverview } from "./tools/deck-overview.js";
import { registerDueToday } from "./tools/due-today.js";
import { registerDifficultCards } from "./tools/card-difficulty.js";
import { registerReviewHistory } from "./tools/review-history.js";
import { registerSearchCards } from "./tools/search-cards.js";
import { registerUpdateNote } from "./tools/update-note.js";

const server = new McpServer({
  name: "anki-connect",
  version: "0.1.0",
});

registerDeckOverview(server);
registerDueToday(server);
registerDifficultCards(server);
registerReviewHistory(server);
registerSearchCards(server);
registerUpdateNote(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
