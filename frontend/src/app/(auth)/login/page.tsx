"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { KeyRound, Mail, Loader2 } from "lucide-react";

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
      console.error(err);
      const errorMsg =
        err.response?.data?.error || err.response?.data?.message || t.error_invalid;
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center p-4 select-none"
      style={{ backgroundImage: `url('/hotel_login_bg.png')` }}
    >
      {/* Dark overlay for atmosphere */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-md z-10 animate-fade-in">
        <Card className="bg-black/40 border border-white/10 backdrop-blur-lg shadow-2xl text-white">
          <CardHeader className="space-y-2 text-center pb-6 relative">
            {/* Inline Language Selector */}
            <div className="absolute right-4 top-4 flex gap-1 bg-white/5 border border-white/10 rounded-full p-0.5">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all ${
                  locale === "en" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLocale("ne")}
                className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all ${
                  locale === "ne" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                NE
              </button>
            </div>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/20">
              <KeyRound className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              SIA Enterprises
            </CardTitle>
            <CardDescription className="text-slate-400 font-medium">
              {t.subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 font-medium">
                  {t.email}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@hotel.com"
                    {...register("email")}
                    disabled={submitting}
                    className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300 font-medium">
                    {t.password}
                  </Label>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    disabled={submitting}
                    className="pl-10 bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-400 mt-1 font-medium">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-md shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300 transform active:scale-[0.98] py-2.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {locale === "ne" ? "लगइन हुँदैछ..." : "Signing in..."}
                  </>
                ) : (
                  t.submit
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-white/5 pt-4 pb-6">
            <span className="text-xs text-slate-500 font-medium">
              SIA Enterprises SaaS Engine © 2026
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
