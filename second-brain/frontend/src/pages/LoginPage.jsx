import { Link } from "react-router-dom";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { API_BASE_URL, getToken } from "../services/api.js";
import { BitButton, BitCard } from "../components/ReactBits.jsx";

export default function LoginPage() {
  const connectGoogle = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const connectSlack = () => {
    const token = getToken();
    const url = new URL(`${API_BASE_URL}/auth/slack`);

    if (token) {
      url.searchParams.set("token", token);
    }

    window.location.href = url.toString();
  };

  return (
    <main className="login-page">
      <BitCard className="login-card">
        <div className="login-mark">
          <ShieldCheck size={26} />
        </div>
        <p className="eyebrow">Secure connectors</p>
        <h1>Connect your memory sources</h1>
        <p className="login-copy">
          Start with Gmail, then attach Slack once your account session is active.
        </p>
        <div className="login-actions">
          <BitButton icon={Mail} onClick={connectGoogle}>
            Connect Gmail
          </BitButton>
          <BitButton icon={MessageSquare} variant="secondary" onClick={connectSlack}>
            Connect Slack
          </BitButton>
        </div>
        <Link className="login-skip" to="/">
          Continue to dashboard
        </Link>
      </BitCard>
    </main>
  );
}
