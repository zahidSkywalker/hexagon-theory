"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { UserPlus, AlertCircle, Check } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const passwordStrength = (() => {
    const p = formData.password;
    if (!p) return { score: 0, label: "", color: "" };
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const levels = [
      { label: "Weak", color: "text-red-400 bg-red-500/10" },
      { label: "Fair", color: "text-yellow-400 bg-yellow-500/10" },
      { label: "Good", color: "text-blue-400 bg-blue-500/10" },
      { label: "Strong", color: "text-green-400 bg-green-500/10" },
    ];
    return { score, ...levels[score - 1] || levels[0] };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);

    try {
      await register(
        formData.email,
        formData.username,
        formData.password,
        formData.full_name || undefined
      );
      showToast("Account created successfully!", "success");
      router.push("/");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const message =
        axiosErr?.response?.data?.detail || "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text mb-2">
            Join HexaGon Theory
          </h1>
          <p className="text-gray-400 text-sm">
            Start sharing your innovative ideas with the world
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Username <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input"
              placeholder="johndoe"
              required
              disabled={loading}
              minLength={3}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Full Name <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="input"
              placeholder="John Doe"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
              placeholder="••••••••"
              required
              disabled={loading}
              minLength={8}
            />
            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= passwordStrength.score
                          ? passwordStrength.score <= 1
                            ? "bg-red-500"
                            : passwordStrength.score <= 2
                            ? "bg-yellow-500"
                            : passwordStrength.score <= 3
                            ? "bg-blue-500"
                            : "bg-green-500"
                          : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${passwordStrength.color.split(" ")[0]}`}>
                  {passwordStrength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Confirm Password <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="input"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            {formData.confirmPassword &&
              formData.password === formData.confirmPassword && (
                <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Passwords match
                </p>
              )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading ? (
              <div className="spinner h-5 w-5" />
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
