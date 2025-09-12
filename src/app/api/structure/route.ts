import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Extract a resume into structured JSON. Return ONLY JSON.
Schema:
{
  "fullName": string,
  "email": string,
  "phone": string,
  "summary": string,
  "skills": string[],
  "experience": [
    { "company": string, "role": string, "start": string, "end": string, "description": string }
  ],
  "education": [
    { "school": string, "degree": string, "start": string, "end": string }
  ],
  "links": string[]
}

Resume text:
"""
${text}
"""`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    // Try to parse JSON from the model output
    let data: any;
    try {
      const jsonString = raw.trim().replace(/^```json\n?|```$/g, "");
      data = JSON.parse(jsonString);
    } catch (e) {
      // Fallback minimal structure
      data = {
        fullName: "",
        email: "",
        phone: "",
        summary: "",
        skills: [],
        experience: [],
        education: [],
        links: [],
      };
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("/api/structure error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


