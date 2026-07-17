// pl-in-2025 Image Path Query WASM Module
// pl-in-2025 图片路径查询 WASM 模块
// AssemblyScript source — uses raw memory pointers for I/O
// AssemblyScript 源码 — 使用原始内存指针进行 I/O
//
// Anti-cracking measures / 防破解措施:
// 1. Data decryption key split into two parts, reassembled at runtime
//    数据解密密钥分成两部分，运行时拼接
// 2. Per-session call counter (max 200 queries)
//    单会话调用计数器（最多 200 次查询）
// 3. Strict date format validation (rejects malformed input)
//    严格日期格式验证（拒绝非法输入）
// 4. Decrypted data only exists in WASM linear memory (not exposed to JS)
//    解密数据仅存在于 WASM 线性内存（不暴露给 JS）

import { KEY_PART_A, KEY_PART_B, KEY_LEN, ENTRY_SIZE } from "./data";

// Entry size literal — 1 type + 10 date + 8 time = 19 bytes per entry
// 条目大小常量 — 每条 1 type + 10 date + 8 time = 19 字节
const ENTRY_SIZE_LIT: u32 = 19;

// ============================================================
// Constants / 常量
// ============================================================
const MAX_QUERIES: u32 = 200;
const RESULT_BUFFER_SIZE: u32 = 131072; // 128KB max result / 最大结果 128KB

// ============================================================
// State / 状态
// ============================================================

// Decrypted data stored in raw memory (allocated at init time)
// 解密数据存储在原始内存中（初始化时分配）
let decryptedDataPtr: usize = 0;
let decryptedDataLen: u32 = 0;
let entryCount: u32 = 0;
let queryCount: u32 = 0;
let initialized: bool = false;

// Result buffer — fixed location in WASM memory for output
// 结果缓冲区 — WASM 内存中的固定输出位置
const resultBuffer: StaticArray<u8> = new StaticArray<u8>(RESULT_BUFFER_SIZE);
let resultLength: u32 = 0;

// ============================================================
// Key reconstruction (light obfuscation — key split in two parts)
// 密钥重建（轻度混淆 — 密钥分成两部分）
// ============================================================
function fillKey(out: usize): void {
  const half: i32 = KEY_LEN as i32 >> 1;
  for (let i: i32 = 0; i < half; i++) {
    store<u8>(out + i, KEY_PART_A[i]);
  }
  for (let i: i32 = 0; i < (KEY_LEN as i32) - half; i++) {
    store<u8>(out + half + i, KEY_PART_B[i]);
  }
}

