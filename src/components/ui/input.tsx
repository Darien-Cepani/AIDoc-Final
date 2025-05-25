
import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  prependIcon?: React.ElementType;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, prependIcon: PrependIcon, ...props }, ref) => {
    const isActuallyHidden = className?.split(' ').includes('hidden');

    return (
      <div className={cn(
        "relative flex items-center w-full",
        PrependIcon && "group",
        isActuallyHidden && "hidden" // Apply hidden to wrapper if input is meant to be hidden
      )}>
        {PrependIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none group-focus-within:text-primary transition-colors">
            <PrependIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            PrependIcon ? "pl-10 pr-3" : "px-3",
            className // Original className for the input itself
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
