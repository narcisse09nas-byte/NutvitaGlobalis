export async function extractDocumentText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".html") || name.endsWith(".htm")) {
    const document = new DOMParser().parseFromString(
      await file.text(),
      "text/html",
    );
    document
      .querySelectorAll("script,style,noscript")
      .forEach((node) => node.remove());
    return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    return (
      await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    ).value.trim();
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
    }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const content = await (await pdf.getPage(pageNumber)).getTextContent();
      pages.push(
        content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
      );
    }
    return pages.join("\n").trim();
  }
  return (await file.text()).trim();
}

export const EXERCISE_DOCUMENT_FORMATS = ".html,.htm,.docx,.pdf,.txt,.md";
