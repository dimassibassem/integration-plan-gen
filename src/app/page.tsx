"use client"
import { useState } from "react"
import type React from "react"

import { useMutation } from "@tanstack/react-query"
import { Upload, FileText, Sparkles, CheckCircle, AlertCircle, Download, Copy, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import PlanCard from "@/components/PlanCard"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export default function Home() {
    const [file, setFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [planType, setPlanType] = useState<"frontend" | "backend">("frontend")
    const [cvText, setCvText] = useState("")
    const [isExtracting, setIsExtracting] = useState(false)
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

    // Mutation for generating plan from edited text (no file required)
    const [displayPlan, setDisplayPlan] = useState<any | null>(null)
    const [planSource, setPlanSource] = useState<"file" | "edited" | null>(null)

    const textPlanMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData()
            formData.append("planType", planType)
            formData.append("resumeText", cvText)
            const res = await fetch("/api/generate", { method: "POST", body: formData })
            if (!res.ok) throw new Error("Failed to generate plan from edited CV")
            return await res.json()
        },
        onSuccess: (data) => {
            setDisplayPlan(data)
            setPlanSource("edited")
        },
    })

    // No persistent storage for edited CV text

    const mutation = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData()
            formData.append("file", file)
            formData.append("planType", planType)

            const res = await fetch("/api/generate", {
                method: "POST",
                body: formData,
            })

            if (!res.ok) throw new Error("Failed to generate plan")

            return await res.json()
        },
        onSuccess: (data) => {
            setDisplayPlan(data)
            setPlanSource("file")
        },
    })

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
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
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
                                                Ready to analyze
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
                                <Button
                                    onClick={() => file && mutation.mutate(file)}
                                    disabled={!file || mutation.isPending}
                                    size="lg"
                                    className="min-w-[200px]"
                                >
                                    {mutation.isPending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                            Analyzing Resume...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Generate Integration Plan
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        if (!file || isExtracting) return
                                        setIsExtracting(true)
                                        try {
                                            const fd = new FormData()
                                            fd.append("file", file)
                                            const res = await fetch("/api/extract", { method: "POST", body: fd })
                                            if (!res.ok) throw new Error("Failed to extract text")
                                            const data = await res.json()
                                            setCvText(data.text || "")
                                            // Scroll into view after extraction
                                            setTimeout(() => {
                                                const el = document.getElementById("cv-editor")
                                                el?.scrollIntoView({ behavior: "smooth" })
                                            }, 0)
                                        } catch (e) {
                                            console.error(e)
                                        } finally {
                                            setIsExtracting(false)
                                        }
                                    }}
                                    disabled={!file || isExtracting}
                                    size="lg"
                                >
                                    {isExtracting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                            Extracting...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-4 h-4 mr-1" /> Edit CV
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {mutation.isError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
                        </Alert>
                    )}

                    {/* CV Editor shown after clicking Edit CV */}
                    {cvText && (
                        <Card id="cv-editor">
                            <CardHeader className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl">Editable CV</CardTitle>
                                        <CardDescription className="text-sm">{file?.name || "Extracted text"}</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            {cvText.trim().split(/\s+/).filter(Boolean).length} words
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {cvText.length} chars
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        onClick={() => navigator.clipboard.writeText(cvText)}
                                    >
                                        <Copy className="w-4 h-4" /> Copy
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setCvText("")}
                                    >
                                        <Trash2 className="w-4 h-4" /> Clear
                                    </Button>
                                    {/* Save changes removed per request */}
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            const blob = new Blob([cvText], { type: "text/plain;charset=utf-8" })
                                            const url = URL.createObjectURL(blob)
                                            const a = document.createElement("a")
                                            a.href = url
                                            a.download = "cv.txt"
                                            a.click()
                                            URL.revokeObjectURL(url)
                                        }}
                                        disabled={!cvText}
                                    >
                                        <Download className="w-4 h-4" /> .txt
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const blob = new Blob([JSON.stringify({ text: cvText }, null, 2)], {
                                                type: "application/json;charset=utf-8",
                                            })
                                            const url = URL.createObjectURL(blob)
                                            const a = document.createElement("a")
                                            a.href = url
                                            a.download = "cv.json"
                                            a.click()
                                            URL.revokeObjectURL(url)
                                        }}
                                        disabled={!cvText}
                                    >
                                        <Download className="w-4 h-4" /> .json
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <textarea
                                    value={cvText}
                                    onChange={(e) => setCvText(e.target.value)}
                                    rows={16}
                                    className="w-full border rounded-md p-4 text-sm bg-background leading-7 tracking-wide selection:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <div className="flex justify-end">
                                    <Button onClick={() => textPlanMutation.mutate()} disabled={!cvText || textPlanMutation.isPending}>
                                        {textPlanMutation.isPending ? "Generating..." : "Use this edited CV for plan"}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">Tip: You can paste more details or correct OCR errors before generating your plan.</p>
                            </CardContent>
                        </Card>
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
                    {textPlanMutation.isError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(textPlanMutation.error as Error).message}</AlertDescription>
                        </Alert>
                    )}
                </div>
            </div>
        </div>
    )
}
