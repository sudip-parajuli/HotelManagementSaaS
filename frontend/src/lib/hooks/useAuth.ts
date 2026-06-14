import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, UserProfile } from "../store/authStore";
import { authClient } from "../api/client";

export const useAuth = () => {
  const router = useRouter();
  const { user, isAuthenticated, setUser, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.post("/login", { email, password });
      const userProfile: UserProfile = response.data.user;
      setUser(userProfile);
      if (userProfile.role === "SUPER_ADMIN") {
        router.push("/superadmin");
      } else {
        router.push("/");
      }
      return userProfile;
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error || err.response?.data?.message || "Failed to log in";
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await authClient.post("/logout");
    } catch (err) {
      console.error("Logout API call failed:", err);
    } finally {
      clearAuth();
      router.push("/login");
      setLoading(false);
    }
  };

  const fetchMe = async () => {
    setLoading(true);
    try {
      const response = await authClient.get("/me");
      const userProfile: UserProfile = response.data;
      setUser(userProfile);
      return userProfile;
    } catch (err) {
      clearAuth();
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    fetchMe,
  };
};
