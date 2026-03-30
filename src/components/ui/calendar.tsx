
"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-6 w-full",
        month_caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-base font-black uppercase tracking-widest text-primary",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1 rounded-full"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1 rounded-full"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full mb-2",
        weekday:
          "text-muted-foreground rounded-md w-full font-black text-[10px] uppercase text-center flex items-center justify-center",
        week: "flex w-full mt-1 justify-between",
        day: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20 flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-bold rounded-full aria-selected:opacity-100 flex items-center justify-center hover:bg-accent/20 hover:text-accent-foreground"
        ),
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-full",
        today: "text-accent font-black border-2 border-accent rounded-full",
        outside:
          "day-outside text-muted-foreground opacity-30 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === 'left') return <ChevronLeft className="h-5 w-5" />;
          return <ChevronRight className="h-5 w-5" />;
        }
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
