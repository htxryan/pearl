const { normalize, resolve, sep } = require("node:path");

const projectRoot = "/Users/redhale/src/pearl";
const projectPathOverride = "/Users/redhale/attachments";
const scope = "project";

const normalizedDir = normalize(
  scope === "project"
    ? (projectPathOverride ?? resolve(projectRoot, ".pearl", "attachments"))
    : "/some/other/path"
);

const filePath = normalize(resolve(normalizedDir, "2026", "04", "hash.webp"));

console.log("normalizedDir:", normalizedDir);
console.log("normalizedDir + sep:", normalizedDir + sep);
console.log("normalizedPath:", filePath);
console.log("startsWith:", filePath.startsWith(normalizedDir + sep));
