import WordExtractor from "word-extractor";

export async function extractDocText(bytes: Buffer): Promise<string> {
  try {
    const document = await new WordExtractor().extract(bytes);
    const text = document.getBody().trim();
    if (!text) throw new Error("No readable text was found in this DOC file.");
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DOC parsing error";
    throw new Error(`DOC parsing failed: ${message}`);
  }
}
