import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, Clock, FileText, Sparkles } from "lucide-react";
import api from "../services/api.js";
import { fallbackDigest, fallbackDocuments, fallbackCommitments } from "../services/mockData.js";
import useSocketFeed from "../hooks/useSocketFeed.js";
import {
  BitCard,
  BitFeedItem,
  BitMetric,
  BitPageHeader,
  BitPanel,
  BitStatus
} from "../components/ReactBits.jsx";

export default function DashboardPage() {
  const [documents, setDocuments] = useState(fallbackDocuments);
  const [digest, setDigest] = useState(fallbackDigest.daily);
  const socketFeed = useSocketFeed();

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [searchResponse, digestResponse] = await Promise.allSettled([
          api.get("/search", { params: { q: "recent activity summary commitments" } }),
          api.get("/digest", { params: { type: "daily" } })
        ]);

        if (searchResponse.status === "fulfilled" && searchResponse.value.data.documents?.length) {
          setDocuments(searchResponse.value.data.documents);
        }

        if (digestResponse.status === "fulfilled" && digestResponse.value.data.digest) {
          setDigest(digestResponse.value.data.digest);
        }
      } catch {
        setDocuments(fallbackDocuments);
      }
    }

    loadDashboard();
  }, []);

  const health = useMemo(() => getMemoryHealth(documents), [documents]);
  const pendingCommitments = fallbackCommitments.filter((commitment) => !commitment.fulfilled).length;
  const proactiveFeed = socketFeed.length
    ? socketFeed
    : [
        {
          id: "fallback-brief",
          type: "meetingBrief",
          createdAt: new Date().toISOString(),
          payload: { brief: { meetingTitle: "Research review" } }
        },
        {
          id: "fallback-loop",
          type: "memory",
          createdAt: new Date().toISOString(),
          payload: { title: "Two open loops need attention" }
        }
      ];

  return (
    <div className="page-stack">
      <BitPageHeader eyebrow="Dashboard" title="Memory health" />

      <section className="dashboard-grid">
        <BitPanel className="health-panel">
          <div className="health-score">
            <span>{health.score}%</span>
            <p>summarized memory</p>
          </div>
          <div className="metric-row">
            <BitMetric label="Items with summaries" value={`${health.summarized}/${health.total}`} detail="indexed documents" tone="good" />
            <BitMetric label="Pending commitments" value={pendingCommitments} detail="needs follow-up" tone="warn" />
            <BitMetric label="Stale items" value={health.stale} detail="older than 7 days" />
          </div>
        </BitPanel>

        <BitCard className="digest-card">
          <div className="section-heading">
            <Sparkles size={18} />
            <h2>Daily digest</h2>
          </div>
          <p>{digest.narrative}</p>
        </BitCard>
      </section>

      <section className="two-column">
        <BitPanel>
          <div className="section-heading">
            <Bell size={18} />
            <h2>Proactive surfacing</h2>
          </div>
          <div className="feed-list">
            {proactiveFeed.map((item) => (
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
            ))}
          </div>
        </BitPanel>

        <BitPanel>
          <div className="section-heading">
            <FileText size={18} />
            <h2>Recent activity</h2>
          </div>
          <div className="feed-list">
            {documents.slice(0, 6).map((document) => (
              <BitFeedItem
                key={document._id}
                icon={FileText}
                title={document.summary || "Unsummarized item"}
                meta={formatTime(document.createdAt)}
              >
                <BitStatus tone={document.source === "gmail" ? "mail" : "slack"}>
                  {document.source}
                </BitStatus>
              </BitFeedItem>
            ))}
          </div>
        </BitPanel>
      </section>
    </div>
  );
}

function getMemoryHealth(documents) {
  const total = documents.length || 1;
  const summarized = documents.filter((document) => Boolean(document.summary)).length;
  const stale = documents.filter((document) => {
    return new Date(document.createdAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    total,
    summarized,
    stale,
    score: Math.round((summarized / total) * 100)
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
