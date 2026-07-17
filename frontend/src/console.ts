// 辅助函数：将 FileReader 包装为 Promise，确保顺序不乱
function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 异步打印图片函数
async function consoleImg(url: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const base64data = await readAsDataURL(blob);
    
    console.log(
      "%c ",
      `
        background-image: url('${base64data}');
        background-size: contain;
        background-repeat: no-repeat;
         font-size: 0;      /* 消除字符宽度干扰 */
        line-height: 0;    /* 消除行高干扰 */
        padding: 40px;     /* 上下左右各 40px，撑开 80px * 80px 的完美正方形 */
      `,
    );
  } catch (err) {
    console.error('打印图片失败:', err);
  }
}

// 标签样式配置
const tagLeft = 'background: #35495e; color: #fff; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: bold;';
const textRight1 = 'background: #FFB7B2; color: #fff; padding: 4px 12px; border-radius: 0 4px 4px 0; font-weight: bold;';
const textRight2 = 'background: #FFDAC1; color: #7F5539; padding: 4px 12px; border-radius: 0 4px 4px 0; font-weight: bold;';
const textRight3 = 'background: #B5EAD7; color: #2D5A27; padding: 4px 12px; border-radius: 0 4px 4px 0; font-weight: bold;';

// 顺序打印主函数
export async function consoleToConsole() {
  console.log('%c疑惑的%c这是......干啥呢？', tagLeft, textRight1);
  await consoleImg("./c1.png");
  console.log('%c害怕的%c不会是冲我来的吧...', tagLeft, textRight2);
  await consoleImg("./c2.png");
  console.log('%c软软的%c不要遍历我a（哭）', tagLeft, textRight3);
}