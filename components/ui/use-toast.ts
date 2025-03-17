"use client"

import { toast as sonnerToast } from "sonner"
import * as React from "react"

type ToastProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  variant?: "default" | "destructive" | "success"
}

const toast = ({
  title,
  description,
  variant = "default",
  action,
  ...props
}: ToastProps) => {
  if (variant === "destructive") {
    return sonnerToast.error(title as string, {
      description,
      action,
      ...props,
    })
  } else if (variant === "success") {
    return sonnerToast.success(title as string, {
      description,
      action,
      ...props,
    })
  } else {
    return sonnerToast(title as string, {
      description,
      action,
      ...props,
    })
  }
}

export { toast }
export const useToast = () => ({ toast }) 