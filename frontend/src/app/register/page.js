"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import { useAppContext } from "@/context/AppContext";
import Link from "next/link";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const { login } = useAppContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await authAPI.register({ email, password, role: "user" });
      router.push("/login");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const data = await authAPI.googleLogin(credentialResponse.credential);
      login(data.user, data.token);
      router.push("/");
    } catch (err) {
      setError(err.response?.data?.error || "Google Registration failed");
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
      <div style={{ maxWidth: "400px", margin: "4rem auto" }}>
        <div className="glass" style={{ padding: "2rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "1.5rem",
              textAlign: "center",
            }}
          >
            Create Account
          </h2>
          {error && <p className="text-error text-center">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", marginTop: "1rem", marginBottom: "1rem" }}
            >
              Sign Up
            </button>
          </form>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
          >
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google Registration Failed")}
              text="signup_with"
            />
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: "1.5rem",
              fontSize: "0.875rem",
            }}
          >
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--primary)" }}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
