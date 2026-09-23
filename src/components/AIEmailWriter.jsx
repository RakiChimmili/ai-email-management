import { useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
function AIEmailWriter() {
  const [to, setTo] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("Professional");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please describe the email you want to write.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setCopied(false);

      const response = await axios.post(
        `${API_URL}/api/gmail/ai-write`,
        {
          prompt: prompt,
          tone: tone
        }
      );

      setSubject(response.data.subject);
      setBody(response.data.body);

    } catch (error) {
      console.error("AI Writer error:", error);
      setError(
        error.response?.data?.message ||
        "AI writer is unavailable. Please try again after the backend is redeployed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const completeEmail = `Subject: ${subject}\n\n${body}`;

    await navigator.clipboard.writeText(completeEmail);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="ai-writer">

      <div className="ai-writer-header">
        <h2>✨ AI Email Writer</h2>

        <p>
          Create professional emails with the help of AI.
        </p>
      </div>

      <div className="email-composer">

        <div className="email-field">
          <label>To</label>

          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
          />
        </div>

        <div className="email-field">
          <label>What should the email say?</label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Example: Ask my professor for an extension on my assignment because I need more time to complete it."
            rows="5"
          />
        </div>

        <div className="email-field">
          <label>Tone</label>

          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          >
            <option>Professional</option>
            <option>Formal</option>
            <option>Friendly</option>
            <option>Casual</option>
          </select>
        </div>

        <button
          className="generate-email-button"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading
            ? "✨ Generating..."
            : "✨ Generate Email"}
        </button>

      </div>

      {error && (
        <p className="ai-writer-error">
          {error}
        </p>
      )}

      {subject && body && (
        <div className="generated-email">

          <div className="generated-email-header">
            <h3>Generated Email</h3>

            <button
              className="copy-button"
              onClick={handleCopy}
            >
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
          </div>

          <div className="email-preview">
            <p className="email-subject">
              Subject: {subject}
            </p>

            <div className="email-body-preview">
              {body}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default AIEmailWriter;