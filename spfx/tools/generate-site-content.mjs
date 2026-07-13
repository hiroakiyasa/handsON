import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const webPart = resolve(here, '../src/webparts/copilotHandsOn');
const repositoryRoot = resolve(here, '../..');
const html = readFileSync(resolve(repositoryRoot, 'index.html'), 'utf8');
let css = readFileSync(resolve(repositoryRoot, 'styles.css'), 'utf8');

const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
if (!bodyMatch) throw new Error('site-template.html に body がありません。');

const body = bodyMatch[1]
  .replace(/<script\b[\s\S]*?<\/script>/gi, '')
  .trim();

// Shadow DOM内にはbody要素がないため、元CSSのbody指定だけをラッパーへ置換します。
css = css.replace(/:root\b/g, ':host');
css = css.replace(/\bbody\.large-text\b/g, '.hands-on-body.large-text');
css = css.replace(/\bbody\b/g, '.hands-on-body');

const assetPaths = [...body.matchAll(/(?:src|href)="(assets\/(?:images|illustrations)\/[^"?#]+)"/g)]
  .map(match => match[1]);
const uniqueAssets = [...new Set(assetPaths)].sort();

uniqueAssets.forEach(asset => {
  const destination = resolve(webPart, asset);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(resolve(repositoryRoot, asset), destination);
});

const imports = uniqueAssets.map((asset, index) =>
  `import asset${index} from './${asset}';`
).join('\n');
const mapEntries = uniqueAssets.map((asset, index) =>
  `  '${asset}': asset${index}`
).join(',\n');

const output = `// このファイルは tools/generate-site-content.mjs から生成されます。\n${imports}\n\nexport const siteHtml: string = ${JSON.stringify(body)};\nexport const siteCss: string = ${JSON.stringify(css)};\nexport const siteAssets: Record<string, string> = {\n${mapEntries}\n};\n`;

writeFileSync(resolve(webPart, 'siteContent.ts'), output, 'utf8');
console.log(`siteContent.ts を生成しました（画像 ${uniqueAssets.length}件）。`);
