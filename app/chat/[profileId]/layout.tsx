import { ReactNode } from "react"

interface ProfileChatLayoutProps {
  children: ReactNode
}

export default function ProfileChatLayout({ children }: ProfileChatLayoutProps) {
  return (
    <div className="h-full">
      {children}
    </div>
  )
} 