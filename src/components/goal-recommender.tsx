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
            setError(result.error || "Ocorreu um erro desconhecido.")
        }
        setLoading(false)
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Recomendações de Metas Personalizadas</CardTitle>
                    <CardDescription>Deixe nossa IA sugerir metas de fitness personalizadas e alcançáveis com base nos seus dados.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateGoals} disabled={loading} className="w-full">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Gerar Minhas Metas
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {goals.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Suas Metas com IA</CardTitle>
                        <CardDescription>Aqui estão 3 metas feitas para você. Vamos começar!</CardDescription>
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
