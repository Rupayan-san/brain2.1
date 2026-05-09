import { useEffect, useState } from "react";
import api from "../services/api.js";
import { BitChip, BitPageHeader, BitPanel } from "../components/ReactBits.jsx";

const filters = [
  { label: "All", value: undefined },
  { label: "Gmail", value: "gmail" },
  { label: "Slack", value: "slack" }
];

export default function TimelinePage() {
  const [documents, setDocuments] = useState([]);
  const [sourceFilter, setSourceFilter] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTimeline(sourceFilter);
  }, [sourceFilter]);

  const loadTimeline = async (source) => {
    try {
      setLoading(true);
      setError("");
      const params = source ? { source, limit: 100 } : { limit: 100 };
      const response = await api.get("/documents", { params });
      setDocuments(response.data.documents ?? []);
    } catch {
      setError("Unable to load timeline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <BitPageHeader eyebrow="Timeline" title="Chronological memory" />
      <BitPanel>
        <div className="chip-row">
          {filters.map((filter) => (
            <BitChip
              key={filter.label}
              active={filter.value === sourceFilter}
              onClick={() => setSourceFilter(filter.value)}
            >
              {filter.label}
            </BitChip>
          ))}
        </div>

        {loading ? <p>Loading...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading ? (
          <div className="timeline">
            {documents
              .slice()
              .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
              .map((document) => (
                <article className="timeline-entry" key={document._id}>
                  <div className={`timeline-dot timeline-dot-${document.source}`} />
                  <div>
                    <time>{formatDate(document.createdAt)}</time>
                    <h2>{document.summary || "Unsummarized item"}</h2>
                    <div className="chip-row">
                      {(document.tags ?? []).map((tag) => (
                        <BitChip key={tag}>{tag}</BitChip>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            {documents.length === 0 ? <p>No documents found.</p> : null}
          </div>
        ) : null}
      </BitPanel>
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
