"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { mockUserData } from "@/lib/types"

export function AssessmentForm() {
    const { toast } = useToast()

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        toast({
            title: "Assessment Saved",
            description: "Your data has been successfully updated.",
        })
    }

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Fitness Assessment</CardTitle>
                <CardDescription>Update your personal data and measurements. This data is used for progress tracking and AI recommendations.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">User Profile</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <Label htmlFor="name">Name</Label>
                              <Input id="name" defaultValue={mockUserData.userData.name} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="age">Age</Label>
                              <Input id="age" type="number" defaultValue={mockUserData.userData.age} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="weight">Weight (kg)</Label>
                              <Input id="weight" type="number" step="0.1" defaultValue={mockUserData.userData.weight} />
                          </div>
                           <div className="space-y-2">
                              <Label htmlFor="height">Height (cm)</Label>
                              <Input id="height" type="number" defaultValue={mockUserData.userData.height} />
                          </div>
                           <div className="space-y-2">
                              <Label htmlFor="email">Email</Label>
                              <Input id="email" type="email" defaultValue={mockUserData.userData.email} />
                          </div>
                           <div className="space-y-2">
                              <Label htmlFor="whatsapp">WhatsApp</Label>
                              <Input id="whatsapp" defaultValue={mockUserData.userData.whatsapp} />
                          </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Body Composition</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          <div className="space-y-2">
                              <Label htmlFor="circ-chest">Chest (cm)</Label>
                              <Input id="circ-chest" type="number" defaultValue={mockUserData.bodyComposition.circumferences.chest} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="circ-waist">Waist (cm)</Label>
                              <Input id="circ-waist" type="number" defaultValue={mockUserData.bodyComposition.circumferences.waist} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="circ-hips">Hips (cm)</Label>
                              <Input id="circ-hips" type="number" defaultValue={mockUserData.bodyComposition.circumferences.hips} />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="skinfold-triceps">Triceps (mm)</Label>
                              <Input id="skinfold-triceps" type="number" defaultValue={mockUserData.bodyComposition.skinfolds.triceps} />
                          </div>
                      </div>
                    </div>

                    <Button type="submit" className="w-full md:w-auto">Save Assessment</Button>
                </form>
            </CardContent>
        </Card>
    )
}
