import { Calendar, User, Clock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function PlanCard({ plan }: { plan: any }) {
  const weeks = [
    { number: 1, content: plan.plan.week1 },
    { number: 2, content: plan.plan.week2 },
    { number: 3, content: plan.plan.week3 },
    { number: 4, content: plan.plan.week4 },
  ]

  return (
    <Card className="w-full shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm font-medium">
            <User className="w-3 h-3 mr-1" />
            Developer Profile
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            4-Week Plan
          </Badge>
        </div>

        <div>
          <CardTitle className="text-2xl font-bold text-balance">
            {plan.type.charAt(0).toUpperCase() + plan.type.slice(1)} Developer
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Your personalized integration roadmap based on resume analysis
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-4">
          {weeks.map((week, index) => (
            <div key={week.number} className="group">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                    {week.number}
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">Week {week.number}</h3>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <p className="text-muted-foreground text-pretty leading-relaxed">{week.content}</p>
                </div>

                {index < weeks.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors mt-2" />
                )}
              </div>

              {index < weeks.length - 1 && <Separator className="my-2 ml-6" />}
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="text-center space-y-2">
            <h4 className="font-semibold text-primary">Ready to get started?</h4>
            <p className="text-sm text-muted-foreground">
              Follow this plan to successfully integrate into your new role
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
