
"use client"

import { useToast, type ToastVariantIcon } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react" // Import icons
import { cn } from "@/lib/utils"

const iconMap: Record<ToastVariantIcon, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle, // Using XCircle for error
  info: Info,
  warning: AlertTriangle,
};

const iconColorMap: Record<ToastVariantIcon, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
  warning: "text-yellow-500",
};

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, iconType, ...props }) {
        const IconComponent = iconType ? iconMap[iconType] : null;
        const iconColor = iconType ? iconColorMap[iconType] : "";
        return (
          <Toast key={id} {...props}>
            <div className="flex items-start gap-3">
              {IconComponent && <IconComponent className={cn("h-5 w-5 mt-0.5 flex-shrink-0", iconColor)} />}
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
