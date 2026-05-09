import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { GitFork } from "lucide-react";
import api from "../services/api.js";
import {
  BitChip,
  BitEmptyState,
  BitFeedItem,
  BitPageHeader,
  BitPanel
} from "../components/ReactBits.jsx";

export default function KnowledgeGraphPage() {
  const svgRef = useRef(null);
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGraph() {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/graph");
        setGraph({
          nodes: response.data.nodes ?? [],
          edges: response.data.edges ?? []
        });
      } catch {
        setError("Unable to load knowledge graph.");
      } finally {
        setLoading(false);
      }
    }

    loadGraph();
  }, []);

  const simulationGraph = useMemo(() => {
    return {
      nodes: graph.nodes.map((node) => ({
        ...node,
        documentId: node.documentId ?? (node.type === "gmail" || node.type === "slack" ? node.id : undefined)
      })),
      links: graph.edges.map((edge) => ({ ...edge }))
    };
  }, [graph]);

  useEffect(() => {
    if (!selectedNode?.documentId) {
      setSelectedDocument(null);
      return;
    }

    async function loadSelectedDocument() {
      try {
        setDocumentLoading(true);
        const response = await api.get(`/documents/${selectedNode.documentId}`);
        setSelectedDocument(response.data.document ?? null);
      } catch {
        setSelectedDocument(null);
      } finally {
        setDocumentLoading(false);
      }
    }

    loadSelectedDocument();
  }, [selectedNode]);

  useEffect(() => {
    if (!svgRef.current || loading || error) {
      return;
    }

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulationNodes = simulationGraph.nodes.map((node) => ({ ...node }));
    const simulationLinks = simulationGraph.links.map((link) => ({ ...link }));

    const simulation = d3
      .forceSimulation(simulationNodes)
      .force("link", d3.forceLink(simulationLinks).id((node) => node.id).distance(95))
      .force("charge", d3.forceManyBody().strength(-260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(36));

    const link = svg
      .append("g")
      .attr("stroke", "#c7c1b3")
      .attr("stroke-width", 1)
      .selectAll("line")
      .data(simulationLinks)
      .join("line");

    const node = svg
      .append("g")
      .selectAll("g")
      .data(simulationNodes)
      .join("g")
      .attr("class", "graph-node")
      .on("click", (_, datum) => setSelectedNode(datum));

    node
      .append("circle")
      .attr("r", (datum) => (datum.type === "gmail" || datum.type === "slack" ? 18 : 15))
      .attr("fill", (datum) => nodeColor(datum.type));

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
  }, [simulationGraph, loading, error]);

  return (
    <div className="page-stack">
      <BitPageHeader eyebrow="Knowledge graph" title="People, topics, documents" />
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error ? (
        <section className="graph-layout">
          <BitPanel className="graph-canvas">
            <svg ref={svgRef} role="img" aria-label="Knowledge graph" />
          </BitPanel>
          <BitPanel className="graph-inspector">
            <div className="section-heading">
              <GitFork size={18} />
              <h2>{selectedNode ? selectedNode.label : "Select a node"}</h2>
            </div>

            {selectedNode ? (
              <>
                <div className="chip-row">
                  <BitChip active>{selectedNode.type}</BitChip>
                </div>
                {documentLoading ? <p>Loading...</p> : null}
                {selectedDocument ? (
                  <div className="feed-list graph-document-preview">
                    <BitFeedItem title={selectedDocument.summary || "Unsummarized document"} meta={selectedDocument.source}>
                      {formatDate(selectedDocument.createdAt)}
                    </BitFeedItem>
                  </div>
                ) : null}
              </>
            ) : (
              <BitEmptyState title="No node selected">
                Click a circle to inspect its label, type, and linked document summary.
              </BitEmptyState>
            )}
          </BitPanel>
        </section>
      ) : null}
    </div>
  );
}

function nodeColor(type) {
  if (type === "person") return "#2f75d6";
  if (type === "topic") return "#2f8f5b";
  if (type === "gmail") return "#c84e3a";
  if (type === "slack") return "#7b4ec8";
  return "#2d2b27";
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}
