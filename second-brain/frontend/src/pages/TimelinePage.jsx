import { useEffect, useMemo, useState } from "react";
import { Mail, MessageSquare, Search } from "lucide-react";
import api from "../services/api.js";
import { fallbackDocuments } from "../services/mockData.js";
import { BitChip, BitInput, BitPageHeader, BitPanel, BitStatus } from "../components/ReactBits.jsx";

export default function TimelinePage() {
  const [documents, setDocuments] = useState(fallbackDocuments);
  const [selectedTag, setSelectedTag] = useState("all");

  useEffect(() => {
    async function loadTimeline() {
      try {
        const response = await api.get("/search", { params: { q: "timeline recent topics" } });

        if (response.data.documents?.length) {
          setDocuments(response.data.documents);
        }
      } catch {
        setDocuments(fallbackDocuments);
      }
    }

    loadTimeline();
  }, []);

  const tags = useMemo(() => {
    return ["all", ...new Set(documents.flatMap((document) => document.tags ?? []))];
  }, [documents]);
  const filteredDocuments = selectedTag === "all"
    ? documents
    : documents.filter((document) => document.tags?.includes(selectedTag));

  return (
    <div className="page-stack">
      <BitPageHeader
        eyebrow="Timeline"
        title="Chronological memory"
        action={<BitInput icon={Search} placeholder="Filter text" />}
      />
      <BitPanel>
        <div className="chip-row">
          {tags.map((tag) => (
            <BitChip key={tag} active={tag === selectedTag} onClick={() => setSelectedTag(tag)}>
              {tag}
            </BitChip>
          ))}
        </div>
        <div className="timeline">
          {filteredDocuments
            .slice()
            .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
            .map((document) => {
              const Icon = document.source === "gmail" ? Mail : MessageSquare;

              return (
                <article className="timeline-entry" key={document._id}>
                  <div className="timeline-icon">
                    <Icon size={17} />
                  </div>
                  <div>
                    <time>{formatDate(document.createdAt)}</time>
                    <h2>{document.summary || "Unsummarized item"}</h2>
                    <div className="chip-row">
                      <BitStatus tone={document.source === "gmail" ? "mail" : "slack"}>
                        {document.source}
                      </BitStatus>
                      {(document.tags ?? []).map((tag) => (
                        <BitChip key={tag}>{tag}</BitChip>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
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
