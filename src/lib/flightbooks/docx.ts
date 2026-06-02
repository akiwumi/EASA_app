import mammoth from "mammoth";

export async function extractDocxText(bytes: Buffer): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    const text = value.trim();
    if (!text) throw new Error("No readable text was found in this DOCX file.");
    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DOCX parsing error";
    throw new Error(`DOCX parsing failed: ${message}`);
  }
}
