import { cpSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const standalone = resolve(".next/standalone");
const server = resolve(standalone, "server.js");
if (!existsSync(server)) {
  console.error("No production build found. Run npm run build first.");
  process.exit(1);
}

// Next's standalone server expects public/static assets alongside its bundle.
cpSync(resolve("public"), resolve(standalone, "public"), { recursive: true });
cpSync(resolve(".next/static"), resolve(standalone, ".next/static"), { recursive: true });
// Local evaluation is the default. Containers configure their own HOSTNAME.
process.env.HOSTNAME = process.env.OPTISCAN_HOST || "127.0.0.1";
await import(pathToFileURL(server).href);
