# Anki Connect MCP Server

Let Claude see your Anki study progress — what's due, what you're struggling with, and how consistent you've been — and fix or retag cards for you.

---

## Setup

You need three things: the AnkiConnect addon in Anki, this server built on your machine, and a one-time config change in Claude Desktop.

### Step 1: Install AnkiConnect in Anki

1. Open Anki
2. Go to **Tools > Add-ons > Get Add-ons...**
3. Paste this code and click OK:

```
2055492159
```

4. Restart Anki

### Step 2: Build the server

Open a terminal and run:

```bash
git clone https://github.com/YOUR_USERNAME/anki-connect.git
cd anki-connect
npm install
npm run build
```

### Step 3: Add to Claude Desktop

Open this file in any text editor:

```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Find the `"mcpServers"` section and add this entry (replace `/path/to` with wherever you cloned the repo):

```json
{
  "mcpServers": {
    "anki-connect": {
      "command": "node",
      "args": ["/path/to/anki-connect/dist/index.js"]
    }
  }
}
```

**Restart Claude Desktop** (Cmd+Q, then reopen).

That's it. You should see the Anki tools in the hammer icon at the bottom of Claude's chat input.

---

## What Claude can do

| Tool | What it does |
|---|---|
| **get_deck_overview** | Shows total cards, how many are new/learning/mature, average ease, and total lapses |
| **get_due_today** | Today's workload — what's due and what you've already reviewed |
| **get_difficult_cards** | Finds the cards you struggle with most (by lapses or ease factor) |
| **get_review_history** | Daily review counts, streak, and whether you're trending up or down |
| **search_cards** | Looks up specific cards by topic, tag, or any Anki search query |
| **update_note** | Edits a card's fields (e.g. corrects the answer on the back) |
| **update_tags** | Adds or removes tags on one or more cards |

> **Heads up:** `update_note` and `update_tags` change your Anki collection. By default Claude Desktop asks before running a tool, so you can check each edit first (unless you choose "Always allow"). Each edit shows the old and new values, so you can put things back if needed.

## Usage

1. Open Anki (it must be running — the tools talk to Anki through its local API)
2. Open Claude Desktop
3. Ask anything about your study progress:

> "How am I doing on my CIPP/E deck?"
>
> "What cards am I struggling with the most?"
>
> "Have I been consistent with reviews this month?"
>
> "Show me cards about GDPR data transfers"
>
> "The answer on my Article 17 card is wrong — fix it to say right to erasure"
>
> "Tag all my cards about data transfers with chapter5"

Claude will call the tools automatically and give you a plain-English summary.

## Troubleshooting

**"Could not connect to Anki"** — Anki needs to be open and running. The tools talk to Anki through a local API that's only available while the app is open.

**Tools not showing in Claude Desktop** — Make sure you restarted Claude Desktop after editing the config. Check that the path in your config points to the actual `dist/index.js` file.

## License

MIT
