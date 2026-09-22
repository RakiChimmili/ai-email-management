import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
function ComposeEmail({ onClose }) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const handleSend = async () => {
    if (!to || !subject || !body) {
      setMessage("Please fill in all fields.");
      return;
    }

    try {
      setSending(true);
      setMessage("");

      await axios.post(
        `${API_URL}/api/gmail/send`,
        {
          to,
          subject,
          body
        },
        {
          withCredentials: true
        }
      );

      setMessage("Email sent successfully!");

      setTimeout(() => {
        onClose();
      }, 1000);

    }   catch (error) {
  console.error("Send email error:", error);
  console.error("Response:", error.response?.data);
  console.error("Status:", error.response?.status);
  console.error("Message:", error.message);

  setMessage(
    error.response?.data?.message ||
    error.message ||
    "Failed to send email."
  );
}finally {
      setSending(false);
    }
  };

  return (
    <div className="compose-overlay">

      <div className="compose-box">

        <div className="compose-header">
          <h3>New Message</h3>

          <button onClick={onClose}>
            ✕
          </button>
        </div>

        <input
          type="email"
          placeholder="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />

        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <textarea
          placeholder="Write your email..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

        {message && (
          <p className="compose-message">
            {message}
          </p>
        )}

        <div className="compose-footer">

          <button
            className="send-button"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? "Sending..." : "Send"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default ComposeEmail;