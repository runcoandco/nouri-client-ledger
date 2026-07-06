const fs = require("fs");
const path = require("path");

const outputPath = path.join(__dirname, "..", "lib", "build-meta.ts");
const now = new Date().toISOString();

const content = `export const FRONTEND_UPDATED_AT = ${JSON.stringify(now)};\n`;

fs.writeFileSync(outputPath, content, "utf8");
