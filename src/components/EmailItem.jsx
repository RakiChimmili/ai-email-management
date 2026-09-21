import axios from "axios";

const API_URL = "https://mailai-backend-usft.onrender.com";

function EmailItem({
  email,
  onEmailClick,
  onStarChange
}) {
  console.log("EMAIL ML DATA:", email);

  const handleStarClick = async (event) => {
    event.stopPropagation();

    try {
      const newStarredStatus =
        !email.isStarred;

await axios.patch(
  `${API_URL}/api/gmail/${email.id}/star`,
        {
          starred: newStarredStatus
        },
        {
          withCredentials: true
        }
      );

      onStarChange(
        email.id,
        newStarredStatus
      );

    } catch (error) {
      console.error(
        "Star update error:",
        error
      );
    }
  };


  return (
    <div
      className="email"
      onClick={() => onEmailClick(email)}
    >

      {/* STAR */}

      <button
        className="star-button"
        onClick={handleStarClick}
        title={
          email.isStarred
            ? "Unstar"
            : "Star"
        }
      >
        {email.isStarred
          ? "★"
          : "☆"}
      </button>


      {/* EMAIL CONTENT */}

      <div className="email-content">

        <strong>
          {email.sender}
        </strong>

        <p>
          {email.subject}
        </p>

      </div>


      {/* ML CATEGORY */}

      <div className="email-category">

        {email.spam ? (
          <span className="spam-badge">
            Spam
          </span>
        ) : (
          <span className="normal-badge">
            {email.category}
          </span>
        )}

      </div>


      {/* SPAM SCORE */}

      {email.spam && (
        <span className="spam-score">
          {(email.spamScore * 100).toFixed(0)}%
        </span>
      )}

    </div>
  );
}

export default EmailItem;