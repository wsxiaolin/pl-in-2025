/**
 * PL Image Query — TypeScript Type Definitions
 */

/**
 * Result entry for a date query.
 */
export interface ImageEntry {
  /** Time in "HH:MM:SS" format */
  time: string;
  /** OSS object key, e.g. "discussions/data_2024-06-09_12-44-49.json.jpg" */
  path: string;
}

/**
 * PL Image Query WASM module wrapper.
 */
export declare class PlImageQuery {
  /**
   * Create and initialize a PlImageQuery instance.
   * @param encDataPath - Path or URL to data.enc file
   * @param wasmPath - Path or URL to .wasm file
   * @returns Initialized PlImageQuery instance
   */
  static create(encDataPath: string, wasmPath: string): Promise<PlImageQuery>;

  /**
   * Query images by date.
   * @param date - Date string in "YYYY-MM-DD" format
   * @returns Array of image entries, or empty array if no match/rate limited
   */
  queryByDate(date: string): ImageEntry[];

  /**
   * Get remaining queries before rate limit.
   * @returns Remaining query count (max 200 per session)
   */
  getRemainingQueries(): number;

  /**
   * Check if the module is initialized.
   */
  isInitialized(): boolean;

  /**
   * Get total entry count.
   */
  getEntryCount(): number;
}

/**
 * Construct the full OSS URL from a path.
 * @param path - OSS object key from query result
 * @returns Full URL
 */
export declare function buildOssUrl(path: string): string;

/**
 * Convenience function: create instance and query in one call.
 */
export declare function queryImagesByDate(
  encDataPath: string,
  wasmPath: string,
  date: string
): Promise<ImageEntry[]>;
