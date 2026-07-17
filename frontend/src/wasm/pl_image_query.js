/**
 * PL Image Query — JS Glue Code
 *
 * Usage (browser):
 *   import { PlImageQuery } from "./pl_image_query.js";
 *   const query = await PlImageQuery.create("./data.enc", "./pl_image_query.wasm");
 *   const results = query.queryByDate("2024-06-09");
 *   // [{ time: "12:44:49", path: "discussions/data_2024-06-09_12-44-49.json.jpg" }, ...]
 *
 * Usage (Node.js):
 *   const { PlImageQuery } = require("./pl_image_query.js");
 *   const query = await PlImageQuery.create("./data.enc", "./pl_image_query.wasm");
 *
 * Anti-cracking: max 200 queries per instance, data stays in WASM memory.
 */

/**
 * Result entry for a date query.
 * @typedef {Object} ImageEntry
 * @property {string} time - "HH:MM:SS" format
 * @property {string} path - OSS object key, e.g. "discussions/data_2024-06-09_12-44-49.json.jpg"
 */

/**
 * Construct the full OSS URL from a path.
 * @param {string} path - OSS object key from query result
 * @returns {string} Full URL
 */
export function buildOssUrl(path) {
  return `https://pl-in-2025.oss-cn-chengdu.aliyuncs.com/${path}`;
}

/**
 * PL Image Query class — wraps the WASM module with a clean API.
 */
export class PlImageQuery {
  constructor(wasmInstance) {
    this._wasm = wasmInstance.exports;
    this._memory = wasmInstance.exports.memory;
  }

  /**
   * Create a PlImageQuery instance by loading WASM and encrypted data.
   * @param {string} encDataPath - Path or URL to data.enc file.
   * @param {string} wasmPath - Path or URL to .wasm file.
   * @returns {Promise<PlImageQuery>}
   */
  static async create(encDataPath, wasmPath) {
    const isNode =
      typeof process !== "undefined" && process.versions && process.versions.node;

    // Load encrypted data
    let encryptedData;
    if (isNode) {
      const { readFileSync } = await import("fs");
      encryptedData = new Uint8Array(readFileSync(encDataPath));
    } else if (typeof fetch !== "undefined") {
      const resp = await fetch(encDataPath);
      if (!resp.ok) {
        throw new Error(`Failed to load encrypted data: ${resp.status}`);
      }
      encryptedData = new Uint8Array(await resp.arrayBuffer());
    } else {
      throw new Error("No method available to load encrypted data");
    }

    // Load WASM
    let wasmBinary;
    if (isNode) {
      const { readFileSync } = await import("fs");
      wasmBinary = readFileSync(wasmPath);
    } else if (typeof fetch !== "undefined") {
      const resp = await fetch(wasmPath);
      wasmBinary = await resp.arrayBuffer();
    } else {
      throw new Error("No method available to load WASM");
    }

    // Instantiate WASM
    const wasmModule = await WebAssembly.instantiate(wasmBinary, {
      env: {
        abort: (msg, file, line, column) => {
          console.error("WASM abort:", msg, file, line, column);
        },
      },
    });

    const instance = wasmModule.instance || wasmModule;
    const query = new PlImageQuery(instance);

    // Initialize with encrypted data
    if (!query._init(encryptedData)) {
      throw new Error("WASM initialization failed");
    }

    return query;
  }

  /**
   * Initialize WASM module with encrypted data.
   * @param {Uint8Array} encryptedData
   * @returns {boolean}
   * @private
   */
  _init(encryptedData) {
    const dataLen = encryptedData.length;

    // Allocate memory in WASM for the encrypted data
    const dataPtr = this._wasm.__new(dataLen, 1);

    // Copy encrypted data into WASM memory (create view after allocation)
    const view = new Uint8Array(this._memory.buffer, dataPtr, dataLen);
    view.set(encryptedData);

    // Pin the data to prevent GC from moving it during init/query
    if (this._wasm.__pin) {
      this._wasm.__pin(dataPtr);
    }

    // Call init — decrypts in-place
    const result = this._wasm.init(dataPtr, dataLen);

    return result === 1;
  }

  /**
   * Query images by date.
   * @param {string} date - Date string in "YYYY-MM-DD" format
   * @returns {ImageEntry[]} Array of image entries, or empty array if no match/rate limited
   */
  queryByDate(date) {
    const encoder = new TextEncoder();
    const dateBytes = encoder.encode(date);
    const dateLen = dateBytes.length;

    // Allocate memory for date string
    let datePtr;
    if (this._wasm.__new) {
      datePtr = this._wasm.__new(dateLen, 1);
    } else {
      const currentSize = this._memory.buffer.byteLength;
      const newPages = Math.ceil((dateLen + 8) / 65536);
      this._memory.grow(newPages);
      datePtr = currentSize;
    }

    // Write date bytes to WASM memory (create view after potential growth)
    const view = new Uint8Array(this._memory.buffer, datePtr, dateLen);
    view.set(dateBytes);

    // Call queryByDate
    const success = this._wasm.queryByDate(datePtr, dateLen);

    if (success !== 1) return [];

    // Read result from result buffer
    // Re-fetch memory buffer as it may have grown during the call
    const resultPtr = this._wasm.getResultPtr();
    const resultLen = this._wasm.getResultLen();

    if (resultLen === 0) return [];

    const resultView = new Uint8Array(this._memory.buffer, resultPtr, resultLen);
    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(resultView);

    try {
      return JSON.parse(jsonStr);
    } catch {
      return [];
    }
  }

  /**
   * Get remaining queries before rate limit.
   * @returns {number}
   */
  getRemainingQueries() {
    return this._wasm.getRemainingQueries();
  }

  /**
   * Check if the module is initialized.
   * @returns {boolean}
   */
  isInitialized() {
    return this._wasm.isInitialized() === 1;
  }

  /**
   * Get total entry count (for debugging).
   * @returns {number}
   */
  getEntryCount() {
    return this._wasm.getEntryCount();
  }
}

/**
 * Convenience function: create instance and query in one call.
 * @param {string} encDataPath - Path to data.enc
 * @param {string} wasmPath - Path to .wasm file
 * @param {string} date - Date to query
 * @returns {Promise<ImageEntry[]>}
 */
export async function queryImagesByDate(encDataPath, wasmPath, date) {
  const query = await PlImageQuery.create(encDataPath, wasmPath);
  return query.queryByDate(date);
}

