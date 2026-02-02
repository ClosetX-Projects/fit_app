import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/icons";
import { Dashboard } from "@/components/dashboard";
import { LogWorkoutForm } from "@/components/log-workout-form";
import { AssessmentForm } from "@/components/assessment-form";
import { GoalRecommender } from "@/components/goal-recommender";
import { Bell, User, LayoutGrid, ClipboardPen, BrainCircuit, UserCog } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function Home() {
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8">
        <Logo />
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <Avatar>
            <AvatarImage src={userAvatar?.imageUrl} data-ai-hint={userAvatar?.imageHint} />
            <AvatarFallback>
              <User />
            </AvatarFallback>
          </Avatar>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto mb-6">
            <TabsTrigger value="dashboard">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="log-workout">
              <ClipboardPen className="mr-2 h-4 w-4" />
              Log Workout
            </TabsTrigger>
            <TabsTrigger value="assessment">
              <UserCog className="mr-2 h-4 w-4" />
              Assessment
            </TabsTrigger>
            <TabsTrigger value="goals">
              <BrainCircuit className="mr-2 h-4 w-4" />
              AI Goals
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
          <TabsContent value="log-workout">
            <LogWorkoutForm />
          </TabsContent>
          <TabsContent value="assessment">
            <AssessmentForm />
          </TabsContent>
          <TabsContent value="goals">
            <GoalRecommender />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
