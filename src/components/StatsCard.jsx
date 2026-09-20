function StatsCard({ title, value }) {
  const getIcon = () => {
    if (title === "Total Emails") return "📧";
    if (title === "Unread") return "📩";
    if (title === "Important") return "⭐";
    if (title === "Spam") return "⚠️";

    return "📊";
  };

  return (
    <div className="stats-card">

      <div className="stats-card-icon">
        {getIcon()}
      </div>

      <div className="stats-card-content">
        <p>{title}</p>
        <h2>{value}</h2>
      </div>

    </div>
  );
}

export default StatsCard;