import { useEffect,useState } from "react";
import axios from "axios";

function EmailDetails({ email, onBack }) {
  useEffect(() => {
  if (!email.isRead) {
    handleMarkAsRead();
  }
}, [email.id]);
   const handleMarkAsRead = async () => {
  console.log("Trying to mark as read:", email.id, email.isRead);

  if (email.isRead) return;

  try {
    const response = await axios.patch(
      `http://localhost:5000/api/gmail/${email.id}/read`,
      {},
      {
        withCredentials: true
      }
    );

    console.log("Mark as read response:", response.data);
  } catch (error) {
    console.error("Mark as read error:", error);
    console.error("Server response:", error.response?.data);
  }
};
 const [overview, setOverview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // ================================
  // AI OVERVIEW
  // ================================

  const handleAIOverview = async () => {
    try {
      setLoading(true);
      setError("");
      setOverview("");

      const response = await axios.post(
        `http://localhost:5000/api/gmail/${email.id}/overview`,
        {},
        {
          withCredentials: true
        }
      );

      setOverview(response.data.overview);

    } catch (error) {
      console.error("AI Overview error:", error);

      setError(
        "Failed to generate AI overview."
      );

    } finally {
      setLoading(false);
    }
  };


  // ================================
  // STAR / UNSTAR
  // ================================

  const handleStar = async () => {
    try {
      setActionLoading(true);
      setMessage("");

      const newStarredStatus =
        !email.isStarred;

      await axios.patch(
        `http://localhost:5000/api/gmail/${email.id}/star`,
        {
          starred: newStarredStatus
        },
        {
          withCredentials: true
        }
      );

      email.isStarred =
        newStarredStatus;

      setMessage(
        newStarredStatus
          ? "Email starred."
          : "Email unstarred."
      );

    } catch (error) {
      console.error(
        "Star update error:",
        error
      );

      setMessage(
        "Failed to update star."
      );

    } finally {
      setActionLoading(false);
    }
  };


  // ================================
  // ARCHIVE
  // ================================

  const handleArchive = async () => {
    try {
      setActionLoading(true);
      setMessage("");

      await axios.patch(
        `http://localhost:5000/api/gmail/${email.id}/archive`,
        {},
        {
          withCredentials: true
        }
      );

      setMessage(
        "Email archived successfully."
      );

      setTimeout(() => {
        onBack();
      }, 500);

    } catch (error) {
      console.error(
        "Archive error:",
        error
      );

      setMessage(
        "Failed to archive email."
      );

      setActionLoading(false);
    }
  };


  // ================================
  // MOVE TO INBOX
  // ================================

  const handleMoveToInbox = async () => {
    try {
      setActionLoading(true);
      setMessage("");

      await axios.patch(
        `http://localhost:5000/api/gmail/${email.id}/inbox`,
        {},
        {
          withCredentials: true
        }
      );

      setMessage(
        "Email moved to inbox."
      );

      setTimeout(() => {
        onBack();
      }, 500);

    } catch (error) {
      console.error(
        "Move to inbox error:",
        error
      );

      setMessage(
        "Failed to move email."
      );

      setActionLoading(false);
    }
  };


  // ================================
  // TRASH
  // ================================

  const handleTrash = async () => {
    try {
      setActionLoading(true);
      setMessage("");

      await axios.delete(
        `http://localhost:5000/api/gmail/${email.id}/trash`,
        {
          withCredentials: true
        }
      );

      setMessage(
        "Email moved to trash."
      );

      setTimeout(() => {
        onBack();
      }, 500);

    } catch (error) {
      console.error(
        "Trash error:",
        error
      );

      setMessage(
        "Failed to move email to trash."
      );

      setActionLoading(false);
    }
  };


  return (
    <div className="email-details"
    onLoad={handleMarkAsRead}>

      {/* BACK */}

      <button
        className="back-button"
        onClick={onBack}
      >
        ← Back
      </button>


      {/* EMAIL HEADER */}

      <div className="email-details-header">

        <h2>{email.subject}</h2>

        <p className="email-sender">
          From: {email.sender}
        </p>

        <p className="email-date">
          {email.date}
        </p>

      </div>


      {/* EMAIL ACTIONS */}

      <div className="email-actions">

        <button
          onClick={handleStar}
          disabled={actionLoading}
        >
          {email.isStarred
            ? "★ Unstar"
            : "☆ Star"}
        </button>


        {email.folder === "Inbox" && (
          <button
            onClick={handleArchive}
            disabled={actionLoading}
          >
            📥 Archive
          </button>
        )}


        {email.folder === "Archive" && (
  <button
    onClick={handleMoveToInbox}
    disabled={actionLoading}
  >
    📥 Move to Inbox
  </button>
)}


        <button
          onClick={handleTrash}
          disabled={actionLoading}
        >
          🗑️ Trash
        </button>

      </div>


      {/* ACTION MESSAGE */}

      {message && (
        <p className="action-message">
          {message}
        </p>
      )}


      {/* EMAIL BODY */}

      <div className="email-body">
        <p>{email.body}</p>
      </div>


      {/* AI OVERVIEW */}

      <div className="ai-overview-section">

        <button
          className="ai-overview-button"
          onClick={handleAIOverview}
          disabled={loading}
        >
          {loading
            ? "Generating..."
            : "✨ AI Overview"}
        </button>


        {overview && (
          <div className="ai-overview-box">

            <h3>✨ AI Overview</h3>

            <p>{overview}</p>

          </div>
        )}


        {error && (
          <p className="ai-error">
            {error}
          </p>
        )}

      </div>

    </div>
  );
}

export default EmailDetails;