import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const GoogleSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      signInWithGoogle(token).then(() => {
        toast.success("Signed in with Google!");
        navigate("/");
      });
    } else {
      toast.error("Google login failed. Please try again.");
      navigate("/login");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 glass-card p-10 rounded-2xl">
        <div className="w-14 h-14 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-foreground font-medium">Completing Google sign-in...</p>
        <p className="text-muted-foreground text-sm">Please wait a moment</p>
      </div>
    </div>
  );
};

export default GoogleSuccess;
