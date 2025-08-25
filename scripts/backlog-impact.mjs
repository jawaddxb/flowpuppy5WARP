#!/usr/bin/env node
import fs from "fs";
import path from "path";

const id = process.argv[2];
if (!id || !/^AB-\d{3}$/.test(id)) {
  console.error("Usage: npm run backlog:impact AB-123");
  process.exit(1);
}

const matrix = JSON.parse(fs.readFileSync(path.join(process.cwd(), "qa", "matrix.json"), "utf8"));
const tags = matrix[id] || [];
const grep = tags.length ? tags.join("|") : "@builder|@lanes|@edges|@inspector|@diff-apply|@test-gate|@tasks";
console.log(grep);
