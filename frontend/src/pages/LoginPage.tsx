import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import authService from "../services/authService";
import { useAuthStore } from "../store/authStore";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, setAuth } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Retrieve origin route if redirected by route guard
  const fromLocation =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromLocation, { replace: true });
    }
  }, [isAuthenticated, navigate, fromLocation]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await authService.login({ email, password });
      setAuth(data.user, data.access_token);
      navigate(fromLocation, { replace: true });
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === "string"
      ) {
        setErrorMessage(
          (err as { response: { data: { detail: string } } }).response.data.detail
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Authentication failed. Please verify credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col justify-center items-center py-6 px-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Sign In
          </h1>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-5">
            {errorMessage && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-200 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@fleet.local"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-lg shadow-blue-600/25 transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Submit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick-Fill Presets Section for Fast Verification */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Sprint 1 Test Personas (Quick-Fill):</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickFill("admin@fleet.local", "AdminPassword123!")
                }
                className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-purple-500/30 rounded-lg text-xs font-medium text-purple-300 transition text-center hover:border-purple-400"
              >
                ADMIN
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickFill(
                    "dispatcher@fleet.local",
                    "DispatcherPassword123!"
                  )
                }
                className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-300 transition text-center hover:border-blue-400"
              >
                DISPATCHER
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickFill("driver@fleet.local", "DriverPassword123!")
                }
                className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-emerald-500/30 rounded-lg text-xs font-medium text-emerald-300 transition text-center hover:border-emerald-400"
              >
                DRIVER
              </button>
            </div>
          </div>
        </div>

        {/* Security Specs Callout */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sprint 1 Security Pipeline</span>
          </div>
          <p>
            &bull; Access Token: 15-minute Bearer JWT (In-Memory/AuthStore)
          </p>
          <p>
            &bull; Refresh Token: 7-day HttpOnly, SameSite Lax Cookie
          </p>
          <p>
            &bull; Password Hashing: Direct bcrypt (Python 3.12+ safe)
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
