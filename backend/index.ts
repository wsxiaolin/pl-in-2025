import fs from "fs/promises";
import path from "path";
import { chromium, Browser } from "playwright";
import { uploadFile } from "./upload";

const CONCURRENCY = 4;

async function main(type: "experiments" | "discussions") {
  const rawGhContent = await fs.readFile(
    path.join(process.cwd(), `./${type}.json`),
    "utf-8",
  );
  const logsRawContent = await fs.readFile(
    path.join(process.cwd(), `./${type}_logs.txt`),
    "utf-8",
  );

  const ghContent = JSON.parse(rawGhContent);
  const logsContent = logsRawContent.split("\n");

  const queue = [...ghContent.tree];

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    async function worker() {
      while (true) {
        const item = queue.shift();
        if (!item) return;

        if (logsContent.includes(item.path)) {
          console.log(`Skipped ${item.path} as it is already processed.`);
          continue;
        }

        try {
          const fileBuffer = await generateImg(browser, item, type);

          const date = item.path.split("_")[1];

          await uploadFile(`${type}/${item.path}.jpg`, fileBuffer);

          await fs.appendFile(
            path.join(process.cwd(), `./${type}_logs.txt`),
            `${item.path}\n`,
          );

          await fs.appendFile(
            path.join(process.cwd(), `./${type}_output.txt`),
            `${date}$${item.path}\n`,
          );

          console.log(`Processed ${item.path} successfully.`);
        } catch (error) {
          console.error(`Error processing ${item.path}:`, error);
        }
      }
    }

    await Promise.all(
      Array.from({ length: CONCURRENCY }, () => worker()),
    );
  } finally {
    await browser.close().catch(() => {});
  }
}

async function generateImg(
  browser: Browser,
  item: any,
  type: "experiments" | "discussions",
) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
  });

  try {
    const page = await context.newPage();

    await page.goto(
      `http://localhost:5173/#${
        type === "experiments" ? "" : "b"
      }/?filepath=${item.path.replace(".json", "")}`,
      {
        waitUntil: "networkidle",
      },
    );

    return await page.screenshot({
      type: "jpeg",
      quality: 80,
    });
  } finally {
    await context.close().catch(() => {});
  }
}

main("experiments").catch(console.error);
