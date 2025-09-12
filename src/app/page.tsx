"use client"
import { useState } from "react"
import type React from "react"

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

export default function Home() {
    const [file, setFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [planType, setPlanType] = useState<"frontend" | "backend">("frontend")
    const [cvText, setCvText] = useState("")
    const [isExtracting, setIsExtracting] = useState(false)
    const [structuredCV, setStructuredCV] = useState<CVData | null>(null)
    async function exportPlanAsPdf(plan: {
        type: string
        name: string
        plan: { week1: string; week2: string; week3: string; week4: string }
    }) {
        const doc = await PDFDocument.create()
        const page = doc.addPage([595.28, 841.89]) // A4
        const font = await doc.embedFont(StandardFonts.Helvetica)
        const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

        const marginX = 50
        let y = 792 // top margin
        const lineHeight = 14
        const maxWidth = 595.28 - marginX * 2

        const drawText = (text: string, bold = false) => {
            const usedFont = bold ? fontBold : font
            const words = text.split(/\s+/)
            let line = ""
            for (const word of words) {
                const testLine = line ? line + " " + word : word
                const width = usedFont.widthOfTextAtSize(testLine, 11)
                if (width > maxWidth) {
                    if (y < 60) {
                        // new page
                        const newPage = doc.addPage([595.28, 841.89])
                        y = 792
                        // switch to new page context
                        ;(page as any) // satisfy TS
                    }
                    page.drawText(line, { x: marginX, y, size: 11, font: usedFont, color: rgb(0, 0, 0) })
                    y -= lineHeight
                    line = word
                } else {
                    line = testLine
                }
            }
            if (line) {
                if (y < 60) {
                    const newPage = doc.addPage([595.28, 841.89])
                    y = 792
                    ;(page as any)
                }
                page.drawText(line, { x: marginX, y, size: 11, font: usedFont, color: rgb(0, 0, 0) })
                y -= lineHeight
            }
        }

        // Title
        page.drawText("Integration Plan", { x: marginX, y, size: 16, font: fontBold })
        y -= 24
        drawText(`Name: ${plan.name}`)
        drawText(`Type: ${plan.type}`)
        y -= 10

        const sections = [
            ["Week 1", plan.plan.week1],
            ["Week 2", plan.plan.week2],
            ["Week 3", plan.plan.week3],
            ["Week 4", plan.plan.week4],
        ] as const

        for (const [title, content] of sections) {
            if (y < 80) {
                doc.addPage([595.28, 841.89])
                y = 792
            }
            page.drawText(title, { x: marginX, y, size: 14, font: fontBold })
            y -= 18
            const lines = content.split(/\r?\n/)
            for (const raw of lines) {
                const text = raw.replace(/^[-*]\s?/, "• ")
                drawText(text)
            }
            y -= 6
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

    // Generated plan state
    const [displayPlan, setDisplayPlan] = useState<any | null>(null)
    const [planSource, setPlanSource] = useState<"file" | "edited" | null>(null)

    // Mutation for generating plan from structured form (cvData)
    const formPlanMutation = useMutation({
        mutationFn: async (cv: any) => {
            const formData = new FormData()
            formData.append("planType", planType)
            formData.append("cvData", JSON.stringify(cv))
            const res = await fetch("/api/generate", { method: "POST", body: formData })
            if (!res.ok) throw new Error("Failed to generate plan from form data")
            return await res.json()
        },
        onSuccess: (data) => {
            setDisplayPlan(data)
            setPlanSource("edited")
        },
    })

    // No persistent storage for edited CV text

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0]
            if (droppedFile.type === "application/pdf") {
                setFile(droppedFile)
            }
        }
    }

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

                    <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                        <CardHeader className="text-center">
                            <CardTitle className="flex items-center justify-center gap-2">
                                <Upload className="w-5 h-5" />
                                Upload Your Resume
                            </CardTitle>
                            <CardDescription>Drop your PDF resume here or click to browse</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                    dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                                }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={async (e) => {
                                        const f = e.target.files?.[0] || null
                                        setFile(f)
                                        if (f && !isExtracting) {
                                            // auto-extract on select
                                            const fd = new FormData()
                                            fd.append("file", f)
                                            setIsExtracting(true)
                                            try {
                                                const res = await fetch("/api/extract", { method: "POST", body: fd })
                                                if (!res.ok) throw new Error("Failed to extract text")
                                                const data = await res.json()
                                                const rawText = data.text || ""
                                                setCvText(rawText)
                                                try {
                                                    const sRes = await fetch("/api/structure", { method: "POST", body: JSON.stringify({ text: rawText }) })
                                                    if (sRes.ok) {
                                                        const s = await sRes.json()
                                                        setStructuredCV({
                                                            fullName: s.data.fullName || "",
                                                            email: s.data.email || "",
                                                            phone: s.data.phone || "",
                                                            summary: s.data.summary || "",
                                                            skills: Array.isArray(s.data.skills) ? s.data.skills : [],
                                                            experience: Array.isArray(s.data.experience) ? s.data.experience : [],
                                                            education: Array.isArray(s.data.education) ? s.data.education : [],
                                                            links: Array.isArray(s.data.links) ? s.data.links : [],
                                                        })
                                                    } else {
                                                        setStructuredCV(null)
                                                    }
                                                } catch {
                                                    setStructuredCV(null)
                                                }
                                                setTimeout(() => {
                                                    const el = document.getElementById("cv-form")
                                                    el?.scrollIntoView({ behavior: "smooth" })
                                                }, 0)
                                            } catch (e) {
                                                console.error(e)
                                            } finally {
                                                setIsExtracting(false)
                                            }
                                        }
                                    }}
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

                            <div className="mt-6 flex justify-center gap-3">
                                {isExtracting && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                                        Extracting details...
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    

                    {/* Prefilled structured form */}
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

                    
                    {displayPlan && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Analysis Complete ({planSource === "edited" ? "Edited CV" : "Original"})
                                </Badge>
                            </div>
                            <div className="flex justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => exportPlanAsPdf(displayPlan as any)}
                                >
                                    <Download className="w-4 h-4" /> Export PDF
                                </Button>
                            </div>
                            <PlanCard plan={displayPlan} />
                        </div>
                    )}
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
