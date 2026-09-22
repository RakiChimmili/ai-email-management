import {
  Inbox,
  Star,
  Send,
  Archive,
  ShieldAlert,
  Sparkles,
  LayoutDashboard
} from "lucide-react";
function Sidebar({ activeSection, onSectionChange }) {

  const menuItems = [
    {
      name: "Inbox",
      icon: <Inbox size={18} />
    },
    {
      name: "Starred",
      icon: <Star size={18} />
    },
    {
      name: "Sent",
      icon: <Send size={18} />
    },
    {
      name: "Archive",
      icon: <Archive size={18} />
    },
    {
      name: "Spam",
      icon: <ShieldAlert size={18} />
    }
  ];

  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <Sparkles size={22} />
        <span>MailAI</span>
      </div>

      <div className="sidebar-section">

        <p className="sidebar-heading">
          MAIL
        </p>

        {menuItems.map((item) => (

          <button
            key={item.name}
            className={
              activeSection === item.name
                ? "sidebar-item active"
                : "sidebar-item"
            }
            onClick={() => onSectionChange(item.name)}
          >

            {item.icon}

            <span>{item.name}</span>

          </button>

        ))}

      </div>

      <div className="sidebar-section sidebar-bottom">

        <p className="sidebar-heading">
          AI TOOLS
        </p>

        <button
          className={
            activeSection === "AI Writer"
              ? "sidebar-item active"
              : "sidebar-item"
          }
          onClick={() => onSectionChange("AI Writer")}
        >

          <Sparkles size={18} />

          <span>AI Email Writer</span>

        </button>

        <button
          className={
            activeSection === "Dashboard"
              ? "sidebar-item active"
              : "sidebar-item"
          }
          onClick={() => onSectionChange("Dashboard")}
        >

          <LayoutDashboard size={18} />

          <span>Dashboard</span>

        </button>

      </div>

    </aside>
  );
}

export default Sidebar;