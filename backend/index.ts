import fs from "fs/promises";
import path from "path";
import { chromium } from "playwright";
import { uploadFile } from "./upload";

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
  for (const item of ghContent.tree) {
    // path like data_2024-06-10_07-24-44.json
    if (logsContent.includes(item.path)) {
      console.log(`Skipped ${item.path} as it is already processed.`);
      continue
    };
    try {
      const fileBuffer = await generateImg(item,type);
      console.log(item)
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

async function generateImg(item: any,type: "experiments" | "discussions") {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
  });
  const page = await context.newPage();
  void (await page.goto(`http://localhost:5173/#${type === "experiments" ? "" : "b"}/?filepath=${item.path}`, {
    waitUntil: "networkidle",
  }));
  await page.waitForTimeout(1000)
  return await page.screenshot({
    type: "jpeg",
    quality: 80,
  });
}

main("experiments").catch(console.error);
