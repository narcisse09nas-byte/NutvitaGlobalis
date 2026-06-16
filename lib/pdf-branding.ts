import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type PDFDocument, type PDFImage, type PDFPage, rgb } from "pdf-lib";

const pageWidth = 595;
const pageHeight = 842;
const headerPath = path.join(process.cwd(), "public", "brand", "nutvita-document-header.png");
const footerPath = path.join(process.cwd(), "public", "brand", "nutvita-document-footer.png");

let headerBytes: Promise<Uint8Array> | undefined;
let footerBytes: Promise<Uint8Array> | undefined;

async function loadPng(filePath: string) {
  return new Uint8Array(await readFile(filePath));
}

export async function drawNutvitaDocumentBranding(pdf: PDFDocument, page: PDFPage) {
  headerBytes ||= loadPng(headerPath);
  footerBytes ||= loadPng(footerPath);
  const [headerImage, footerImage] = await Promise.all([
    pdf.embedPng(await headerBytes),
    pdf.embedPng(await footerBytes),
  ]);
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) });
  page.drawImage(headerImage, { x: 0, y: pageHeight - 110, width: pageWidth, height: 110 });
  page.drawImage(footerImage, { x: 0, y: 0, width: pageWidth, height: 66 });
}

export async function createNutvitaDocumentBranding(pdf: PDFDocument) {
  headerBytes ||= loadPng(headerPath);
  footerBytes ||= loadPng(footerPath);
  const [headerImage, footerImage]: PDFImage[] = await Promise.all([
    pdf.embedPng(await headerBytes),
    pdf.embedPng(await footerBytes),
  ]);
  return (page: PDFPage) => {
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) });
    page.drawImage(headerImage, { x: 0, y: pageHeight - 110, width: pageWidth, height: 110 });
    page.drawImage(footerImage, { x: 0, y: 0, width: pageWidth, height: 66 });
  };
}
