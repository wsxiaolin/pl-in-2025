import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const i18nDir = path.join(root, "src", "i18n");
const files = {
  Chinese: "zh.ts",
  English: "en.ts",
  German: "de.ts",
  French: "fr.ts",
  Japanese: "ja.ts",
};

function loadLocale(fileName) {
  const fullPath = path.join(i18nDir, fileName);
  const source = fs.readFileSync(fullPath, "utf8");
  const script = source.replace(/^\s*export\s+default\s+/, "module.exports = ");
  const context = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(script, context, { filename: fileName });
  return context.module.exports;
}

function flatten(obj, prefix = "") {
  const out = new Map();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [ck, cv] of flatten(v, key)) out.set(ck, cv);
    } else {
      out.set(key, v);
    }
  }
  return out;
}

const locales = Object.fromEntries(
  Object.entries(files).map(([locale, file]) => [locale, flatten(loadLocale(file))]),
);

const zhMap = locales.Chinese;
const errors = [];

for (const [locale, map] of Object.entries(locales)) {
  if (locale === "Chinese") continue;

  for (const key of zhMap.keys()) {
    if (!map.has(key)) {
      errors.push(`[${locale}] missing key: ${key}`);
    }
  }

  for (const [key, value] of map.entries()) {
    if (!zhMap.has(key)) {
      errors.push(`[${locale}] extra key not in zh baseline: ${key}`);
      continue;
    }

    if (
      locale === "English" &&
      typeof value === "string" &&
      !key.startsWith("settings.languageOptions.") &&
      /[\u3400-\u9FFF]/u.test(value)
    ) {
      errors.push(`[${locale}] contains CJK characters (possible untranslated): ${key}`);
    }
  }
}

if (errors.length > 0) {
  console.error("i18n check failed:\n" + errors.join("\n"));
  process.exit(1);
}

console.log("i18n check passed: all locale keys are aligned and translated.");
