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
              <svg className="w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.907 11.998 10.332 9.23a.9.9 0 0 1-.16-.037l-.018-.007v6.554c0 .017.008.034.01.051l2.388-2.974 3.355-.82Z"/>
                <path d="m11.463 4.054 5.579 3.323A4.02 4.02 0 0 1 18.525 9c.332.668.47 1.414.398 2.155a3.07 3.07 0 0 1-.745 1.65a3.108 3.108 0 0 1-1.55.951c-.022.007-.045.005-.07.01-.062.03-.126.057-.08l-2.72.667-1.992 2.48c-.18.227-.41.409-.67.534.047.034.085.077.137.107a2.05 2.05 0 0 0 1.995.035c.592-.33 2.15-1.201 4.636-2.892l.28-.19c1.328-.895 3.616-2.442 3.967-4.215a9.94 9.94 0 0 0-1.713-4.154a10.027 10.027 0 0 0-3.375-2.989a10.107 10.107 0 0 0-8.802-.418c1.162.287 2.287.704 3.354 1.243Z"/>
                <path d="M5.382 17.082v-6.457a3.7 3.7 0 0 1 .45-1.761a3.733 3.733 0 0 1 1.238-1.34a3.915 3.915 0 0 1 3.433-.245c.176.03.347.084.508.161l5.753 2.856c.082.05.161.105.236.165a2.128 2.128 0 0 0-.953-1.455l-5.51-3.284c-1.74-.857-3.906-1.523-5.244-1.097a9.96 9.96 0 0 0-2.5 3.496a9.895 9.895 0 0 0 .283 8.368a9.973 9.973 0 0 0 2.73 3.322a17.161 17.161 0 0 1-.424-2.729Z"/>
                <path d="m19.102 16.163-.272.183c-2.557 1.74-4.169 2.64-4.698 2.935a4.083 4.083 0 0 1-2 .53a3.946 3.946 0 0 1-1.983-.535a3.788 3.788 0 0 1-1.36-1.361a3.752 3.752 0 0 1-.51-1.85a1.812 1.812 0 0 1-.043-.26V9.143c0-.024.009-.046.01-.07-.056.02-.11.043-.162.07a1.796 1.796 0 0 0-.787 1.516v6.377a10.67 10.67 0 0 0 1.113 4.27a10.11 10.11 0 0 0 8.505-.53a10.022 10.022 0 0 0 3.282-2.858a9.936 9.936 0 0 0 1.75-3.97a19.615 19.615 0 0 1-2.845 2.216Z"/>
              </svg>
              <span className="font-bold text-lg tracking-tight hidden sm:inline-block">Insights AI</span>
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
                      <svg className="w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.907 11.998 10.332 9.23a.9.9 0 0 1-.16-.037l-.018-.007v6.554c0 .017.008.034.01.051l2.388-2.974 3.355-.82Z"/>
                        <path d="m11.463 4.054 5.579 3.323A4.02 4.02 0 0 1 18.525 9c.332.668.47 1.414.398 2.155a3.07 3.07 0 0 1-.745 1.65a3.108 3.108 0 0 1-1.55.951c-.022.007-.045.005-.07.01-.062.03-.126.057-.08l-2.72.667-1.992 2.48c-.18.227-.41.409-.67.534.047.034.085.077.137.107a2.05 2.05 0 0 0 1.995.035c.592-.33 2.15-1.201 4.636-2.892l.28-.19c1.328-.895 3.616-2.442 3.967-4.215a9.94 9.94 0 0 0-1.713-4.154a10.027 10.027 0 0 0-3.375-2.989a10.107 10.107 0 0 0-8.802-.418c1.162.287 2.287.704 3.354 1.243Z"/>
                        <path d="M5.382 17.082v-6.457a3.7 3.7 0 0 1 .45-1.761a3.733 3.733 0 0 1 1.238-1.34a3.915 3.915 0 0 1 3.433-.245c.176.03.347.084.508.161l5.753 2.856c.082.05.161.105.236.165a2.128 2.128 0 0 0-.953-1.455l-5.51-3.284c-1.74-.857-3.906-1.523-5.244-1.097a9.96 9.96 0 0 0-2.5 3.496a9.895 9.895 0 0 0 .283 8.368a9.973 9.973 0 0 0 2.73 3.322a17.161 17.161 0 0 1-.424-2.729Z"/>
                        <path d="m19.102 16.163-.272.183c-2.557 1.74-4.169 2.64-4.698 2.935a4.083 4.083 0 0 1-2 .53a3.946 3.946 0 0 1-1.983-.535a3.788 3.788 0 0 1-1.36-1.361a3.752 3.752 0 0 1-.51-1.85a1.812 1.812 0 0 1-.043-.26V9.143c0-.024.009-.046.01-.07-.056.02-.11.043-.162.07a1.796 1.796 0 0 0-.787 1.516v6.377a10.67 10.67 0 0 0 1.113 4.27a10.11 10.11 0 0 0 8.505-.53a10.022 10.022 0 0 0 3.282-2.858a9.936 9.936 0 0 0 1.75-3.97a19.615 19.615 0 0 1-2.845 2.216Z"/>
                      </svg>
                      <span className="font-bold text-lg">Insights AI</span>
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