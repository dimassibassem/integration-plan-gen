import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "@/lib/prisma";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

type Experience = {
  company: string;
  role: string;
  start: string;
  end: string;
  description: string;
}

type Education = {
  school: string;
  degree: string;
  start: string;
  end: string;
}

export type ResumeData = {
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  links: string[];
}

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    if (!genAI) {
      return NextResponse.json({ error: "Server misconfiguration: missing GEMINI_API_KEY" }, { status: 500 });
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

    let raw: string;
    try {
      const result = await model.generateContent(prompt);
      raw = result.response.text();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Gemini generateContent failed", message);
      const msg = /API key/i.test(message) ? "Invalid or missing GEMINI_API_KEY" : "LLM call failed";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    // Try to parse JSON from the model output
    let data: ResumeData;
    try {
      const jsonString = raw.trim().replace(/^```json\n?|```$/g, "");
      data = JSON.parse(jsonString);
    } catch {
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

    // Persist resume into database (optional). If DB is unreachable, still return data.
    let resumeId: string | null = null;
    try {
      const resume = await prisma.resume.create({
        data: {
          rawText: text,
          fullName: data.fullName || "",
          email: data.email || "",
          phone: data.phone || "",
          summary: data.summary || "",
          skills: data.skills ?? [],
          experience: data.experience ?? [],
          education: data.education ?? [],
          links: data.links ?? [],
        },
        select: { id: true },
      });
      resumeId = resume.id;
    } catch (e) {
      console.error("Failed to persist resume", e);
    }

    return NextResponse.json({ data, resumeId });
  } catch (error) {
    console.error("/api/structure error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


