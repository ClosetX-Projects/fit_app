"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Check, Repeat } from "lucide-react"
import React from "react"

export function LogWorkoutForm() {
    const { toast } = useToast()
    const [rpe, setRpe] = React.useState(7)

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        toast({
            title: "Workout Logged!",
            description: "Great job on your workout today.",
            action: (
              <div className="flex items-center gap-2 text-primary">
                <Check className="h-5 w-5" />
                <span>Success</span>
              </div>
            ),
        })
    }
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Log a Workout</CardTitle>
        <CardDescription>Record the details of your training session.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="exercise">Exercise</Label>
                <Select name="exercise">
                  <SelectTrigger id="exercise">
                    <SelectValue placeholder="Select an exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="squat">Squat</SelectItem>
                    <SelectItem value="bench-press">Bench Press</SelectItem>
                    <SelectItem value="deadlift">Deadlift</SelectItem>
                    <SelectItem value="overhead-press">Overhead Press</SelectItem>
                    <SelectItem value="barbell-row">Barbell Row</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" type="number" placeholder="e.g., 60" />
              </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sets">Sets</Label>
                <Input id="sets" type="number" placeholder="e.g., 3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reps">Reps</Label>
                <Input id="reps" type="number" placeholder="e.g., 8" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" placeholder="e.g., 100" />
              </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="rpe">Rate of Perceived Exertion (RPE)</Label>
              <span className="w-12 text-center text-lg font-bold text-primary">{rpe}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground px-1">
                <span>Easy</span>
                <span>Max Effort</span>
            </div>
            <Slider id="rpe" defaultValue={[rpe]} onValueChange={(value) => setRpe(value[0])} min={1} max={10} step={1} />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch id="repeat-intention" />
            <Label htmlFor="repeat-intention" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4" />
                Intention to repeat next session
            </Label>
          </div>
          
          <Button type="submit" className="w-full md:w-auto">Log Workout</Button>
        </form>
      </CardContent>
    </Card>
  )
}
