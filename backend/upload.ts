import OSS from "ali-oss";

function checkEnvVariables() {
  const requiredEnvVars = ["OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET"];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }
}

checkEnvVariables();

const client = new OSS({
  region: "oss-cn-chengdu",
  accessKeyId: process.env.OSS_ACCESS_KEY_ID as string,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET as string,
  bucket: "pl-in-202t-test",
});


export async function uploadFile(ossPath: string, fileSource: Buffer) {
  try {
    const result = await client.put(ossPath, fileSource);
    return result.url;
  } catch (error) {
    console.error("OSS 上传失败:", error);
    return ""
  }
}
