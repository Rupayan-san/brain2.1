import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import api, { API_BASE_URL, getToken } from "../services/api.js";
import { getSocket } from "../services/socket.js";
import { BitButton, BitCard, BitChip, BitPageHeader, BitTextarea } from "../components/ReactBits.jsx";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingIdRef = useRef(null);
  const sawSocketTokenRef = useRef(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await api.get("/chat/history");
        setMessages(response.data.history ?? []);
      } catch {
        setMessages([
          {
            _id: "welcome",
            role: "assistant",
            content: "Ask me about your emails, Slack messages, commitments, or meeting context.",
            sources: []
          }
        ]);
      }
    }

    loadHistory();
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleToken = ({ token }) => {
      sawSocketTokenRef.current = true;
      appendToStreamingMessage(token);
    };

    const handleEnd = ({ sourceDocumentIds = [] }) => {
      setMessages((current) =>
        current.map((message) =>
          message._id === streamingIdRef.current
            ? { ...message, sources: sourceDocumentIds.map((id) => ({ _id: id })) }
            : message
        )
      );
      streamingIdRef.current = null;
      setIsStreaming(false);
    };

    socket.on("chat:token", handleToken);
    socket.on("chat:stream:end", handleEnd);

    return () => {
      socket.off("chat:token", handleToken);
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
    sawSocketTokenRef.current = false;
    setDraft("");
    setIsStreaming(true);
    setMessages((current) => [
      ...current,
      userMessage,
      { _id: assistantId, role: "assistant", content: "", sources: [] }
    ]);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          query,
          chatHistory: messages.slice(-10).map(({ role, content }) => ({ role, content }))
        })
      });

      if (!response.body) {
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        if (!sawSocketTokenRef.current) {
          appendToStreamingMessage(decoder.decode(value, { stream: true }));
        }
      }
    } catch {
      appendToStreamingMessage("I could not reach the backend chat service.");
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
      <BitCard className="chat-surface">
        <div className="message-list">
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
                      <BitChip key={source._id ?? source} onClick={() => window.location.assign(`/timeline?source=${source._id ?? source}`)}>
                        Source {index + 1}
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
