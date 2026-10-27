"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { KeyRound, Mail, Loader2, Leaf, Eye, EyeOff } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import enMessages from "../../../../messages/en.json";
import neMessages from "../../../../messages/ne.json";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locale, setLocale] = useState<"en" | "ne">("en");

  const t = locale === "ne" ? neMessages.Login : enMessages.Login;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success(locale === "ne" ? "सफलतापूर्वक लगइन भयो! ड्यासबोर्डमा रिडिरेक्ट हुँदैछ..." : "Successfully logged in! Redirecting to dashboard...");
    } catch (err: any) {

      const errorMsg =
        err.response?.data?.error || err.response?.data?.message || t.error_invalid;
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <Link href="/landing/" className="auth-brand"><Leaf size={30} /> staywired<span className="text-[#b39766]">.</span></Link>
        <h1>Great stays.<br />Smoother days.</h1>
        <p>Your people, rooms and guest experiences. Beautifully connected in one thoughtful workspace.</p>
        <Link href="/demo/" className="text-sm underline underline-offset-4">Take a look around →</Link>
      </section>
      <section className="auth-form"><ThemeToggle />
        <div className="auth-card">
          <div className="flex justify-between items-center mb-7"><span className="text-xs uppercase tracking-[.18em] text-muted-foreground">Welcome to Staywired</span><div className="flex gap-2" aria-label="Form language">{(["en", "ne"] as const).map(lang => <button key={lang} type="button" onClick={() => setLocale(lang)} aria-pressed={locale === lang} className={`text-xs rounded px-2 py-1 ${locale === lang ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{lang.toUpperCase()}</button>)}</div></div>
          <h2>Welcome back.</h2><p className="text-sm">{t.subtitle}</p>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="field"><label htmlFor="email">{t.email}</label><div className="input-wrap"><Mail size={17} className="input-icon" /><input id="email" type="email" autoComplete="username" placeholder="name@hotel.com" {...register("email")} disabled={submitting} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} /></div>{errors.email && <p id="email-error" className="error" role="alert">{errors.email.message}</p>}</div>
            <div className="field"><label htmlFor="password">{t.password}</label><div className="input-wrap"><KeyRound size={17} className="input-icon" /><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" {...register("password")} disabled={submitting} aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} /><button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors.password && <p id="password-error" className="error" role="alert">{errors.password.message}</p>}</div>
            <button type="submit" disabled={submitting} className="auth-submit">{submitting && <Loader2 size={17} className="animate-spin" />}{submitting ? (locale === "ne" ? "लगइन हुँदैछ..." : "Signing in...") : t.submit}</button>
          </form>
          <div className="auth-footer"><Link href="/demo/">Explore the interactive demo →</Link><small>Powered by Techwired Solutions</small></div>
        </div>
      </section>
    </main>
  );
}
