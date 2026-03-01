
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Sparkles, BrainCircuit } from "lucide-react"
import { getAIGoalRecommendations } from "@/lib/actions"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useFirebase, useUser, useDoc, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import type { PersonalizedGoalRecommendationsInput } from "@/ai/flows/personalized-goal-recommendations"

export function GoalRecommender() {
    const { user } = useUser()
    const { firestore } = useFirebase()
    const [loading, setLoading] = useState(false)
    const [goals, setGoals] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)

    // Buscar Perfil Real
    const profileRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user])
    const { data: profile } = useDoc(profileRef)

    // Buscar Última Avaliação Real
    const lastAssessmentRef = useMemoFirebase(() => 
        user ? query(collection(firestore, 'users', user.uid, 'physicalAssessments'), orderBy('date', 'desc'), limit(1)) : null
    , [firestore, user])
    const { data: lastAssessments } = useCollection(lastAssessmentRef)
    const lastAssessment = lastAssessments?.[0]

    const handleGenerateGoals = async () => {
        if (!profile || !user) {
            setError("Perfil não carregado.")
            return
        }

        setLoading(true)
        setError(null)
        setGoals([])

        // Garantir que valores numéricos sejam de fato números (Number)
        // O erro INVALID_ARGUMENT costuma ocorrer por tipos incorretos no payload
        const inputData: PersonalizedGoalRecommendationsInput = {
            userData: {
                name: String(profile.name || user.displayName || 'Usuário'),
                age: Number(profile.age || 0),
                gender: String(profile.gender || 'Não informado'),
                weight: Number(lastAssessment?.weight || profile.weight || 0),
                height: Number(lastAssessment?.height || profile.height || 0),
                email: String(user.email || ''),
                whatsapp: String(profile.whatsapp || '')
            },
            bodyComposition: {
                weight: Number(lastAssessment?.weight || 0),
                height: Number(lastAssessment?.height || 0),
                circumferences: {}, 
                skinfolds: {},
            },
            bioimpedanceData: {
                age: Number(profile.age || 0),
                height: Number(lastAssessment?.height || 0),
                gender: String(profile.gender || ''),
                totalBodyWater: 0,
                protein: 0,
                mineralContent: 0,
                bodyFatMass: 0,
            },
            strengthTestResults: {
                vo2max: Number(lastAssessment?.vo2max || 0),
                oneRepMaxTest: {},
            },
            workoutConsistency: 50,
        }

        // Sanitizar inputData para remover métodos de Timestamps do Firestore
        const sanitizedInput = JSON.parse(JSON.stringify(inputData));
        const result = await getAIGoalRecommendations(sanitizedInput);
        
        if (result.success && result.goals) {
            setGoals(result.goals)
        } else {
            setError(result.error || "Ocorreu um erro ao gerar metas.")
        }
        setLoading(false)
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <BrainCircuit className="h-6 w-6 text-primary" />
                        <CardTitle>Mentor de Metas com IA</CardTitle>
                    </div>
                    <CardDescription>
                        Nossa IA analisará seu perfil atual e suas últimas avaliações para sugerir objetivos realistas e motivadores.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGenerateGoals} disabled={loading || !profile} className="w-full h-12 text-lg">
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Analisando seus dados...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-5 w-5" />
                                Gerar Planejamento de Metas
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Erro na IA</AlertTitle>
                    <AlertDescription className="text-[10px] font-mono whitespace-pre-wrap">{error}</AlertDescription>
                </Alert>
            )}

            {goals.length > 0 && (
                <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-yellow-500" />
                            Sugestões da IA para Você
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {goals.map((goal, index) => (
                                <li key={index} className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg border border-primary/10">
                                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                                        {index + 1}
                                    </div>
                                    <p className="pt-1 leading-relaxed">{goal}</p>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
