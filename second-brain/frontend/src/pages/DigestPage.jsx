import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Newspaper } from "lucide-react";
import api from "../services/api.js";
import { fallbackDigest, fallbackDocuments } from "../services/mockData.js";
import {
  BitCard,
  BitChip,
  BitIconButton,
  BitPageHeader,
  BitPanel,
  BitToggleGroup
} from "../components/ReactBits.jsx";

export default function DigestPage() {
  const [type, setType] = useState("daily");
  const [digest, setDigest] = useState(fallbackDigest.daily);
  const [documents, setDocuments] = useState(fallbackDocuments);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function loadDigest() {
      try {
        const [digestResponse, docsResponse] = await Promise.allSettled([
          api.get("/digest", { params: { type } }),
          api.get("/search", { params: { q: `${type} digest source documents` } })
        ]);

        if (digestResponse.status === "fulfilled" && digestResponse.value.data.digest) {
          setDigest(digestResponse.value.data.digest);
        } else {
          setDigest(fallbackDigest[type]);
        }

        if (docsResponse.status === "fulfilled" && docsResponse.value.data.documents?.length) {
          setDocuments(docsResponse.value.data.documents);
        }
      } catch {
        setDigest(fallbackDigest[type]);
      }
    }

    loadDigest();
  }, [type]);

  const sourceDocs = useMemo(() => {
    const ids = new Set(digest.sourceDocIds ?? []);
    return documents.filter((document) => ids.size === 0 || ids.has(document._id));
  }, [digest.sourceDocIds, documents]);

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
      <BitCard className="digest-reader">
        <div className="section-heading">
          <Newspaper size={18} />
          <h2>{type === "daily" ? "Daily narrative" : "Weekly narrative"}</h2>
        </div>
        <p>{digest.narrative}</p>
      </BitCard>
      <BitPanel>
        <button className="source-expander" type="button" onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span>Source documents</span>
          <BitChip>{sourceDocs.length}</BitChip>
        </button>
        {expanded ? (
          <div className="source-doc-list">
            {sourceDocs.map((document) => (
              <article key={document._id}>
                <strong>{document.summary}</strong>
                <span>{document.source}</span>
              </article>
            ))}
          </div>
        ) : null}
      </BitPanel>
    </div>
  );
}
