"use client"
import { useState } from "react"
import type React from "react"

import { useMutation } from "@tanstack/react-query"
import { Upload, FileText, Sparkles, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import PlanCard from "@/components/PlanCard"

export default function Home() {
    const [file, setFile] = useState<File | null>(null)
    const [dragActive, setDragActive] = useState(false)
    const [planType, setPlanType] = useState<"frontend" | "backend">("frontend")

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

                            <div className="mt-6 flex justify-center">
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
                            </div>
                        </CardContent>
                    </Card>

                    {mutation.isError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
                        </Alert>
                    )}

                    {mutation.data && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Analysis Complete
                                </Badge>
                            </div>
                            <PlanCard plan={mutation.data} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
