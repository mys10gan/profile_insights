"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Card className="w-[400px] border border-gray-100 shadow-sm">
        <CardHeader>
          <div className="flex flex-col items-center mb-4">
            <svg className="w-12 h-12 text-primary mb-2" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.907 11.998 10.332 9.23a.9.9 0 0 1-.16-.037l-.018-.007v6.554c0 .017.008.034.01.051l2.388-2.974 3.355-.82Z"/>
              <path d="m11.463 4.054 5.579 3.323A4.02 4.02 0 0 1 18.525 9c.332.668.47 1.414.398 2.155a3.07 3.07 0 0 1-.745 1.65a3.108 3.108 0 0 1-1.55.951c-.022.007-.045.005-.07.01-.062.03-.126.057-.191.08l-2.72.667-1.992 2.48c-.18.227-.41.409-.67.534.047.034.085.077.137.107a2.05 2.05 0 0 0 1.995.035c.592-.33 2.15-1.201 4.636-2.892l.28-.19c1.328-.895 3.616-2.442 3.967-4.215a9.94 9.94 0 0 0-1.713-4.154a10.027 10.027 0 0 0-3.375-2.989a10.107 10.107 0 0 0-8.802-.418c1.162.287 2.287.704 3.354 1.243Z"/>
              <path d="M5.382 17.082v-6.457a3.7 3.7 0 0 1 .45-1.761a3.733 3.733 0 0 1 1.238-1.34a3.915 3.915 0 0 1 3.433-.245c.176.03.347.084.508.161l5.753 2.856c.082.05.161.105.236.165a2.128 2.128 0 0 0-.953-1.455l-5.51-3.284c-1.74-.857-3.906-1.523-5.244-1.097a9.96 9.96 0 0 0-2.5 3.496a9.895 9.895 0 0 0 .283 8.368a9.973 9.973 0 0 0 2.73 3.322a17.161 17.161 0 0 1-.424-2.729Z"/>
              <path d="m19.102 16.163-.272.183c-2.557 1.74-4.169 2.64-4.698 2.935a4.083 4.083 0 0 1-2 .53a3.946 3.946 0 0 1-1.983-.535a3.788 3.788 0 0 1-1.36-1.361a3.752 3.752 0 0 1-.51-1.85a1.812 1.812 0 0 1-.043-.26V9.143c0-.024.009-.046.01-.07-.056.02-.11.043-.162.07a1.796 1.796 0 0 0-.787 1.516v6.377a10.67 10.67 0 0 0 1.113 4.27a10.11 10.11 0 0 0 8.505-.53a10.022 10.022 0 0 0 3.282-2.858a9.936 9.936 0 0 0 1.75-3.97a19.615 19.615 0 0 1-2.845 2.216Z"/>
            </svg>
            <h1 className="text-2xl font-bold">Profile Insights</h1>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="border-gray-200 focus:border-gray-300 focus:ring-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                className="border-gray-200 focus:border-gray-300 focus:ring-gray-300"
              />
            </div>
            {error && (
              <div className="text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-black text-white hover:bg-gray-800 transition-all transform hover:scale-105"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-sm text-gray-500 text-center">
              Don&apos;t have an account?{" "}
              <Link href="/" className="text-gray-900 hover:underline">
                Join waitlist
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 