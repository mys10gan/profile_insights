'use client'

import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'


export default function Home() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log(session)
      if (session) {
        router.push('/dashboard')
      }
    }
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('waitlist')
        .insert([{ email }])

      if (error) throw error

      toast({
        title: "Success!",
        description: "You've been added to the waitlist. We'll notify you when you're approved.",
      })
      setEmail('')
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-white">
      <div className="max-w-3xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
          Insights AI
        </h1>
        <p className="mb-8 text-lg text-gray-500 md:text-xl">
          Chat with any social media profile and gain valuable insights. Learn from the best in the business.
        </p>
        
        <div className="mx-auto max-w-md space-y-8">
          <Card className="p-6 border border-gray-100 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Join Waitlist</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                variant="default"
              >
                {loading ? 'Joining...' : 'Join Waitlist'}
              </Button>
            </form>
          </Card>

          <Card className="p-6 border border-gray-100 shadow-sm">
            <h2 className="mb-4 text-2xl font-semibold">Already Confirmed?</h2>
            <p className="mb-4 text-gray-500">
              If you've received your confirmation email, you can sign in to your account.
            </p>
            <Link href="/login">
              <Button className="w-full border-gray-200" variant="outline">
                Sign In
              </Button>
            </Link>
          </Card>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-2 text-lg font-semibold">Instagram Analysis</h3>
            <p className="text-gray-500">
              Understand what makes successful Instagram profiles tick.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-lg font-semibold">LinkedIn Insights</h3>
            <p className="text-gray-500">
              Learn from top professionals and industry leaders.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-lg font-semibold">AI-Powered Chat</h3>
            <p className="text-gray-500">
              Get personalized insights through natural conversation.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
