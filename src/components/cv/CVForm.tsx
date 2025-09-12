"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles } from "lucide-react"

type Experience = { company: string; role: string; start: string; end: string; description: string }
type Education = { school: string; degree: string; start: string; end: string }

export type CVData = {
  fullName: string
  email: string
  phone: string
  summary: string
  skills: string[]
  experience: Experience[]
  education: Education[]
  links: string[]
}

export function CVForm({
  initial,
  onGenerate,
  planType,
  isGenerating,
}: {
  initial: CVData
  onGenerate: (cv: CVData) => void
  planType: "frontend" | "backend"
  isGenerating?: boolean
}) {
  const [cv, setCv] = useState<CVData>(initial)
  useEffect(() => setCv(initial), [initial])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review and edit extracted details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={cv.fullName} onChange={(e) => setCv({ ...cv, fullName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={cv.email} onChange={(e) => setCv({ ...cv, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={cv.phone} onChange={(e) => setCv({ ...cv, phone: e.target.value })} />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Summary</Label>
            <textarea
              className="w-full border rounded-md p-3"
              rows={4}
              value={cv.summary}
              onChange={(e) => setCv({ ...cv, summary: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Skills (comma separated)</Label>
            <Input
              value={cv.skills.join(", ")}
              onChange={(e) => setCv({ ...cv, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Experience</Label>
            <Button type="button" variant="outline" onClick={() => setCv({ ...cv, experience: [...cv.experience, { company: "", role: "", start: "", end: "", description: "" }] })}>Add</Button>
          </div>
          {cv.experience.map((exp, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 border rounded-md p-3">
              <div className="space-y-1.5">
                <Label className="sr-only">Company</Label>
                <Input placeholder="Company" value={exp.company} onChange={(e) => {
                const list = [...cv.experience]; list[idx] = { ...exp, company: e.target.value }; setCv({ ...cv, experience: list })
              }} />
              </div>
              <div className="space-y-1.5">
                <Label className="sr-only">Role</Label>
                <Input placeholder="Role" value={exp.role} onChange={(e) => {
                const list = [...cv.experience]; list[idx] = { ...exp, role: e.target.value }; setCv({ ...cv, experience: list })
              }} />
              </div>
              <div className="space-y-1.5">
                <Label className="sr-only">Start</Label>
                <Input placeholder="Start" value={exp.start} onChange={(e) => {
                const list = [...cv.experience]; list[idx] = { ...exp, start: e.target.value }; setCv({ ...cv, experience: list })
              }} />
              </div>
              <div className="space-y-1.5">
                <Label className="sr-only">End</Label>
                <Input placeholder="End" value={exp.end} onChange={(e) => {
                const list = [...cv.experience]; list[idx] = { ...exp, end: e.target.value }; setCv({ ...cv, experience: list })
              }} />
              </div>
              <div className="md:col-span-4">
                <Label className="sr-only">Description</Label>
                <textarea className="w-full border rounded-md p-2 mt-1.5" rows={3} placeholder="Description" value={exp.description} onChange={(e) => {
                  const list = [...cv.experience]; list[idx] = { ...exp, description: e.target.value }; setCv({ ...cv, experience: list })
                }} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Education</Label>
            <Button type="button" variant="outline" onClick={() => setCv({ ...cv, education: [...cv.education, { school: "", degree: "", start: "", end: "" }] })}>Add</Button>
          </div>
          {cv.education.map((ed, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 border rounded-md p-3">
              <div className="space-y-1.5">
                <Label className="sr-only">School</Label>
                <Input placeholder="School" value={ed.school} onChange={(e) => {
                const list = [...cv.education]; list[idx] = { ...ed, school: e.target.value }; setCv({ ...cv, education: list })
              }} />
              </div>
              <div className="space-y-1.5">
                <Label className="sr-only">Degree</Label>
                <Input placeholder="Degree" value={ed.degree} onChange={(e) => {
                const list = [...cv.education]; list[idx] = { ...ed, degree: e.target.value }; setCv({ ...cv, education: list })
              }} />
              </div>
              <div className="space-y-1.5">
                <Label className="sr-only">Start</Label>
                <Input placeholder="Start" value={ed.start} onChange={(e) => {
                const list = [...cv.education]; list[idx] = { ...ed, start: e.target.value }; setCv({ ...cv, education: list })
              }} />
              </div>
              <div className="space-y-1.5">
                <Label className="sr-only">End</Label>
                <Input placeholder="End" value={ed.end} onChange={(e) => {
                const list = [...cv.education]; list[idx] = { ...ed, end: e.target.value }; setCv({ ...cv, education: list })
              }} />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label>Links (comma separated)</Label>
          <Input value={cv.links.join(", ")} onChange={(e) => setCv({ ...cv, links: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={() => onGenerate(cv)}
            disabled={isGenerating}
            size="lg"
            className="min-w-[200px]"
          >
            {isGenerating ? (
              "Generating..."
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Integration Plan
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">Review the extracted details above before generating your plan.</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default CVForm


