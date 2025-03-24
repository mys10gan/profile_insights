import { ReactNode } from "react"

interface ChatLayoutProps {
  children: ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="h-full">
      {children}
    </div>
  )
} 