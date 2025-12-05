import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  role: z.enum(["investor", "company"]),
  automatic_availability: z.boolean().default(false),
  availability_from: z.string().optional(),
  availability_to: z.string().optional(),
  availability_timezone: z.string().default("UTC"),
  arrange_meetings: z.boolean().default(false),
}).refine(
  (data) => {
    // If automatic_availability is true, both dates are required
    if (data.automatic_availability) {
      return data.availability_from && data.availability_to;
    }
    return true;
  },
  {
    message: "Available From and Available To are required when Automatic Availability is enabled",
    path: ["availability_from"],
  }
).refine(
  (data) => {
    // If both dates are provided, To must be after From
    if (data.availability_from && data.availability_to) {
      const fromTime = new Date(data.availability_from);
      const toTime = new Date(data.availability_to);
      return toTime > fromTime;
    }
    return true;
  },
  {
    message: "Available To must be after Available From",
    path: ["availability_to"],
  }
);

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: "Invalid reset token" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [resetMode, setResetMode] = useState<'idle' | 'request' | 'reset' | 'success'>('idle');
  const [showForgotDialog, setShowForgotDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const { toast } = useToast();

  // URL params parsing (simplified)
  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get("mode") === "register" ? "register" : "login";
  const defaultRole = searchParams.get("role") === "company" ? "company" : "investor";
  const tokenFromUrl = searchParams.get("token");
  const verifyTokenFromUrl = searchParams.get("verify_token");

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { 
      name: "", 
      email: "", 
      password: "", 
      role: defaultRole as "investor" | "company",
      automatic_availability: false,
      availability_from: "",
      availability_to: "",
      availability_timezone: "UTC",
      arrange_meetings: false,
    },
  });

  const forgotPasswordForm = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const resetPasswordForm = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: resetToken, password: "", confirmPassword: "" },
  });

  // If token present in URL, initialize reset flow and populate the reset form.
  useEffect(() => {
    if (tokenFromUrl) {
      setResetMode('reset');
      setResetToken(tokenFromUrl);
      // populate the form's token value so validation passes and it's submitted
      resetPasswordForm.reset({ token: tokenFromUrl, password: '', confirmPassword: '' });
    }

    // If the URL contains an email verification token (from registration), call the API to verify it.
    async function verifyEmail(token: string) {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/auth/verify?verify_token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (res.ok) {
          toast({ title: 'Email verified', description: 'Your email has been verified. You can now sign in.' });
          // After verification, switch to login tab and clear the token param from URL
          setLocation('/auth?mode=login');
        } else {
          toast({ title: 'Verification failed', description: data?.message ?? 'Unable to verify email', variant: 'destructive' });
        }
      } catch (err: any) {
        toast({ title: 'Verification error', description: err?.message ?? 'Unable to verify email', variant: 'destructive' });
      } finally {
        setIsLoading(false);
        // Remove token from URL to prevent re-run if user refreshes
        try { window.history.replaceState({}, document.title, '/auth?mode=login'); } catch {};
      }
    }

    if (verifyTokenFromUrl) {
      verifyEmail(verifyTokenFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromUrl]);

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || 'Login failed';
        // If not verified, surface resend UI
        if (msg.toLowerCase().includes('not verified')) {
          setShowResendVerification(true);
          setResendEmail(values.email);
        }
        throw new Error(msg);
      }

      const role = data?.user?.role as string | undefined;
      if (role === 'company') setLocation('/dashboard/company');
      else if (role === 'admin') setLocation('/dashboard/admin');
      else setLocation('/dashboard/investor');
    } catch (err: any) {
      toast({ title: 'Login failed', description: err?.message ?? 'Unable to login' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!resendEmail) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resendEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Failed to resend verification');
      }
      toast({ title: 'Verification sent', description: 'A new verification link has been sent to your email.' });
      setShowResendVerification(false);
    } catch (err: any) {
      toast({ title: 'Resend failed', description: err?.message ?? 'Unable to resend verification', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }

  async function onRegister(values: z.infer<typeof registerSchema>) {
    setIsLoading(true);
    setRegisterError(null); // Clear any previous errors
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      
      if (!res.ok) {
        const errorMessage = data?.message || 'Registration failed';
        setRegisterError(errorMessage);
        toast({ 
          title: 'Registration failed', 
          description: errorMessage,
          variant: 'destructive' 
        });
        return; // Exit without clearing form
      }

      // Success: Show verification message and reset form
      toast({ 
        title: 'Success!', 
        description: 'A verification link has been sent to your email. Please verify your email before logging in.' 
      });
      registerForm.reset({
        name: "",
        email: "",
        password: "",
        role: defaultRole as "investor" | "company",
        automatic_availability: false,
        availability_from: "",
        availability_to: "",
        availability_timezone: "UTC",
        arrange_meetings: false,
      });
      
      // Optional: Redirect to verification page or login page
      setTimeout(() => {
        setLocation('/auth?mode=login');
      }, 2000);
    } catch (err: any) {
      const errorMessage = err?.message ?? 'Unable to register';
      setRegisterError(errorMessage);
      toast({ 
        title: 'Registration failed', 
        description: errorMessage,
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onForgotPassword(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to request reset');

      setResetEmail(values.email);
      setShowForgotDialog(false);
      setResetMode('request');
      toast({ title: 'Check your email', description: 'Password reset link sent to your email address' });
    } catch (err: any) {
      toast({ 
        title: 'Request failed', 
        description: err?.message ?? 'Unable to send reset email. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onResetPassword(values: z.infer<typeof resetPasswordSchema>) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to reset password');

      setResetMode('success');
      toast({ title: 'Success', description: 'Your password has been reset. Please log in with your new password.' });
      
      setTimeout(() => {
        setResetMode('idle');
        forgotPasswordForm.reset();
        resetPasswordForm.reset();
      }, 3000);
    } catch (err: any) {
      toast({ 
        title: 'Reset failed', 
        description: err?.message ?? 'Unable to reset password. The link may have expired.' 
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Reset mode views
  if (resetMode === 'request') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px]" />

        <Card className="w-full max-w-md border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Mail className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-heading">Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to your inbox
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Email sent to:</p>
              <p className="font-mono text-sm break-all">{resetEmail}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              The link expires in 24 hours. If you don't see an email, check your spam folder.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => {
                setResetMode('idle');
                setResetEmail('');
                forgotPasswordForm.reset();
              }}
            >
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (resetMode === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px]" />

        <Card className="w-full max-w-md border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/25">
              E
            </div>
            <CardTitle className="text-2xl font-heading">Create new password</CardTitle>
            <CardDescription>
              Enter a new password for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
                {/* hidden token field so the token is part of submitted values and validated */}
                <input type="hidden" {...resetPasswordForm.register('token')} />
                <FormField
                  control={resetPasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="bg-white/5 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetPasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="bg-white/5 border-white/10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Reset Password"}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter>
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={() => {
                setResetMode('idle');
                resetPasswordForm.reset();
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (resetMode === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px]" />

        <Card className="w-full max-w-md border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-green-500/25">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-heading">Password reset successful</CardTitle>
            <CardDescription>
              Your password has been updated. Redirecting...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Forgot Password Dialog */}
      <Dialog open={showForgotDialog} onOpenChange={setShowForgotDialog}>
        <DialogContent className="bg-black/60 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Reset your password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(onForgotPassword)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="your@email.com" 
                        {...field} 
                        className="bg-white/5 border-white/10" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowForgotDialog(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Send Reset Link"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Background Ambient Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/25">
            E
          </div>
          <CardTitle className="text-2xl font-heading">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access the portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="name@example.com" {...field} className="bg-white/5 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="bg-white/5 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In"}
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-black/60 px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="w-full text-sm"
                    onClick={() => setShowForgotDialog(true)}
                  >
                    Forgot your password?
                  </Button>
                  {showResendVerification && (
                    <div className="pt-2">
                      <Button type="button" className="w-full bg-secondary/80 hover:bg-secondary" onClick={handleResendVerification} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Resend verification email'}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>I am a...</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid grid-cols-2 gap-4"
                          >
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="investor" className="peer sr-only" />
                              </FormControl>
                              <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all">
                                <span className="mb-2 text-lg">Investor</span>
                                <span className="text-xs text-center text-muted-foreground">Looking for deals</span>
                              </FormLabel>
                            </FormItem>
                            <FormItem>
                              <FormControl>
                                <RadioGroupItem value="company" className="peer sr-only" />
                              </FormControl>
                              <FormLabel className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all">
                                <span className="mb-2 text-lg">Company</span>
                                <span className="text-xs text-center text-muted-foreground">Looking for capital</span>
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} className="bg-white/5 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Email</FormLabel>
                          <FormControl>
                            <Input placeholder="name@firm.com" {...field} className="bg-white/5 border-white/10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="bg-white/5 border-white/10" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Error display */}
                  {registerError && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive">{registerError}</p>
                    </div>
                  )}

                  {/* Feature A: Automatic Availability */}
                  <FormField
                    control={registerForm.control}
                    name="automatic_availability"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-white/20"
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Enable Automatic Availability
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  {/* Conditional fields for automatic availability */}
                  {registerForm.watch("automatic_availability") && (
                    <div className="space-y-3 p-3 bg-white/5 rounded-md border border-white/10">
                      <FormField
                        control={registerForm.control}
                        name="availability_from"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available From</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                {...field} 
                                className="bg-white/5 border-white/10" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="availability_to"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available To</FormLabel>
                            <FormControl>
                              <Input 
                                type="datetime-local" 
                                {...field} 
                                className="bg-white/5 border-white/10" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="availability_timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <FormControl>
                              <select 
                                {...field}
                                className="w-full bg-white/5 border border-white/10 rounded-md p-2 text-sm"
                              >
                                <option value="UTC">UTC</option>
                                <option value="EST">EST</option>
                                <option value="CST">CST</option>
                                <option value="MST">MST</option>
                                <option value="PST">PST</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Feature B: Managed Meeting Opt-in */}
                  <FormField
                    control={registerForm.control}
                    name="arrange_meetings"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-white/20"
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">
                          Interested in Managed Meetings?
                        </FormLabel>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-center border-t border-white/5 pt-6">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to EIF's Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
