import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from "pdf-parse";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(new Uint8Array(arrayBuffer));

  let resumeText = "";
  try {
    const pdfData = await pdf(buffer);
    resumeText = pdfData.text;
  } catch (err) {
    console.error("PDF parsing failed:", err);
    return NextResponse.json({ error: "Could not parse PDF" }, { status: 500 });
  }

  // ✅ Send resume text to Gemini
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
Classify this developer as FRONTEND, BACKEND. 
Then generate a 4-week integration plan.

Stacks:
- Frontend: React Query, Redux-Saga, Formik, Yup, Chakra v2, Monorepos, Vite
- React Native: React Query, Zustand, Keychain, MMKV, Zod, React Hook Form
- Backend: Node.js, Express.js, Prisma, PostgreSQL, tRPC, Authentication, CI/CD

Resume:
${resumeText}

Output JSON:
{
  "type": "frontend|backend",
  "plan": {
    "week1": "...",
    "week2": "...",
    "week3": "...",
    "week4": "..."
  }
}
`;

  const result = await model.generateContent(prompt);

  let planText = result.response.text().trim();

  // Remove starting ```json and ending ```
  planText = planText.replace(/^```json\s*/, "").replace(/\s*```$/, "");

  const plan = JSON.parse(planText);

  return NextResponse.json(plan);
}