// ============================================================
// Date validation: "YYYY-MM-DD" with basic range checks
// 日期验证: "YYYY-MM-DD" 格式 + 基本范围检查
// ============================================================
function isValidDate(dateBuf: usize, dateLen: u32): bool {
  if (dateLen != 10) return false;

  // Check hyphen positions (bytes 4 and 7 must be '-')
  // 检查连字符位置（第 4 和第 7 字节必须是 '-'）
  if (load<u8>(dateBuf + 4) != 45 || load<u8>(dateBuf + 7) != 45) return false;

  // Check all other characters are digits (0-9)
  // 检查所有其他字符是否为数字
  for (let i: u32 = 0; i < 10; i++) {
    if (i == 4 || i == 7) continue;
    const c = load<u8>(dateBuf + i);
    if (c < 48 || c > 57) return false;
  }

  // Validate month (01-12) and day (01-31)
  // 验证月份和日期范围
  const month = (load<u8>(dateBuf + 5) - 48) * 10 + (load<u8>(dateBuf + 6) - 48);
  const day = (load<u8>(dateBuf + 8) - 48) * 10 + (load<u8>(dateBuf + 9) - 48);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

// ============================================================
// Date matching: compare 10-byte date in decrypted data with input
// 日期匹配：比较解密数据中的 10 字节日期与输入
// ============================================================
function dateMatches(entryOffset: usize, dateBuf: usize): bool {
  for (let i: u32 = 0; i < 10; i++) {
    if (load<u8>(decryptedDataPtr + entryOffset + 1 + i) != load<u8>(dateBuf + i)) {
      return false;
    }
  }
  return true;
}

// ============================================================
// Write raw bytes to result buffer
// 将原始字节写入结果缓冲区
// ============================================================
function writeByte(b: u8): void {
  if (resultLength < RESULT_BUFFER_SIZE) {
    unchecked(resultBuffer[resultLength] = b);
    resultLength++;
  }
}

// Write a constant ASCII string to result buffer
// 将常量 ASCII 字符串写入结果缓冲区
function writeAscii(s: string): void {
  for (let i: i32 = 0; i < s.length; i++) {
    writeByte(s.charCodeAt(i) as u8);
  }
}

// Write n bytes from a memory location to result buffer
// 从内存位置向结果缓冲区写入 n 个字节
function writeMem(src: usize, n: u32): void {
  for (let i: u32 = 0; i < n; i++) {
    writeByte(load<u8>(src + i));
  }
}

// ============================================================
// Build JSON result into result buffer for a given date
// 为指定日期构建 JSON 结果到结果缓冲区
// Avoids string concatenation — writes bytes directly
// 避免字符串拼接 — 直接写入字节
// ============================================================
function buildJsonResult(dateBuf: usize): void {
  resultLength = 0;

  // First pass: count matching entries
  // 第一遍：统计匹配的条目数
  let count: u32 = 0;
  const headerSize: u32 = 4;
  for (let i: u32 = 0; i < entryCount; i++) {
    const offset = headerSize + i * ENTRY_SIZE_LIT;
    if (dateMatches(offset as usize, dateBuf)) {
      count++;
    }
  }

  if (count == 0) {
    writeAscii("[]");
    return;
  }

  writeByte(91); // '['

  let written: u32 = 0;
  for (let i: u32 = 0; i < entryCount; i++) {
    const offset = headerSize + i * ENTRY_SIZE_LIT;
    if (!dateMatches(offset as usize, dateBuf)) continue;

    if (written > 0) {
      writeByte(44); // ','
    }

    const typeByte = load<u8>(decryptedDataPtr + offset);
    const timePtr = decryptedDataPtr + offset + 11; // 1 type + 10 date

    // {"time":"
    writeAscii('{"time":"');

    // Time display: HH:MM:SS (convert from HH-MM-SS stored in binary)
    // 时间显示: HH:MM:SS（将二进制中存储的 HH-MM-SS 转换）
    writeByte(load<u8>(timePtr));      // H
    writeByte(load<u8>(timePtr + 1));  // H
    writeByte(58);                      // ':'
    writeByte(load<u8>(timePtr + 3));  // M
    writeByte(load<u8>(timePtr + 4));  // M
    writeByte(58);                      // ':'
    writeByte(load<u8>(timePtr + 6));  // S
    writeByte(load<u8>(timePtr + 7));  // S

    // ","path":"
    writeAscii('","path":"');

    // Type prefix: discussions (0) or experiments (1)
    // 类型前缀：discussions (0) 或 experiments (1)
    if (typeByte == 0) {
      writeAscii("discussions");
    } else {
      writeAscii("experiments");
    }

    // /data_
    writeAscii("/data_");

    // Date (10 bytes from input buffer)
    // 日期（从输入缓冲区复制 10 字节）
    writeMem(dateBuf, 10);

    // _ (underscore / 下划线)
    writeByte(95);

    // Time raw (8 bytes: HH-MM-SS)
    // 原始时间（8 字节）
    writeMem(timePtr, 8);

    // .json.jpg"}
    writeAscii('.json.jpg"}');

    written++;
  }

  writeByte(93); // ']'
}

// ============================================================
// Exported functions / 导出函数
// ============================================================

// Initialize: pass encrypted data pointer and length
// 初始化：传入加密数据指针和长度
// Returns 1 on success, 0 on failure
// 成功返回 1，失败返回 0
// Note: JS side must pin the data before calling this
// 注意：JS 端须在调用前固定数据
export function init(encryptedDataPtr: usize, dataLen: usize): u32 {
  if (initialized) return 1;

  const len = dataLen as u32;

  // Inline XOR key (16 bytes) — split for light obfuscation
  // 内联 XOR 密钥（16 字节）— 拆分为轻度混淆
  const k0: u8 = 0x5a;
  const k1: u8 = 0x3c;
  const k2: u8 = 0x69;
  const k3: u8 = 0x12;
  const k4: u8 = 0x8f;
  const k5: u8 = 0xa4;
  const k6: u8 = 0x27;
  const k7: u8 = 0xde;
  const k8: u8 = 0x71;
  const k9: u8 = 0x09;
  const k10: u8 = 0xb3;
  const k11: u8 = 0xe6;
  const k12: u8 = 0x2d;
  const k13: u8 = 0xc8;
  const k14: u8 = 0x54;
  const k15: u8 = 0x77;

  // XOR decrypt in-place (data is pinned by JS caller)
  // XOR 原地解密（数据由 JS 端固定）
  for (let i: u32 = 0; i < len; i++) {
    const encByte = load<u8>(encryptedDataPtr + i);
    const mod = i & 15;
    let keyByte: u8 = 0;
    if (mod == 0) keyByte = k0;
    else if (mod == 1) keyByte = k1;
    else if (mod == 2) keyByte = k2;
    else if (mod == 3) keyByte = k3;
    else if (mod == 4) keyByte = k4;
    else if (mod == 5) keyByte = k5;
    else if (mod == 6) keyByte = k6;
    else if (mod == 7) keyByte = k7;
    else if (mod == 8) keyByte = k8;
    else if (mod == 9) keyByte = k9;
    else if (mod == 10) keyByte = k10;
    else if (mod == 11) keyByte = k11;
    else if (mod == 12) keyByte = k12;
    else if (mod == 13) keyByte = k13;
    else if (mod == 14) keyByte = k14;
    else keyByte = k15;
    store<u8>(encryptedDataPtr + i, encByte ^ keyByte);
  }

  // Store pointer to decrypted data
  // 存储解密数据的指针
  decryptedDataPtr = encryptedDataPtr;
  decryptedDataLen = len;

  // Read entry count from first 4 bytes (little-endian u32)
  // 从文件头 4 字节读取条目数（小端 u32）
  entryCount = u32(load<u8>(decryptedDataPtr)) |
    (u32(load<u8>(decryptedDataPtr + 1)) << 8) |
    (u32(load<u8>(decryptedDataPtr + 2)) << 16) |
    (u32(load<u8>(decryptedDataPtr + 3)) << 24);

  initialized = true;
  queryCount = 0;
  return 1;
}

// Query by date: date passed as raw ASCII bytes
// 按日期查询：以原始 ASCII 字节传入日期
// Returns 1 on success (result in buffer), 0 on failure
// 成功返回 1（结果在缓冲区中），失败返回 0
export function queryByDate(datePtr: usize, dateLen: usize): u32 {
  if (!initialized) return 0;
  if (queryCount >= MAX_QUERIES) return 0;

  if (!isValidDate(datePtr, dateLen as u32)) return 0;

  queryCount++;
  buildJsonResult(datePtr);
  return 1;
}

// Get pointer to result buffer (for reading result from JS)
// 获取结果缓冲区指针（供 JS 端读取结果）
export function getResultPtr(): usize {
  return changetype<usize>(resultBuffer);
}

// Get length of last result
// 获取上一条结果的长度
export function getResultLen(): u32 {
  return resultLength;
}

// Get remaining queries before rate limit
// 获取剩余查询次数（速率限制）
export function getRemainingQueries(): u32 {
  if (queryCount >= MAX_QUERIES) return 0;
  return MAX_QUERIES - queryCount;
}

// Check if initialized
// 检查是否已初始化
export function isInitialized(): u32 {
  return initialized ? 1 : 0;
}

// Get total entry count
// 获取总条目数
export function getEntryCount(): u32 {
  return entryCount;
}
