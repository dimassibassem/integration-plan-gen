import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from "pdf-parse";
import prisma from "@/lib/prisma";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
type CVExperience = { company?: string; role?: string; start?: string; end?: string; description?: string };
type CVEducation = { school?: string; degree?: string; start?: string; end?: string };
type CVData = {
  fullName?: string;
  summary?: string;
  skills?: string[];
  experience?: CVExperience[];
  education?: CVEducation[];
  links?: string[];
};

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const planType = formData.get("planType");
  const providedResumeText = (formData.get("resumeText") as string) || "";
  const cvDataJson = (formData.get("cvData") as string) || "";
  const resumeId = ((formData.get("resumeId") as string) || "").trim() || undefined;
  const integrationPeriod = 4;

  if (!file && !providedResumeText && !cvDataJson) {
    return NextResponse.json({ error: "No file or resume text provided" }, { status: 400 });
  }

  let buffer: Buffer | null = null;
  if (file) {
    const arrayBuffer = await file.arrayBuffer();
    buffer = Buffer.from(new Uint8Array(arrayBuffer));
  }

  let resumeText = providedResumeText;
  let fullNameFromForm = "";
  if (!resumeText && cvDataJson) {
    try {

      const cv: CVData = JSON.parse(cvDataJson) as CVData;
      fullNameFromForm = cv.fullName || "";
      const skills = Array.isArray(cv.skills) ? cv.skills.join(", ") : "";
      const exp = Array.isArray(cv.experience)
        ? cv.experience.map((e: CVExperience) => `${e?.role || ""} at ${e?.company || ""} (${e?.start || ""} - ${e?.end || ""})\n${e?.description || ""}`)
        : [] as string[];
      const edu = Array.isArray(cv.education)
        ? cv.education.map((e: CVEducation) => `${e?.degree || ""} - ${e?.school || ""} (${e?.start || ""} - ${e?.end || ""})`)
        : [] as string[];
      const links = Array.isArray(cv.links) ? cv.links.join(", ") : "";
      resumeText = [
        cv.summary || "",
        skills ? `Skills: ${skills}` : "",
        ...exp,
        ...edu,
        links ? `Links: ${links}` : "",
      ].filter(Boolean).join("\n\n");
    } catch (e) {
      console.error("Failed to parse cvData", e);
    }
  }
  if (!resumeText && buffer) {
    try {
      const pdfData = await pdf(buffer);
      resumeText = pdfData.text;
    } catch (err) {
      console.error("PDF parsing failed:", err);
      return NextResponse.json({ error: "Could not parse PDF" }, { status: 500 });
    }
  }


  if (!genAI) {
    return NextResponse.json({ error: "Server misconfiguration: missing GEMINI_API_KEY" }, { status: 500 });
  }
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `
You are an AI assistant helping to onboard a new developer.  

Your goal is to classify the developer and generate a **clear, simple, and effective 4-week integration plan**.  
 
### Inputs

- Profile type (expected role): ${planType}  

- Integration period: ${integrationPeriod} weeks  

- Resume: ${resumeText}  
 
### Tasks

1. **Classify** the developer based on their resume into one of:  

   - **frontend** (React, React Native, web/mobile)  

   - **backend** (Java, Spring Boot, databases, services)  
   
2. **Analyze the resume** to detect which technologies the developer already has experience with.  
   - If the developer has worked with a technology that overlaps with the company stack, mark it as "strength".  
   - If the developer has experience in a similar but different technology (e.g., Angular vs React), mark it as "needs focus".  
   - Prioritize training on **technologies they don’t know well but are part of the company stack**.  

3. **Generate a 4-week integration plan** tailored to the developer’s profile and skills:  

 
  - Format:  
     - Return tasks as **bullet points (-)** under each week.  
     - Each task should be **simple, actionable, and practical**.  
     - Add **links to high-quality resources** (official docs, tutorials, guides) for training on each stack technology.  

   - Content:  
     - **Phase 1 (Week 1 & 2) → Technical training**:  
       - Focus only on company stack technologies.  
       - Start with fundamentals in week 1, applied practice in week 2.  
     - **Phase 2 (Week 3 & 4) → Bankerise integration**:  
       - Week 3: Familiarization with **Bankerise platform workflows, documentation**.  
       - Week 4: **Team integration**: pair programming, code reviews, and contribution to real tasks on Bankerise. 

 
### Company Stacks

- **Frontend**  

  * React: React Query, Redux-Saga, Formik, Yup, Chakra v2, Monorepos, Lerna, Vite 

  * React Native: React Query, Zustand, Keychain, MMKV, Zod, React Hook Form  
 
- **Backend**  

  * Java, Maven, Spring Boot, Micronaut, Gradle  

  * Flowable, Redis, ElasticSearch, Keycloak  

  * Primefaces, JSF  

  * Postgres, Hibernate  
 
### Output Format
Return a **valid JSON string** following this structure:
{
  "type": ${JSON.stringify(planType)},
  "name": ${JSON.stringify(fullNameFromForm || "developer's full name from resume")},
  
  "plan": {

    "week1": "....",

    "week2": "....",

    "week3": "....",

    "week4": "...."

  }
}
`;

    let result;
  try {
    result = await model.generateContent(prompt);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Gemini generateContent failed", message);
    const msg = /API key/i.test(message) ? "Invalid or missing GEMINI_API_KEY" : "LLM call failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let planText = result.response.text().trim();

  // Remove starting ```json and ending ```
  planText = planText.replace(/^```json\s*/, "").replace(/\s*```$/, "");

  const plan = JSON.parse(planText);
  if (fullNameFromForm) {
    plan.name = fullNameFromForm;
  }

  // Persist plan to database
  try {
    const saved = await prisma.plan.create({
      data: {
        type: String(plan.type || planType || "unknown"),
        name: String(plan.name || ""),
        week1: String(plan.plan?.week1 || ""),
        week2: String(plan.plan?.week2 || ""),
        week3: String(plan.plan?.week3 || ""),
        week4: String(plan.plan?.week4 || ""),
        resumeId: resumeId || null,
      },
      select: { id: true },
    });
    return NextResponse.json({ ...plan, planId: saved.id });
  } catch (e) {
    console.error("Failed to persist plan", e);
    // Still return the plan even if persistence failed
    return NextResponse.json({ ...plan, planId: null });
  }
}
