import fs from "node:fs";
import path from "node:path";

const toolsDir = process.argv[2];

const results: { name: string; emoji: string }[] = [];

const files = fs.readdirSync(toolsDir).filter((f) => f.endsWith(".py"));

for (const file of files) {
  const content = fs.readFileSync(path.join(toolsDir, file), "utf-8");

  const lines = content.split("\n");
  let pendingName: string | null = null;

  for (const line of lines) {
    const nameMatch = line.match(/name="([^"]+)"/);
    const emojiMatch = line.match(/emoji="([^"]+)"/);

    if (nameMatch && emojiMatch) {
      results.push({ name: nameMatch[1], emoji: emojiMatch[1] });
    } else if (nameMatch) {
      pendingName = nameMatch[1];
    } else if (emojiMatch && pendingName) {
      results.push({ name: pendingName, emoji: emojiMatch[1] });
      pendingName = null;
    }
  }
}

console.log(JSON.stringify(results, null, 2));
