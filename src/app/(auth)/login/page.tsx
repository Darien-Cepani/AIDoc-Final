
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
 FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, LogIn } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Apple } from "lucide-react"
import { useRouter } from "next/navigation"
// Placeholder Google Icon (inline SVG)
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mr-2">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

const AppleIcon = () => (
 <Apple className="h-5 w-5 mr-2" />
);


const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  // const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // On successful login, redirect to the dashboard
      router.push('/dashboard');
    } catch (err: any) {
      // Set error message based on Firebase error code
      switch (err.code) {
        case 'auth/invalid-email':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError("Invalid email or password.");
          break;
        default: setError("An unexpected error occurred. Please try again.");}
      // You can refine error handling based on Firebase error codes
      console.error("Login error:", err.message);
    }
    setIsLoading(false);
  }

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError("Failed to sign in with Google.");
    }
    setIsLoading(false);
  }

  return (
    <Card className="w-full max-w-sm glassmorphic">
      <CardHeader>
        <CardTitle className="text-2xl">Login to AIDoc</CardTitle>
        <CardDescription>
          Enter your email or use a social provider.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="m@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" variant="default" disabled={isLoading}> {/* Ensure default variant is used */}
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" /> }
              Login with Email
            </Button>
          </form>
        </Form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
         <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading}>
            <GoogleIcon /> Google
          </Button>
          <Button variant="outline" disabled>
            <AppleIcon /> Apple
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-sm">
        Don&apos;t have an account?{" "}
        <Button variant="link" className="p-1" asChild>
            <Link href="/signup">
              Sign up
            </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
