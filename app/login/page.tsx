"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data?.user) {
        router.push("/dashboard"); // Redirect to dashboard after successful login
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-6">
          <Image 
            src="/logo.jpeg" 
            alt="Torque AI Logo" 
            width={120} 
            height={120}
            className="rounded-full shadow-md" 
          />
        </div>
        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-black">
          Torque AI
        </h1>
        <p className="mb-8 text-lg text-gray-600 max-w-md mx-auto">
          Sign in to your account to access powerful AI-driven social media insights
        </p>
        
        <Card className="p-6 border border-gray-100 shadow-lg rounded-xl bg-white mb-4">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="text-left">
              <Label htmlFor="email" className="text-gray-700 mb-1 block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:border-gray-300"
              />
            </div>
            
            <div className="text-left">
              <Label htmlFor="password" className="text-gray-700 mb-1 block">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus-visible:ring-1 focus-visible:ring-gray-400 focus-visible:border-gray-300 pr-10"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword(!showPassword);
                  }}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 text-left">
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full rounded-xl text-base text-white py-6 bg-black hover:bg-gray-800 transition-all transform hover:scale-105 mt-2"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>
        
        <Card className="p-6 border border-gray-100 shadow-lg rounded-xl bg-white">
          <h2 className="mb-2 text-xl font-semibold">Don't have an account?</h2>
          <p className="mb-4 text-gray-600">
            Join our waitlist to get early access to Torque AI's powerful social media insights.
          </p>
          <Link href="/" className="w-full block">
            <Button 
              className="w-full border border-gray-300 rounded-xl text-base py-6 hover:bg-gray-100 transition-all transform hover:scale-105" 
              variant="outline"
            >
              Join Waitlist
            </Button>
          </Link>
        </Card>

        <p className="mt-8 text-sm text-gray-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
} 