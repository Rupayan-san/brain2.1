import { useEffect, useState } from "react";
import { getSocket } from "../services/socket.js";

export default function useSocketFeed() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    const addItem = (type, payload) => {
      setItems((current) => [
        {
          id: `${type}-${Date.now()}`,
          type,
          payload,
          createdAt: new Date().toISOString()
        },
        ...current
      ].slice(0, 12));
    };

    socket.on("meetingBrief", (payload) => addItem("meetingBrief", payload));
    socket.on("chat:stream:end", (payload) => addItem("chat", payload));

    return () => {
      socket.off("meetingBrief");
      socket.off("chat:stream:end");
    };
  }, []);

  return items;
}
