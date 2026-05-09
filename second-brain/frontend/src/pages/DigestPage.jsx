import { useEffect, useState } from "react";
import { Newspaper, RefreshCw } from "lucide-react";
import api from "../services/api.js";
import {
  BitButton,
  BitCard,
  BitEmptyState,
  BitPageHeader,
  BitToggleGroup
} from "../components/ReactBits.jsx";

export default function DigestPage() {
  const [type, setType] = useState("daily");
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDigest(type);
  }, [type]);

  const loadDigest = async (digestType) => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/digest", { params: { type: digestType } });
      setDigest(response.data.digest ?? null);
    } catch {
      setError("Unable to load digest.");
    } finally {
      setLoading(false);
    }
  };

  const generateDigest = async () => {
    try {
      setGenerating(true);
      setError("");
      await api.post("/digest/generate", { type });
      await loadDigest(type);
    } catch {
      setError("Unable to generate digest.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page-stack">
      <BitPageHeader
        eyebrow="Digest"
        title="Narrative memory"
        action={
          <BitToggleGroup
            value={type}
            onChange={setType}
            options={[
              { value: "daily", label: "Daily" },
              { value: "weekly", label: "Weekly" }
            ]}
          />
        }
      />

      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !digest ? (
        <BitCard className="digest-reader">
          <BitEmptyState title="No digest generated yet">
            Generate one from your indexed documents.
          </BitEmptyState>
          <div className="digest-actions">
            <BitButton icon={RefreshCw} onClick={generateDigest} disabled={generating}>
              {generating ? "Generating..." : "Generate new digest"}
            </BitButton>
          </div>
        </BitCard>
      ) : null}

      {!loading && digest ? (
        <BitCard className="digest-reader">
          <div className="section-heading">
            <Newspaper size={18} />
            <h2>{type === "daily" ? "Daily narrative" : "Weekly narrative"}</h2>
          </div>
          <p>{digest.narrative}</p>
          <div className="digest-actions">
            <BitButton icon={RefreshCw} onClick={generateDigest} disabled={generating}>
              {generating ? "Generating..." : "Generate new digest"}
            </BitButton>
          </div>
        </BitCard>
      ) : null}
    </div>
  );
}
