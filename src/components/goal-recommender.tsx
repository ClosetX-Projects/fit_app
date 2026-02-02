"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Sparkles } from "lucide-react"
import { mockUserData } from "@/lib/types"
import { getAIGoalRecommendations } from "@/lib/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function GoalRecommender() {
    const [loading, setLoading] = useState(false)
    const [goals, setGoals] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)

    const handleGenerateGoals = async () => {
        setLoading(true)
        setError(null)
        setGoals([])
        const result = await getAIGoalRecommendations(mockUserData)
        if (result.success && result.goals) {
            setGoals(result.goals)
        } else {
            setError(result.error || "An unknown error occurred.")
        }
        setLoading(false)
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Personalized Goal Recommendations</CardTitle>
                    <CardDescription>Let our AI suggest personalized and achievable fitness goals based on your data.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateGoals} disabled={loading} className="w-full">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate My Goals
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {goals.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Your AI-Powered Goals</CardTitle>
                        <CardDescription>Here are 3 goals tailored just for you. Let's get started!</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {goals.map((goal, index) => (
                                <li key={index} className="flex items-start gap-4 p-4 bg-secondary rounded-lg">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                                        {index + 1}
                                    </div>
                                    <p className="pt-1 text-secondary-foreground">{goal}</p>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
