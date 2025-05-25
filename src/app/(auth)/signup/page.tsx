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
import { Loader2, UserPlus } from "lucide-react"
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAuth } from "firebase/auth"
// import ReCAPTCHA from "react-google-recaptcha";

// Placeholder Google Icon (inline SVG)
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mr-2">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

// Placeholder Apple Icon (inline SVG)
const AppleIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 mr-2">
    <path d="M15.229.041a5.944 5.944 0 00-4.21 1.746 5.943 5.943 0 00-1.745 4.213A10.35 10.35 0 002.98 14.08a10.83 10.83 0 006.703 8.846 5.72 5.72 0 003.82.04 5.76 5.76 0 003.818-2.206c.003-.004.003-.008.006-.012a.11.11 0 00.01-.015.107.107 0 00.008-.012c.004-.006.004-.01.007-.015a.09.09 0 00.008-.01c.003-.007.003-.01.006-.017.035-.09.035-.18.035-.271 0-.13-.02-.26-.06-.389a2.624 2.624 0 00-2.45-1.734c-.008 0-.016 0-.024.002a.09.09 0 00-.018.003c-.005.002-.01.003-.014.004a.07.07 0 00-.016.005.06.06 0 00-.01.004.08.08 0 00-.014.006.06.06 0 00-.01.005c-.005.004-.01.007-.014.01a.07.07 0 00-.01.006c-.004.004-.008.008-.012.012a.09.09 0 00-.008.007.06.06 0 00-.01.007.08.08 0 00-.007.007.09.09 0 00-.006.008c-.002.003-.002.006-.005.008a.07.07 0 00-.004.007.1.1 0 00-.003.008c-.002.002-.002.005-.004.007a.09.09 0 00-.002.007c0 .003-.002.005-.002.008a.17.17 0 00-.002.01c0 .002-.002.004-.002.006v.003a2.66 2.66 0 002.56 2.566c.002 0 .003 0 .005 0a.05.05 0 00.008 0c.002 0 .003 0 .005 0a.09.09 0 00.008-.002c.002 0 .004-.002.006-.002a.08.08 0 00.006-.003.06.06 0 00.006-.003.09.09 0 00.005-.004c.002-.002.004-.003.005-.005a.08.08 0 00.004-.004.07.07 0 00.004-.004.08.08 0 00.003-.005c.002-.002.003-.004.004-.006a.1.1 0 00.002-.005c.002-.003.003-.006.004-.008a.19.19 0 000-.005c.329-.697.508-1.47.508-2.266a5.95 5.95 0 00-2.954-5.115 5.82 5.82 0 00-3.24-1.138 3.53 3.53 0 01-3.077-2.335 3.46 3.46 0 012.32-3.082A5.72 5.72 0 0015.229.042z"/>
    <path d="M12.376 5.467a2.983 2.983 0 00-2.36 1.175 2.983 2.983 0 00-1.173 2.363c0 .89.393 1.69.998 2.237a2.72 2.72 0 002.1.868 2.69 2.69 0 002.143-.935c.033-.036.062-.076.087-.119a.11.11 0 00.012-.02.09.09 0 00.01-.018.1.1 0 00.006-.017.11.11 0 00.005-.018.13.13 0 00.002-.018c.002-.008.002-.017.002-.025a.22.22 0 00-.002-.025c0-.007-.002-.013-.002-.02a.11.11 0 00-.005-.018.1.1 0 00-.006-.017.09.09 0 00-.01-.018.11.11 0 00-.012-.02.1.1 0 00-.013-.017c-.006-.005-.01-.01-.016-.014l-.015-.012a2.73 2.73 0 00-2.706-1.012z"/>
 </svg>
);

const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters." })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
  .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
  .regex(/[0-9]/, { message: "Password must contain at least one number." })
  .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." });

const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).trim(),
  email: z.string().email({ message: "Invalid email address." }).trim(),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"], // Set the error on the confirmPassword field
})
type SignupFormValues = z.infer<typeof signupSchema>

export default function SignupPage() {

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [captchaValue, setCaptchaValue] = useState<string | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
 name: "",
 confirmPassword: "", // Explicitly set confirmPassword to an empty string
    },
  })

  async function onSubmit({ email, password }: SignupFormValues) {
    // if (!captchaValue) {
    //   setError("Please complete the CAPTCHA.");
    //   return;
    // }

    const { auth } = await import('@/lib/firebase');

    setIsLoading(true);
    setError(null);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // If successful, the AuthContext will handle the user state and redirection
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err.message || "An error occurred during signup.");
    } finally {
      setIsLoading(false);
    }
    // Router will redirect to onboarding via AuthContext logic
  }

 async function handleGoogleSignup() {
    const { auth } = await import('@/lib/firebase');
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // If successful, the AuthContext will handle the user state and redirection
    } catch (err: any) {
      console.error("Google signup error:", err);
      setError(err.message || "An error occurred during Google signup.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm glassmorphic">
      <CardHeader>
        <CardTitle className="text-2xl">Sign up to AIDoc</CardTitle>
        <CardDescription>
          Enter your email or use a social provider.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* <ReCAPTCHA
              sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
              onChange={setCaptchaValue}
            /> */}
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Sign Up with Email
            </Button>
          </form>
        </Form>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or sign up with
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={handleGoogleSignup} disabled={isLoading}>
            <GoogleIcon /> Google
          </Button>
          <Button variant="outline" disabled>
            <AppleIcon /> Apple
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-sm">
        Already have an account?{" "}
        <Button variant="link" className="p-1" asChild>
          <Link href="/login">
            Login
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
