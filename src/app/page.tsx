"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { Upload, FileText, Sparkles, CheckCircle, AlertCircle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import PlanCard from "@/components/PlanCard"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import CVForm, { type CVData } from "@/components/cv/CVForm"

//
// Types
//
interface IntegrationPlan {
    type: string
    name: string
    plan: {
        week1: string
        week2: string
        week3: string
        week4: string
    }
}

type PlanSource = "file" | "edited" | null

const MARGIN_X = 50
const LINE_HEIGHT = 14

//
// Helper: Draw wrapped text
//
function drawTextWithWrap(
    doc: PDFDocument,
    page: any,
    text: string,
    yRef: { current: number },
    font: any,
    fontBold: any,
    maxWidth: number,
    bold = false
) {
    const usedFont = bold ? fontBold : font
    const words = text.split(/\s+/)
    let line = ""

    for (const word of words) {
        const testLine = line ? line + " " + word : word
        const width = usedFont.widthOfTextAtSize(testLine, 11)
        if (width > maxWidth) {
            if (yRef.current < 60) {
                page = doc.addPage([595.28, 841.89])
                yRef.current = 792
            }
            page.drawText(line, { x: MARGIN_X, y: yRef.current, size: 11, font: usedFont, color: rgb(0, 0, 0) })
            yRef.current -= LINE_HEIGHT
            line = word
        } else {
            line = testLine
        }
    }

    if (line) {
        if (yRef.current < 60) {
            page = doc.addPage([595.28, 841.89])
            yRef.current = 792
        }
        page.drawText(line, { x: MARGIN_X, y: yRef.current, size: 11, font: usedFont, color: rgb(0, 0, 0) })
        yRef.current -= LINE_HEIGHT
    }
}

