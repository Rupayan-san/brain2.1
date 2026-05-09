import { useEffect, useState } from "react";
import { Check, CheckSquare } from "lucide-react";
import api from "../services/api.js";
import { BitButton, BitPageHeader, BitPanel, BitStatus, BitTable } from "../components/ReactBits.jsx";

export default function CommitmentsPage() {
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCommitments();
  }, []);

  const loadCommitments = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/commitments");
      setCommitments(response.data.commitments ?? []);
    } catch {
      setError("Unable to load commitments.");
    } finally {
      setLoading(false);
    }
  };

  const toggleFulfilled = async (commitment) => {
    try {
      setError("");
      await api.patch(`/commitments/${commitment._id}`);
      await loadCommitments();
    } catch {
      setError("Unable to update commitment.");
    }
  };

  return (
    <div className="page-stack">
      <BitPageHeader eyebrow="Commitments" title="Extracted promises" />
      {loading ? <p>Loading...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      {!loading ? (
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
      ) : null}
    </div>
  );
}
