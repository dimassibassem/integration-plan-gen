import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    let text = "";
    try {
      const pdfData = await pdf(buffer);
      text = (pdfData.text || "").trim();
    } catch (err) {
      console.error("PDF parsing failed:", err);
      return NextResponse.json({ error: "Could not parse PDF" }, { status: 500 });
    }

    // Limit size to avoid sending overly large payloads
    const MAX_CHARS = 200000; // ~200k chars
    if (text.length > MAX_CHARS) {
      text = text.slice(0, MAX_CHARS);
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Unexpected error in /api/extract:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


