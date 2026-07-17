/**
 * Test script for PL Image Query WASM module
 * Run: node test/test.js
 */

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { PlImageQuery, buildOssUrl } = await import("../build/pl_image_query.js");

const BUILD_DIR = path.resolve(__dirname, "../build");
const WASM_PATH = path.join(BUILD_DIR, "pl_image_query.wasm");
const ENC_DATA_PATH = path.join(BUILD_DIR, "data.enc");
const SAMPLE_PATH = path.join(BUILD_DIR, "sample_expected.json");

async function runTests() {
  console.log("=== PL Image Query WASM Test ===\n");

  // Check files exist
  if (!fs.existsSync(WASM_PATH)) {
    console.error("ERROR: WASM file not found:", WASM_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(ENC_DATA_PATH)) {
    console.error("ERROR: Encrypted data file not found:", ENC_DATA_PATH);
    process.exit(1);
  }

  console.log("WASM size:", (fs.statSync(WASM_PATH).size / 1024).toFixed(1), "KB");
  console.log("Data size:", (fs.statSync(ENC_DATA_PATH).size / 1024).toFixed(1), "KB");

  // Load expected sample data
  const expectedData = JSON.parse(fs.readFileSync(SAMPLE_PATH, "utf-8"));
  const testDates = Object.keys(expectedData);

  // Create instance
  console.log("\n--- Initializing WASM module ---");
  const query = await PlImageQuery.create(ENC_DATA_PATH, WASM_PATH);

  if (!query.isInitialized()) {
    console.error("FAIL: Module not initialized");
    process.exit(1);
  }
  console.log("PASS: Module initialized");
  console.log("Total entries:", query.getEntryCount());

  // Test each sample date
  console.log("\n--- Testing date queries ---");
  let allPassed = true;

  for (const date of testDates) {
    const results = query.queryByDate(date);
    const expected = expectedData[date];

    // Build expected results in the same format as WASM output
    const expectedFormatted = expected.map((e) => {
      const timeStr = e.time;
      const timeDisplay = timeStr.substring(0, 2) + ":" + timeStr.substring(3, 5) + ":" + timeStr.substring(6, 8);
      const typeStr = e.type === 0 ? "discussions" : "experiments";
      const pathStr = `${typeStr}/data_${e.date}_${timeStr}.json.jpg`;
      return { time: timeDisplay, path: pathStr };
    });

    // Sort both for comparison
    const sortFn = (a, b) => a.path.localeCompare(b.path);
    results.sort(sortFn);
    expectedFormatted.sort(sortFn);

    const match = JSON.stringify(results) === JSON.stringify(expectedFormatted);
    if (match) {
      console.log(`PASS: ${date} — ${results.length} entries`);
    } else {
      console.log(`FAIL: ${date}`);
      console.log(`  Expected: ${expectedFormatted.length} entries`);
      console.log(`  Got: ${results.length} entries`);
      if (results.length > 0) {
        console.log(`  Sample result: ${JSON.stringify(results[0])}`);
      }
      if (expectedFormatted.length > 0) {
        console.log(`  Sample expected: ${JSON.stringify(expectedFormatted[0])}`);
      }
      allPassed = false;
    }
  }

  // Test invalid date format
  console.log("\n--- Testing invalid input ---");
  const invalidResults = query.queryByDate("invalid");
  if (invalidResults.length === 0) {
    console.log("PASS: Invalid date rejected");
  } else {
    console.log("FAIL: Invalid date should return empty");
    allPassed = false;
  }

  const invalidResults2 = query.queryByDate("2024-13-45");
  if (invalidResults2.length === 0) {
    console.log("PASS: Out-of-range date rejected");
  } else {
    console.log("FAIL: Out-of-range date should return empty");
    allPassed = false;
  }

  // Test empty date
  const emptyResults = query.queryByDate("");
  if (emptyResults.length === 0) {
    console.log("PASS: Empty date rejected");
  } else {
    console.log("FAIL: Empty date should return empty");
    allPassed = false;
  }

  // Test non-existent date (valid format but no data)
  const nonExistent = query.queryByDate("2020-01-01");
  if (nonExistent.length === 0) {
    console.log("PASS: Non-existent date returns empty");
  } else {
    console.log("FAIL: Non-existent date should return empty");
    allPassed = false;
  }

  // Test rate limiting
  console.log("\n--- Testing rate limiting ---");
  console.log("Remaining queries:", query.getRemainingQueries());

  // Check OSS URL construction
  console.log("\n--- Testing OSS URL construction ---");
  const sampleResults = query.queryByDate(testDates[0]);
  if (sampleResults.length > 0) {
    const url = buildOssUrl(sampleResults[0].path);
    console.log("Sample OSS URL:", url);
    if (url.startsWith("https://pl-in-2025.oss-cn-chengdu.aliyuncs.com/")) {
      console.log("PASS: OSS URL format correct");
    } else {
      console.log("FAIL: OSS URL format incorrect");
      allPassed = false;
    }
  }

  // Summary
  console.log("\n=== Test Summary ===");
  if (allPassed) {
    console.log("ALL TESTS PASSED ✓");
  } else {
    console.log("SOME TESTS FAILED ✗");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