//
// Helper: Export plan as PDF
//
async function exportPlanAsPdf(plan: IntegrationPlan) {
    const doc = await PDFDocument.create()
    let page = doc.addPage([595.28, 841.89])
    const font = await doc.embedFont(StandardFonts.Helvetica)
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

    const yRef = { current: 792 }
    const maxWidth = [595.28, 841.89][0] - MARGIN_X * 2

    // Title
    page.drawText("Integration Plan", { x: MARGIN_X, y: yRef.current, size: 16, font: fontBold })
    yRef.current -= 24
    drawTextWithWrap(doc, page, `Name: ${plan.name}`, yRef, font, fontBold, maxWidth)
    drawTextWithWrap(doc, page, `Type: ${plan.type}`, yRef, font, fontBold, maxWidth)
    yRef.current -= 10

    // Weeks
    const sections: [string, string][] = [
        ["Week 1", plan.plan.week1],
        ["Week 2", plan.plan.week2],
        ["Week 3", plan.plan.week3],
        ["Week 4", plan.plan.week4],
    ]

    for (const [title, content] of sections) {
        if (yRef.current < 80) {
            page = doc.addPage([595.28, 841.89])
            yRef.current = 792
        }
        page.drawText(title, { x: MARGIN_X, y: yRef.current, size: 14, font: fontBold })
        yRef.current -= 18
        const lines = content.split(/\r?\n/)
        for (const raw of lines) {
            const text = raw.replace(/^[-*]\s?/, "• ")
            drawTextWithWrap(doc, page, text, yRef, font, fontBold, maxWidth)
        }
        yRef.current -= 6
    }

    const pdfBytes = await doc.save()
    const blob = new Blob([pdfBytes], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${plan.name || "plan"}.pdf`
    a.click()
    URL.revokeObjectURL(url)
}

//
// Component
//
export default function Home() {
    const [file, setFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [planType, setPlanType] = useState<"frontend" | "backend">("frontend")
    const [isExtracting, setIsExtracting] = useState(false)
    const [structuredCV, setStructuredCV] = useState<CVData | null>(null)
    const [displayPlan, setDisplayPlan] = useState<IntegrationPlan | null>(null)
    const [planSource, setPlanSource] = useState<PlanSource>(null)

    // Mutation for generating plan
    const formPlanMutation = useMutation({
        mutationFn: async (cv: CVData) => {
            const formData = new FormData()
            formData.append("planType", planType)
            formData.append("cvData", JSON.stringify(cv))
            const res = await fetch("/api/generate", { method: "POST", body: formData })
            if (!res.ok) throw new Error("Failed to generate plan from form data")
            return res.json() as Promise<IntegrationPlan>
        },
        onSuccess: (data) => {
            setDisplayPlan(data)
            setPlanSource("edited")
        },
    })

    //
    // Handlers
    //
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(e.type === "dragenter" || e.type === "dragover")
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile?.type === "application/pdf") {
            setFile(droppedFile)
        }
    }

    const handleFileChange = async (f: File | null) => {
        if (!f || isExtracting) return
        setFile(f)
        setIsExtracting(true)
        try {
            const fd = new FormData()
            fd.append("file", f)

            // Extract raw text
            const res = await fetch("/api/extract", { method: "POST", body: fd })
            if (!res.ok) throw new Error("Failed to extract text")
            const { text } = await res.json()

            // Structure CV
            const sRes = await fetch("/api/structure", { method: "POST", body: JSON.stringify({ text }) })
            if (sRes.ok) {
                const s = await sRes.json()
                setStructuredCV(s.data as CVData)
            } else {
                setStructuredCV(null)
            }

            // Scroll to CV form
            setTimeout(() => document.getElementById("cv-form")?.scrollIntoView({ behavior: "smooth" }), 0)
        } catch (err) {
            console.error(err)
        } finally {
            setIsExtracting(false)
        }
    }

    //
    // Render
    //
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
            <div className="container mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <Badge variant="secondary" className="mb-4 font-medium">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI-Powered Analysis
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold text-balance mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Resume → Integration Plan
                    </h1>
                    <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto">
                        Transform your resume into a structured 4-week integration plan. Upload your PDF and get personalized
                        recommendations for your developer journey.
                    </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-8">
                    {/* Plan type */}
                    <Card>
                        <CardHeader className="text-center">
                            <CardTitle>Choose Your Focus</CardTitle>
                            <CardDescription>Select the type of integration plan you&#39;d like to generate</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup
                                value={planType}
                                onValueChange={(value) => setPlanType(value as "frontend" | "backend")}
                                className="flex justify-center space-x-8"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="frontend" id="frontend" />
                                    <Label htmlFor="frontend" className="cursor-pointer font-medium">
                                        Frontend Development
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="backend" id="backend" />
                                    <Label htmlFor="backend" className="cursor-pointer font-medium">
                                        Backend Development
                                    </Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    {/* Upload resume */}
                    <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
                        <CardHeader className="text-center">
                            <CardTitle className="flex items-center justify-center gap-2">
                                <Upload className="w-5 h-5" /> Upload Your Resume
                            </CardTitle>
                            <CardDescription>Drop your PDF resume here or click to browse</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                                    }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />

                                <div className="space-y-4">
                                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                        <FileText className="w-6 h-6 text-primary" />
                                    </div>

                                    {file ? (
                                        <div className="space-y-2">
                                            <p className="font-medium text-foreground">{file.name}</p>
                                            <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                {isExtracting ? "Extracting..." : "Ready"}
                                            </Badge>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-foreground font-medium">Choose a PDF file or drag it here</p>
                                            <p className="text-sm text-muted-foreground">Maximum file size: 10MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Extraction loader */}
                            {isExtracting && (
                                <div className="mt-6 flex justify-center gap-3 text-sm text-muted-foreground items-center">
                                    <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                                    Extracting details...
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Structured form */}
                    {structuredCV && (
                        <div id="cv-form">
                            <CVForm
                                initial={structuredCV}
                                planType={planType}
                                isGenerating={formPlanMutation.isPending}
                                onGenerate={(cv) => formPlanMutation.mutate(cv)}
                            />
                        </div>
                    )}

                    {/* Generated plan */}
                    {displayPlan && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Analysis Complete ({planSource === "edited" ? "Edited CV" : "Original"})
                                </Badge>
                            </div>
                            <div className="flex justify-end">
                                <Button variant="outline" onClick={() => exportPlanAsPdf(displayPlan)}>
                                    <Download className="w-4 h-4" /> Export PDF
                                </Button>
                            </div>
                            <PlanCard plan={displayPlan} />
                        </div>
                    )}

                    {/* Errors */}
                    {formPlanMutation.isError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(formPlanMutation.error as Error).message}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
        </div>
    )
}
