'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/supabase-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LayoutDashboard, MessageSquare, LogOut, ChevronDown, BarChart, User2, Menu, X } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import Image from 'next/image'

const Navbar = () => {
  const { user } = useSupabase()
  const router = useRouter()
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Check if current page is an auth page
  const isAuthPage = pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/waitlist'

  // Add scroll listener to add shadow when scrolled
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // If we're on an auth page, don't render the navbar
  if (isAuthPage) return null

  const navLinks = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: <LayoutDashboard className="h-4 w-4 mr-2" />,
      active: pathname === '/dashboard'
    },
    { 
      name: 'My Profiles', 
      href: '/profiles', 
      icon: <User2 className="h-4 w-4 mr-2" />,
      active: pathname.includes('/profiles') || pathname.includes('/analysis')
    },
    { 
      name: 'Chats', 
      href: '/chats', 
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      active: pathname.includes('/chat')
    }
  ]

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-200 ${
        isScrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-white'
      }`}
    >
      <div className="container mx-auto max-w-6xl px-4 py-3">
        <nav className="flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/logo.jpeg" alt="Torque AI Logo" width={32} height={32} className="w-8 h-8" />
              <span className="font-bold text-lg tracking-tight hidden sm:inline-block">Torque AI</span>
            </Link>
            
            <div className="hidden md:flex items-center ml-8 space-x-1">
              {navLinks.map((link) => (
                <Link 
                  key={link.href} 
                  href={link.href}
                  className={`flex items-center px-3 py-1.5 text-sm rounded-full transition-colors ${
                    link.active 
                      ? 'bg-black text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.icon}
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile menu button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-2 mb-6">
                      <Image src="/logo.jpeg" alt="Torque AI Logo" width={32} height={32} className="w-8 h-8" />
                      <span className="font-bold text-lg">Torque AI</span>
                    </div>
                    {user && (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.email}`} alt={user.email || ""} />
                          <AvatarFallback>{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">{user.email?.split('@')[0]}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <nav className="flex-1 p-4">
                    <div className="space-y-1">
                      {navLinks.map((link) => (
                        <Link 
                          key={link.href} 
                          href={link.href}
                          className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors w-full ${
                            link.active 
                              ? 'bg-black text-white' 
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {link.icon}
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </nav>
                  
                  {user && (
                    <div className="border-t p-4">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-red-600 border-gray-200"
                        onClick={async () => {
                          await supabase.auth.signOut();
                          router.push('/');
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            
            {user && (
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-full h-9 px-2 sm:px-3 flex items-center gap-2 border-gray-200">
                      <Avatar className="h-6 w-6 sm:h-7 sm:w-7">
                        <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${user.email}`} alt={user.email || ""} />
                        <AvatarFallback className="text-xs">{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium hidden sm:inline-block truncate max-w-[100px]">
                        {user.email?.split('@')[0]}
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
                    <DropdownMenuLabel className="font-normal text-xs text-gray-500 px-2 py-1.5">
                      Logged in as
                    </DropdownMenuLabel>
                    <DropdownMenuItem className="rounded-lg px-2 py-1.5">
                      <span className="font-medium truncate">{user.email}</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="my-1" />
                    
                    <DropdownMenuItem 
                      className="rounded-lg flex items-center gap-2 px-2 py-1.5"
                      onClick={() => router.push('/dashboard')}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="rounded-lg flex items-center gap-2 px-2 py-1.5"
                      onClick={() => router.push('/profiles')}
                    >
                      <BarChart className="h-4 w-4" />
                      My Insights
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="my-1" />
                    
                    <DropdownMenuItem 
                      className="text-red-600 cursor-pointer rounded-lg flex items-center gap-2 px-2 py-1.5"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        router.push('/');
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Navbar 