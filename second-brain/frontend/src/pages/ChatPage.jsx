import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import api, { API_BASE_URL, getToken } from "../services/api.js";
import { getSocket } from "../services/socket.js";
import { BitButton, BitCard, BitChip, BitPageHeader, BitTextarea } from "../components/ReactBits.jsx";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const streamingIdRef = useRef(null);
  const activeAssistantIdRef = useRef(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/chat/history");
        setMessages(response.data.history ?? []);
      } catch {
        setError("Unable to load chat history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleEnd = async ({ sourceDocumentIds = [] }) => {
      const targetMessageId = streamingIdRef.current ?? activeAssistantIdRef.current;

      if (!targetMessageId) {
        return;
      }

      const sources = await loadSourceDocuments(sourceDocumentIds);

      setMessages((current) =>
        current.map((message) =>
          message._id === targetMessageId
            ? { ...message, sources }
            : message
        )
      );

      if (streamingIdRef.current === targetMessageId) {
        streamingIdRef.current = null;
      }

      if (activeAssistantIdRef.current === targetMessageId) {
        activeAssistantIdRef.current = null;
      }

      setIsStreaming(false);
    };

    socket.on("chat:stream:end", handleEnd);

    return () => {
      socket.off("chat:stream:end", handleEnd);
    };
  }, []);

  const sendMessage = async () => {
    const query = draft.trim();

    if (!query || isStreaming) {
      return;
    }

    const assistantId = `assistant-${Date.now()}`;
    const userMessage = {
      _id: `user-${Date.now()}`,
      role: "user",
      content: query,
      sources: []
    };

    streamingIdRef.current = assistantId;
    activeAssistantIdRef.current = assistantId;
    setDraft("");
    setIsStreaming(true);
    setMessages((current) => [
      ...current,
      userMessage,
      { _id: assistantId, role: "assistant", content: "", sources: [] }
    ]);

    try {
      setError("");
      const token = getToken();

      if (!token) {
        throw new Error("Missing authentication token");
      }

      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          chatHistory: messages.slice(-10).map(({ role, content }) => ({ role, content }))
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        appendToStreamingMessage(decoder.decode(value, { stream: true }));
      }

      const finalToken = decoder.decode();

      if (finalToken) {
        appendToStreamingMessage(finalToken);
      }
    } catch {
      setError("Unable to send chat message.");
      appendToStreamingMessage("I could not reach the backend chat service.");
    } finally {
      if (streamingIdRef.current === assistantId) {
        streamingIdRef.current = null;
      }

      setIsStreaming(false);
    }
  };

  const appendToStreamingMessage = (token) => {
    setMessages((current) =>
      current.map((message) =>
        message._id === streamingIdRef.current
          ? { ...message, content: `${message.content}${token}` }
          : message
      )
    );
  };

  return (
    <div className="page-stack chat-page">
      <BitPageHeader eyebrow="Chat" title="Ask your second brain" />
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <BitCard className="chat-surface">
        <div className="message-list">
          {!loading && messages.length === 0 ? (
            <div className="message-row assistant">
              <div className="message-bubble">
                <span className="assistant-mark">
                  <Sparkles size={14} />
                </span>
                <p>Ask me about your emails, Slack messages, commitments, or meeting context.</p>
              </div>
            </div>
          ) : null}
          {messages.map((message) => (
            <div key={message._id} className={`message-row ${message.role}`}>
              <div className="message-bubble">
                {message.role === "assistant" ? (
                  <span className="assistant-mark">
                    <Sparkles size={14} />
                  </span>
                ) : null}
                <p>{message.content || "Thinking..."}</p>
                {message.role === "assistant" && message.sources?.length ? (
                  <div className="source-chip-row">
                    {message.sources.slice(0, 5).map((source, index) => (
                      <BitChip key={source._id ?? source} onClick={() => window.location.assign(`/timeline?document=${encodeURIComponent(source._id ?? source)}`)}>
                        {getSourceLabel(source, index)}
                      </BitChip>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div className="composer">
          <BitTextarea
            rows={2}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about a decision, commitment, person, or timeline..."
          />
          <BitButton icon={Send} onClick={sendMessage} disabled={isStreaming}>
            Send
          </BitButton>
        </div>
      </BitCard>
    </div>
  );
}

async function loadSourceDocuments(sourceDocumentIds) {
  const documents = await Promise.all(
    sourceDocumentIds.map(async (id) => {
      try {
        const response = await api.get(`/documents/${id}`);
        return response.data.document ?? { _id: id };
      } catch {
        return { _id: id };
      }
    })
  );

  return documents;
}

function getSourceLabel(source, index) {
  if (typeof source === "object" && source?.source) {
    return source.source;
  }

  return `Source ${index + 1}`;
}
