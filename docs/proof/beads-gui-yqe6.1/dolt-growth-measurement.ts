/**
 * Dolt History Growth Measurement for Inline Base64 Image Attachments
 *
 * Measures how much .beads/ (Dolt database) grows when an issue has 10 inline
 * base64 attachments and goes through 20 edits. Gate criterion: growth <= 5x
 * the raw compressed image bytes.
 *
 * NOTE: Dolt's TEXT column has a ~65KB limit. We use 10 x 4KB blobs (~55KB
 * base64) to stay within it. The measurement is still meaningful: the key
 * question is whether Dolt deduplicates unchanged text across history commits.
 * We then extrapolate to 100KB blobs using the observed per-edit overhead
 * ratio.
 */

import { execSync } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BEADS_DIR = "/Users/redhale/src/pearl/.beads";
const WORKING_DIR = "/Users/redhale/src/pearl";
const NUM_ATTACHMENTS = 10;
const BLOB_SIZE_BYTES = 4 * 1024; // 4KB each — fits in TEXT column
const NUM_EDITS = 20;
const TMP_FILE = join(tmpdir(), "pearl-dolt-growth-test-content.txt");

// For extrapolation
const TARGET_BLOB_SIZE_BYTES = 100 * 1024; // 100KB each — the real-world target

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBeadsSizeBytes(): number {
  // Use find + stat to sum actual file sizes (byte-accurate on macOS)
  const output = execSync(
    `find "${BEADS_DIR}" -type f -exec stat -f "%z" {} +`,
    { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
  );
  return output
    .trim()
    .split(/\s+/)
    .reduce((sum, s) => sum + (parseInt(s, 10) || 0), 0);
}

function generateAttachment(): { ref: string; base64Data: string } {
  const raw = randomBytes(BLOB_SIZE_BYTES);
  const hash = createHash("sha256").update(raw).digest("hex");
  const ref = hash.substring(0, 12);
  const base64Data = raw.toString("base64");
  return { ref, base64Data };
}

function buildDescription(
  attachments: { ref: string; base64Data: string }[],
  editNumber: number,
): string {
  // Prose section — changes slightly each edit
  const proseVariants = [
    "This is the POC issue for measuring Dolt growth with inline base64 attachments.",
    "The issue contains ten synthetic images encoded as base64 data.",
    "Each attachment is approximately 4KB of random binary data.",
    "We measure database size after creation and after each edit.",
    "The gate criterion is that growth must be at most 5x raw bytes.",
  ];

  let prose = proseVariants
    .map((line, i) => {
      if (i === editNumber % proseVariants.length) {
        return `${line} (edit ${editNumber})`;
      }
      return line;
    })
    .join("\n");

  // Image references
  prose += "\n\n";
  for (const att of attachments) {
    prose += `Here is an image: [img:${att.ref}]\n`;
  }

  // Attachment blocks
  prose += "\n";
  for (const att of attachments) {
    prose += `<!-- pearl-attachment:v1:${att.ref}\n`;
    prose += `type: inline\n`;
    prose += `mime: image/webp\n`;
    prose += `data: ${att.base64Data}\n`;
    prose += `-->\n\n`;
  }

  return prose;
}

function exec(cmd: string): string {
  return execSync(cmd, {
    encoding: "utf-8",
    cwd: WORKING_DIR,
    maxBuffer: 50 * 1024 * 1024,
  }).trim();
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
  console.log("=== Dolt Growth Measurement: Inline Base64 Attachments ===\n");

  // Generate attachments
  console.log(
    `Generating ${NUM_ATTACHMENTS} synthetic attachments (~${BLOB_SIZE_BYTES / 1024}KB each)...`,
  );
  const attachments: { ref: string; base64Data: string }[] = [];
  for (let i = 0; i < NUM_ATTACHMENTS; i++) {
    attachments.push(generateAttachment());
  }

  // Calculate sizes
  const totalBase64Bytes = attachments.reduce(
    (sum, a) => sum + a.base64Data.length,
    0,
  );
  const totalBase64KB = Math.round(totalBase64Bytes / 1024);
  const totalRawKB = Math.round((NUM_ATTACHMENTS * BLOB_SIZE_BYTES) / 1024);
  const descriptionSize = buildDescription(attachments, 0).length;
  console.log(`Total raw bytes: ${totalRawKB} KB`);
  console.log(`Total base64 bytes: ${totalBase64KB} KB`);
  console.log(
    `Full description size: ${descriptionSize} bytes (~${Math.round(descriptionSize / 1024)} KB)\n`,
  );

  // Results tracking
  const results: {
    step: string;
    sizeBytes: number;
    deltaBytes: number;
  }[] = [];

  // Baseline
  const baselineBytes = getBeadsSizeBytes();
  results.push({ step: "Before", sizeBytes: baselineBytes, deltaBytes: 0 });
  console.log(
    `Baseline .beads/ size: ${(baselineBytes / 1024).toFixed(0)} KB`,
  );

  // Build initial content and write to temp file
  const initialContent = buildDescription(attachments, 0);
  writeFileSync(TMP_FILE, initialContent, "utf-8");

  // Create test issue (NOT ephemeral — wisps skip history commits)
  console.log("\nCreating test issue...");
  const createOutput = exec(
    `bd create "POC: Dolt growth test (auto-measurement)" --body-file "${TMP_FILE}" --labels "poc,auto-test"`,
  );
  console.log(`Create output: ${createOutput}`);

  // Extract issue ID — match the full beads-gui-XXXX pattern
  const idMatch = createOutput.match(/(beads-gui-[a-z0-9]+)/);
  if (!idMatch) {
    console.error("Failed to extract issue ID from create output");
    process.exit(1);
  }
  const issueId = idMatch[1];
  console.log(`Created issue: ${issueId}`);

  const afterCreateBytes = getBeadsSizeBytes();
  results.push({
    step: "After create",
    sizeBytes: afterCreateBytes,
    deltaBytes: afterCreateBytes - baselineBytes,
  });
  console.log(
    `After create: ${(afterCreateBytes / 1024).toFixed(0)} KB (delta: ${((afterCreateBytes - baselineBytes) / 1024).toFixed(1)} KB)`,
  );

  // Perform 20 edits
  let prevBytes = afterCreateBytes;
  for (let i = 1; i <= NUM_EDITS; i++) {
    const content = buildDescription(attachments, i);
    writeFileSync(TMP_FILE, content, "utf-8");
    exec(`bd update ${issueId} --body-file "${TMP_FILE}"`);

    const currentBytes = getBeadsSizeBytes();
    const delta = currentBytes - prevBytes;
    results.push({
      step: `After edit ${i}`,
      sizeBytes: currentBytes,
      deltaBytes: delta,
    });
    if (i % 5 === 0 || i === 1) {
      console.log(
        `Edit ${i}/${NUM_EDITS}: delta ${(delta / 1024).toFixed(1)} KB`,
      );
    }
    prevBytes = currentBytes;
  }

  // Final measurements
  const finalBytes = prevBytes;
  const totalGrowthBytes = finalBytes - baselineBytes;
  const totalGrowthKB = totalGrowthBytes / 1024;
  const ratio = totalGrowthKB / totalBase64KB;
  const pass = ratio <= 5.0;

  // Print results table
  console.log("\n" + "=".repeat(70));
  console.log("RESULTS TABLE");
  console.log("=".repeat(70));
  console.log(
    `${"Step".padEnd(20)} | ${"Size (KB)".padStart(12)} | ${"Delta (KB)".padStart(12)} | ${"Cumul (KB)".padStart(12)}`,
  );
  console.log(
    "-".repeat(20) +
      " | " +
      "-".repeat(12) +
      " | " +
      "-".repeat(12) +
      " | " +
      "-".repeat(12),
  );
  for (const r of results) {
    const cumul = r.sizeBytes - baselineBytes;
    console.log(
      `${r.step.padEnd(20)} | ${(r.sizeBytes / 1024).toFixed(0).padStart(12)} | ${(r.deltaBytes / 1024).toFixed(1).padStart(12)} | ${(cumul / 1024).toFixed(1).padStart(12)}`,
    );
  }
  console.log(
    "-".repeat(20) +
      " | " +
      "-".repeat(12) +
      " | " +
      "-".repeat(12) +
      " | " +
      "-".repeat(12),
  );

  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log(
    `Raw image bytes:     ${totalRawKB} KB (${NUM_ATTACHMENTS} x ${BLOB_SIZE_BYTES / 1024} KB)`,
  );
  console.log(`Base64 bytes:        ${totalBase64KB} KB`);
  console.log(`Description size:    ${Math.round(descriptionSize / 1024)} KB`);
  console.log(
    `Baseline .beads/:    ${(baselineBytes / 1024).toFixed(0)} KB`,
  );
  console.log(`Final .beads/:       ${(finalBytes / 1024).toFixed(0)} KB`);
  console.log(`Total Dolt growth:   ${totalGrowthKB.toFixed(1)} KB`);
  console.log(
    `Growth ratio:        ${ratio.toFixed(3)}x base64 bytes`,
  );
  console.log(`Gate criterion:      <= 5.0x`);
  console.log(`Verdict:             ${pass ? "PASS" : "FAIL"}`);

  // Analyze per-edit overhead
  const createDelta = results[1].deltaBytes;
  const editDeltas = results.slice(2).map((r) => r.deltaBytes);
  const avgEditDelta =
    editDeltas.reduce((a, b) => a + b, 0) / editDeltas.length;
  const proseChangeSize = 15; // approximate bytes of prose change per edit ("(edit N)")

  console.log("\n" + "=".repeat(70));
  console.log("PER-EDIT ANALYSIS");
  console.log("=".repeat(70));
  console.log(
    `Create overhead:     ${(createDelta / 1024).toFixed(1)} KB`,
  );
  console.log(
    `Avg edit overhead:   ${(avgEditDelta / 1024).toFixed(1)} KB`,
  );
  console.log(
    `Description size:    ${Math.round(descriptionSize / 1024)} KB`,
  );
  console.log(
    `Edit overhead ratio: ${(avgEditDelta / descriptionSize).toFixed(2)}x description (${avgEditDelta > descriptionSize ? "FULL COPY per edit" : "DEDUPLICATING"})`,
  );

  // Extrapolation to 100KB blobs
  console.log("\n" + "=".repeat(70));
  console.log("EXTRAPOLATION TO 100KB BLOBS (10 attachments x 100KB)");
  console.log("=".repeat(70));
  const targetTotalRawKB =
    (NUM_ATTACHMENTS * TARGET_BLOB_SIZE_BYTES) / 1024; // 1000 KB
  const scaleFactor = TARGET_BLOB_SIZE_BYTES / BLOB_SIZE_BYTES; // 25x

  // If per-edit overhead scales with description size (full copy per commit):
  const worstCaseEditOverheadKB =
    (avgEditDelta / 1024) * scaleFactor;
  const worstCaseCreateKB = (createDelta / 1024) * scaleFactor;
  const worstCaseTotalKB =
    worstCaseCreateKB + worstCaseEditOverheadKB * NUM_EDITS;
  const worstCaseRatio = worstCaseTotalKB / targetTotalRawKB;

  // If per-edit overhead is constant (Dolt deduplicates unchanged blobs):
  const bestCaseEditOverheadKB = avgEditDelta / 1024;
  const bestCaseCreateKB = (createDelta / 1024) * scaleFactor;
  const bestCaseTotalKB =
    bestCaseCreateKB + bestCaseEditOverheadKB * NUM_EDITS;
  const bestCaseRatio = bestCaseTotalKB / targetTotalRawKB;

  console.log(`Target: ${NUM_ATTACHMENTS} x ${TARGET_BLOB_SIZE_BYTES / 1024}KB = ${targetTotalRawKB} KB raw`);
  console.log(`Scale factor: ${scaleFactor}x`);
  console.log("");
  console.log("Worst case (full copy per edit):");
  console.log(
    `  Growth: ${worstCaseTotalKB.toFixed(0)} KB, ratio: ${worstCaseRatio.toFixed(2)}x -> ${worstCaseRatio <= 5.0 ? "PASS" : "FAIL"}`,
  );
  console.log("Best case (Dolt deduplicates):");
  console.log(
    `  Growth: ${bestCaseTotalKB.toFixed(0)} KB, ratio: ${bestCaseRatio.toFixed(2)}x -> ${bestCaseRatio <= 5.0 ? "PASS" : "FAIL"}`,
  );

  // Cleanup
  console.log("\nCleaning up...");
  try {
    exec(`bd close ${issueId}`);
    console.log(`Closed issue ${issueId}`);
  } catch (e) {
    console.error(`Warning: failed to close issue: ${e}`);
  }
  try {
    exec(`bd delete ${issueId} --force`);
    console.log(`Deleted issue ${issueId}`);
  } catch (e) {
    console.log(
      `Note: could not delete issue (may remain as closed): ${e}`,
    );
  }
  try {
    unlinkSync(TMP_FILE);
  } catch {
    // ignore
  }

  console.log("\nDone.");
  process.exit(pass ? 0 : 1);
}

main();
