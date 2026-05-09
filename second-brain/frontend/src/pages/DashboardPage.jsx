import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, Clock, FileText, Mail, MessageSquare, Sparkles } from "lucide-react";
import api from "../services/api.js";
import useSocketFeed from "../hooks/useSocketFeed.js";
import {
  BitButton,
  BitCard,
  BitEmptyState,
  BitFeedItem,
  BitMetric,
  BitPageHeader,
  BitPanel,
  BitStatus
} from "../components/ReactBits.jsx";

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [digest, setDigest] = useState(null);
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const socketFeed = useSocketFeed();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const [digestResponse, commitmentsResponse, documentsResponse] = await Promise.all([
        api.get("/digest", { params: { type: "daily" } }),
        api.get("/commitments"),
        api.get("/documents", { params: { limit: 5 } })
      ]);

      setDigest(digestResponse.data.digest ?? null);
      setCommitments(commitmentsResponse.data.commitments ?? []);
      setDocuments(documentsResponse.data.documents ?? []);
    } catch {
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const syncNow = async () => {
    try {
      setSyncing(true);
      setToast("");
      setError("");
      const response = await api.post("/ingest/trigger");
      setToast(`Synced ${response.data.gmail} Gmail and ${response.data.slack} Slack messages`);
      await loadDashboard();
    } catch {
      setError("Unable to sync messages.");
    } finally {
      setSyncing(false);
    }
  };

  const health = useMemo(() => getMemoryHealth(documents), [documents]);
  const pendingCommitments = commitments.filter((commitment) => !commitment.fulfilled).length;

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  return (
    <div className="page-stack">
      <BitPageHeader
        eyebrow="Dashboard"
        title="Memory health"
        action={
          <BitButton onClick={syncNow} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync now"}
          </BitButton>
        }
      />
      {toast ? <div className="toast-success">{toast}</div> : null}

      <section className="dashboard-grid">
        <BitPanel className="health-panel">
          <div className="health-score">
            <span>{health.score}%</span>
            <p>summarized memory</p>
          </div>
          <div className="metric-row">
            <BitMetric label="Items with summaries" value={`${health.summarized}/${health.total}`} detail="latest documents" tone="good" />
            <BitMetric label="Pending commitments" value={pendingCommitments} detail="needs follow-up" tone="warn" />
            <BitMetric label="Stale items" value={health.stale} detail="older than 7 days" />
          </div>
        </BitPanel>

        <BitCard className="digest-card">
          <div className="section-heading">
            <Sparkles size={18} />
            <h2>Daily digest</h2>
          </div>
          <p>{digest?.narrative || "No digest generated yet."}</p>
        </BitCard>
      </section>

      <section className="two-column">
        <BitPanel>
          <div className="section-heading">
            <Bell size={18} />
            <h2>Proactive surfacing</h2>
          </div>
          <div className="feed-list">
            {socketFeed.length ? (
              socketFeed.map((item) => (
                <BitFeedItem
                  key={item.id}
                  icon={item.type === "meetingBrief" ? Clock : Activity}
                  title={item.payload?.brief?.meetingTitle || item.payload?.title || "Live memory update"}
                  meta={formatTime(item.createdAt)}
                >
                  {item.type === "meetingBrief"
                    ? "A meeting brief is ready from calendar context."
                    : "A relevant thread surfaced from your workspace."}
                </BitFeedItem>
              ))
            ) : (
              <BitEmptyState title="No proactive updates yet">
                Socket.io cards will appear here when the backend emits them.
              </BitEmptyState>
            )}
          </div>
        </BitPanel>

        <BitPanel>
          <div className="section-heading">
            <FileText size={18} />
            <h2>Recent activity</h2>
          </div>
          <div className="feed-list">
            {documents.length ? (
              documents.map((document) => {
                const Icon = document.source === "gmail" ? Mail : MessageSquare;

                return (
                  <BitFeedItem
                    key={document._id}
                    icon={Icon}
                    title={document.summary || "Unsummarized item"}
                    meta={formatTime(document.createdAt)}
                  >
                    <BitStatus tone={document.source === "gmail" ? "mail" : "slack"}>
                      {document.source}
                    </BitStatus>
                  </BitFeedItem>
                );
              })
            ) : (
              <BitEmptyState title="No documents yet">Connect Gmail or Slack to start ingestion.</BitEmptyState>
            )}
          </div>
        </BitPanel>
      </section>
    </div>
  );
}

function getMemoryHealth(documents) {
  const total = documents.length;
  const summarized = documents.filter((document) => Boolean(document.summary)).length;
  const stale = documents.filter((document) => {
    return new Date(document.createdAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    total,
    summarized,
    stale,
    score: total === 0 ? 0 : Math.round((summarized / total) * 100)
  };
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
