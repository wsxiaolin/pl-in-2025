/**
 * Data Preprocessing Script / 数据预处理脚本
 *
 * Reads discussions_output.txt and experiments_output.txt,
 * combines entries into a compact binary format, XOR-encrypts the data,
 * and writes the encrypted blob to build/data.enc.
 *
 * 读取 discussions_output.txt 和 experiments_output.txt，
 * 将条目合并为紧凑的二进制格式，XOR 加密后写入 build/data.enc。
 *
 * Also generates assembly/data.ts containing the XOR key and metadata
 * as an AssemblyScript source file.
 *
 * 同时生成 assembly/data.ts，包含 XOR 密钥和元数据（AssemblyScript 源码）。
 *
 * Binary format (before encryption) / 二进制格式（加密前）:
 *   [u32 entryCount]
 *   For each entry / 每条条目:
 *     [u8 type]     0=discussions, 1=experiments
 *     [10 bytes date]  ASCII "YYYY-MM-DD"
 *     [8 bytes time]   ASCII "HH-MM-SS"
 *   Total / 总计: 4 + N*19 bytes
 *
 * Usage / 用法: npx tsx scripts/preprocess.ts <path-to-repo-backend>
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- XOR key (16 bytes, will be embedded in WASM) ---
// This key is deliberately split in the AssemblyScript source for light obfuscation.
// XOR 密钥（16 字节，将嵌入 WASM）
// 密钥有意在 AssemblyScript 源码中拆分为两部分，实现轻度混淆
const XOR_KEY = [
  0x5a, 0x3c, 0x69, 0x12, 0x8f, 0xa4, 0x27, 0xde,
  0x71, 0x09, 0xb3, 0xe6, 0x2d, 0xc8, 0x54, 0x77,
];

// OSS bucket base URL / OSS 存储桶基础 URL
const OSS_BASE = "https://pl-in-2025.oss-cn-chengdu.aliyuncs.com";

interface Entry {
  type: 0 | 1; // 0=discussions, 1=experiments
  date: string; // "YYYY-MM-DD"
  time: string; // "HH-MM-SS"
  filename: string; // "data_2024-06-09_12-44-49.json"
}

// Parse a single output file into Entry array
// 解析单个 output 文件，返回 Entry 数组
function parseOutputFile(filepath: string, type: 0 | 1): Entry[] {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const entries: Entry[] = [];

  for (const line of lines) {
    // Format: date$filename, e.g. "2024-06-09$data_2024-06-09_12-44-49.json"
    // 格式：date$filename，例如 "2024-06-09$data_2024-06-09_12-44-49.json"
    const parts = line.split("$");
    if (parts.length !== 2) continue;
    const date = parts[0].trim();
    const filename = parts[1].trim();

    // Extract time components from filename
    // 从文件名中提取时间
    const match = filename.match(
      /data_(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.json/,
    );
    if (!match) continue;

    const timeStr = `${match[2]}-${match[3]}-${match[4]}`;
    entries.push({ type, date, time: timeStr, filename });
  }

  return entries;
}

// Encode entries to compact binary format
// 将条目编码为紧凑的二进制格式
// 4 bytes header (entry count) + 19 bytes per entry
// 4 字节头（条目数）+ 每条 19 字节
function encodeBinary(entries: Entry[]): Uint8Array {
  const buf = Buffer.alloc(4 + entries.length * 19);
  buf.writeUInt32LE(entries.length, 0);

  let offset = 4;
  for (const entry of entries) {
    buf[offset] = entry.type;
    offset++;
    buf.write(entry.date, offset, "ascii");
    offset += 10;
    buf.write(entry.time, offset, "ascii");
    offset += 8;
  }

  return new Uint8Array(buf);
}

// XOR encrypt data with the given key
// 使用指定密钥 XOR 加密数据
function xorEncrypt(data: Uint8Array, key: number[]): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ key[i % key.length];
  }
  return result;
}

function main() {
  // Default to ../data relative to the scripts directory
  // 默认使用 ../data（相对于 scripts 目录）
  const backendDir = process.argv[2] || path.resolve(__dirname, "../data");

  console.log("Reading data files...");
  const discussions = parseOutputFile(
    path.resolve(backendDir, "discussions_output.txt"),
    0,
  );
  const experiments = parseOutputFile(
    path.resolve(backendDir, "experiments_output.txt"),
    1,
  );

  console.log(
    `Parsed: ${discussions.length} discussions, ${experiments.length} experiments`,
  );

  const allEntries = [...discussions, ...experiments];
  console.log(`Total entries: ${allEntries.length}`);

  // Sort by date then time for consistent output
  // 按日期和时间排序，保证输出一致性
  allEntries.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  // Encode to binary / 编码为二进制
  const binaryData = encodeBinary(allEntries);
  console.log(`Binary data size: ${binaryData.length} bytes`);

  // Encrypt / 加密
  const encryptedData = xorEncrypt(binaryData, XOR_KEY);
  console.log(`Encrypted data size: ${encryptedData.length} bytes`);

  // Write encrypted data file / 写入加密数据文件
  const buildDir = path.resolve(__dirname, "../build");
  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

  const dataPath = path.join(buildDir, "data.enc");
  fs.writeFileSync(dataPath, encryptedData);
  console.log(`Encrypted data written to: ${dataPath}`);

  // Write sample test data (unencrypted, for verification)
  // 写入样本测试数据（未加密，用于验证）
  const sampleDates = [...new Set(allEntries.map((e) => e.date))].slice(0, 5);
  const sampleData: Record<string, Entry[]> = {};
  for (const date of sampleDates) {
    sampleData[date] = allEntries.filter((e) => e.date === date);
  }
  const samplePath = path.join(buildDir, "sample_expected.json");
  fs.writeFileSync(
    samplePath,
    JSON.stringify(
      sampleData,
      null,
      2,
    ),
  );
  console.log(`Sample expected results written to: ${samplePath}`);

  // Write metadata / 写入元数据
  const meta = {
    ossBase: OSS_BASE,
    entryCount: allEntries.length,
    discussionsCount: discussions.length,
    experimentsCount: experiments.length,
    uniqueDates: new Set(allEntries.map((e) => e.date)).size,
    dateRange: {
      start: allEntries[0]?.date,
      end: allEntries[allEntries.length - 1]?.date,
    },
    encryptedDataSize: encryptedData.length,
    xorKeyLength: XOR_KEY.length,
  };
  const metaPath = path.join(buildDir, "meta.json");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`Metadata written to: ${metaPath}`);

  // Generate AssemblyScript key file (key split in two parts for obfuscation)
  // 生成 AssemblyScript 密钥文件（密钥分为两部分进行混淆）
  const keyParts = XOR_KEY.map((b) => `0x${b.toString(16).padStart(2, "0")}`);
  const asKeySource = `// Auto-generated by preprocess.ts — DO NOT EDIT
// XOR key parts (obfuscated: reassembled at runtime)
export const KEY_PART_A: u8[] = [${keyParts.slice(0, 8).join(", ")}];
export const KEY_PART_B: u8[] = [${keyParts.slice(8).join(", ")}];
export const KEY_LEN: u32 = ${XOR_KEY.length};
export const ENTRY_SIZE: u32 = 19; // 1 type + 10 date + 8 time
`;
  const keyPath = path.resolve(__dirname, "../assembly/data.ts");
  fs.writeFileSync(keyPath, asKeySource);
  console.log(`AssemblyScript key file written to: ${keyPath}`);

  console.log("\nDone! Preprocessing complete.");
}

main();
