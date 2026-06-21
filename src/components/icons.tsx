import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex items-center gap-3", className)} {...props}>
            <img
                src="/logo.png"
                alt="FitAssist"
                className="h-11 w-11 rounded-2xl object-cover shadow-sm ring-1 ring-primary/10"
            />
            <span className="text-xl font-black tracking-tight text-foreground">FitAssist</span>
        </div>
    );
}
