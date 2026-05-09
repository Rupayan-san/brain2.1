import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { GitFork, Search } from "lucide-react";
import api from "../services/api.js";
import { fallbackDocuments } from "../services/mockData.js";
import {
  BitChip,
  BitEmptyState,
  BitFeedItem,
  BitInput,
  BitPageHeader,
  BitPanel
} from "../components/ReactBits.jsx";

export default function KnowledgeGraphPage() {
  const svgRef = useRef(null);
  const [documents, setDocuments] = useState(fallbackDocuments);
  const [selectedNode, setSelectedNode] = useState(null);
  const [query, setQuery] = useState("people topics decisions");
  const graph = useMemo(() => buildGraph(documents), [documents]);

  useEffect(() => {
    async function loadGraphDocs() {
      try {
        const response = await api.get("/search", { params: { q: query || "people topics decisions" } });

        if (response.data.documents?.length) {
          setDocuments(response.data.documents);
        }
      } catch {
        setDocuments(fallbackDocuments);
      }
    }

    loadGraphDocs();
  }, [query]);

  useEffect(() => {
    if (!svgRef.current) {
      return;
    }

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3
      .forceSimulation(graph.nodes.map((node) => ({ ...node })))
      .force("link", d3.forceLink(graph.links).id((node) => node.id).distance(95))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(36));

    const link = svg
      .append("g")
      .attr("stroke", "#c7c1b3")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(graph.links)
      .join("line");

    const node = svg
      .append("g")
      .selectAll("button")
      .data(simulation.nodes())
      .join("g")
      .attr("class", "graph-node")
      .on("click", (_, datum) => setSelectedNode(datum));

    node
      .append("circle")
      .attr("r", (datum) => (datum.kind === "decision" ? 19 : 15))
      .attr("fill", (datum) => nodeColor(datum.kind));

    node
      .append("text")
      .text((datum) => datum.label)
      .attr("x", 22)
      .attr("y", 5);

    simulation.on("tick", () => {
      link
        .attr("x1", (datum) => datum.source.x)
        .attr("y1", (datum) => datum.source.y)
        .attr("x2", (datum) => datum.target.x)
        .attr("y2", (datum) => datum.target.y);

      node.attr("transform", (datum) => `translate(${datum.x},${datum.y})`);
    });

    return () => simulation.stop();
  }, [graph]);

  const relatedDocuments = selectedNode
    ? documents.filter((document) => selectedNode.documentIds.includes(document._id))
    : documents.slice(0, 4);

  return (
    <div className="page-stack">
      <BitPageHeader
        eyebrow="Knowledge graph"
        title="People, topics, decisions"
        action={
          <BitInput
            icon={Search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search graph context"
          />
        }
      />
      <section className="graph-layout">
        <BitPanel className="graph-canvas">
          <svg ref={svgRef} role="img" aria-label="Knowledge graph" />
        </BitPanel>
        <BitPanel className="graph-inspector">
          <div className="section-heading">
            <GitFork size={18} />
            <h2>{selectedNode ? selectedNode.label : "Related documents"}</h2>
          </div>
          {selectedNode ? (
            <div className="chip-row">
              <BitChip active>{selectedNode.kind}</BitChip>
            </div>
          ) : null}
          <div className="feed-list">
            {relatedDocuments.length ? (
              relatedDocuments.map((document) => (
                <BitFeedItem key={document._id} title={document.summary} meta={document.source}>
                  {(document.tags ?? []).join(", ")}
                </BitFeedItem>
              ))
            ) : (
              <BitEmptyState title="No linked documents">Try another graph query.</BitEmptyState>
            )}
          </div>
        </BitPanel>
      </section>
    </div>
  );
}

function buildGraph(documents) {
  const nodes = new Map();
  const links = [];

  const addNode = (id, label, kind, documentId) => {
    const existing = nodes.get(id);

    if (existing) {
      existing.documentIds.push(documentId);
      return existing;
    }

    const node = { id, label, kind, documentIds: [documentId] };
    nodes.set(id, node);
    return node;
  };

  documents.forEach((document) => {
    const docNode = addNode(`doc:${document._id}`, "Document", "document", document._id);
    const people = (document.entities ?? []).filter((entity) => entity.type === "person");
    const topics = [
      ...(document.tags ?? []).map((tag) => ({ name: tag, type: "topic" })),
      ...(document.entities ?? []).filter((entity) => entity.type === "topic")
    ];
    const decisions = (document.actionItems ?? []).map((item) => ({ name: item, type: "decision" }));

    [...people, ...topics, ...decisions].forEach((item) => {
      const kind = item.type === "person" ? "person" : item.type === "decision" ? "decision" : "topic";
      const node = addNode(`${kind}:${item.name}`, item.name, kind, document._id);
      links.push({ source: docNode.id, target: node.id });
    });
  });

  return { nodes: Array.from(nodes.values()), links };
}

function nodeColor(kind) {
  if (kind === "person") return "#2f6f73";
  if (kind === "decision") return "#b45f3c";
  if (kind === "topic") return "#d8b64c";
  return "#2d2b27";
}
