// Wraps the artifact page (which claude.ai serves inside its own skeleton) into a standalone document for GitHub Pages.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const page = readFileSync(new URL("../calorie-tracker.html", import.meta.url), "utf8");
const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">` +
  `<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}` +
  `body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>` +
  `</head><body>${page}</body></html>`;

mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
writeFileSync(new URL("../dist/index.html", import.meta.url), doc);
console.log("Built dist/index.html");
