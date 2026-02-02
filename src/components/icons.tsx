import { Dumbbell } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex items-center gap-2", className)} {...props}>
            <Dumbbell className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight text-foreground">FitAssist</span>
        </div>
    );
}
