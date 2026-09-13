import { readFile } from "node:fs/promises";
import { writeFile } from "node:fs/promises";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";

const fontBytes = await readFile("/home/ubuntu/webdev-static-assets/WenQuanYiZenHei.ttf");
const pdf = await PDFDocument.create();
pdf.registerFontkit(fontkit);
const font = await pdf.embedFont(fontBytes, { subset: true });
const page = pdf.addPage([200, 100]);
page.drawText("清水高中媒服 QR 測試", { x: 12, y: 50, size: 12, font });
const bytes = await pdf.save();
await writeFile("/tmp/qssh-cjk-font-diagnostic.pdf", bytes);
console.log(JSON.stringify({ embedded: true, bytes: bytes.length, fontName: font.name }));
