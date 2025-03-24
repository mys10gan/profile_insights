"use client";

import { ReactNode } from "react"

interface ChatLayoutProps {
  children: ReactNode
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <>
      <style jsx global>{`
        html, body {
          height: 100%;
          overflow: hidden;
          margin: 0;
          padding: 0;
        }
        
        nav {
          display: none !important;
        }
        
        /* Reset container classes in header */
        header .container,
        .chat-header .container {
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        @keyframes slideInHeader {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideInFooter {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeInContent {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        .chat-header {
          animation: slideInHeader 0.4s ease-out forwards;
          width: 100%;
          z-index: 20;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          min-height: 48px;
          height: auto !important;
          max-height: none !important;
          display: flex;
          align-items: center;
          padding: 8px 12px !important;
          position: fixed !important;
          top: 0;
          left: 0;
          right: 0;
        }
        
        .chat-header h1 {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          margin: 0;
        }
        
        .chat-content {
          animation: fadeInContent 0.5s ease-out forwards;
          height: 100vh;
          position: fixed;
          inset: 0;
          z-index: 10;
          overflow-y: scroll;
          -webkit-overflow-scrolling: touch;
        }
        
        .chat-input {
          animation: slideInFooter 0.4s ease-out forwards;
          width: 100%;
          z-index: 20;
          box-shadow: 0 -1px 3px rgba(0,0,0,0.05);
          min-height: 60px;
        }
        
        /* Make sure scrollbar looks nice */
        .chat-content::-webkit-scrollbar {
          width: 6px;
        }
        
        .chat-content::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .chat-content::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.1);
          border-radius: 20px;
        }
        
        /* Message animations */
        @keyframes messageIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .chat-message {
          animation: messageIn 0.3s ease-out forwards;
        }
        
        @media (max-width: 640px) {
          .chat-header {
            padding: 6px 10px !important;
          }
        }
      `}</style>
      <div className="h-full overflow-hidden">
        {children}
      </div>
    </>
  )
} 