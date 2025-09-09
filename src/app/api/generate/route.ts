import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from "pdf-parse";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const planType = formData.get("planType");
  const integrationPeriod = 4;

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
 
2. **Generate a 4-week integration plan** tailored to the developer’s profile and skills:  

   - Focus on **progressive onboarding** (gradual ramp-up, from basics to real tasks).  

   - Keep the plan **simple, structured, and practical** (avoid too much theory).  

   - Include **hands-on practice** with the company stack.  

   - Ensure time for **team integration**, **workflow familiarization**, and **documentation review**.  
   
3. Ensure that both types of developers also get familiar with the **Bankerise platform**, its workflows, and documentation during the plan.  

 
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
  "type": ${planType},
  "name": developer's full name from resume,
  
  "plan": {

    "week1": "....",

    "week2": "....",

    "week3": "....",

    "week4": "...."

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
