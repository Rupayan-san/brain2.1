import { useEffect, useState } from "react";
import { Check, CheckSquare } from "lucide-react";
import api from "../services/api.js";
import { fallbackCommitments } from "../services/mockData.js";
import { BitButton, BitPageHeader, BitPanel, BitStatus, BitTable } from "../components/ReactBits.jsx";

export default function CommitmentsPage() {
  const [commitments, setCommitments] = useState(fallbackCommitments);

  useEffect(() => {
    async function loadCommitments() {
      try {
        const response = await api.get("/commitments");

        if (response.data.commitments?.length) {
          setCommitments(response.data.commitments);
        }
      } catch {
        setCommitments(fallbackCommitments);
      }
    }

    loadCommitments();
  }, []);

  const toggleFulfilled = async (commitment) => {
    const nextFulfilled = !commitment.fulfilled;

    setCommitments((current) =>
      current.map((item) =>
        item._id === commitment._id ? { ...item, fulfilled: nextFulfilled } : item
      )
    );

    try {
      await api.patch(`/commitments/${commitment._id}`, { fulfilled: nextFulfilled });
    } catch {
      return;
    }
  };

  return (
    <div className="page-stack">
      <BitPageHeader eyebrow="Commitments" title="Extracted promises" />
      <BitPanel>
        <BitTable
          columns={[
            { key: "text", label: "Commitment text" },
            { key: "person", label: "Person" },
            {
              key: "dueDate",
              label: "Due date",
              render: (row) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : "No due date")
            },
            {
              key: "fulfilled",
              label: "Status",
              render: (row) => (
                <BitStatus tone={row.fulfilled ? "good" : "warn"}>
                  {row.fulfilled ? "Fulfilled" : "Pending"}
                </BitStatus>
              )
            },
            {
              key: "action",
              label: "Action",
              render: (row) => (
                <BitButton
                  icon={row.fulfilled ? CheckSquare : Check}
                  variant="ghost"
                  onClick={() => toggleFulfilled(row)}
                >
                  {row.fulfilled ? "Mark pending" : "Mark fulfilled"}
                </BitButton>
              )
            }
          ]}
          rows={commitments}
        />
      </BitPanel>
    </div>
  );
}
