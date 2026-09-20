function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="header-title">
        <h1>AI Email Management System</h1>
        <p>AI-powered email management</p>
      </div>

      <div className="header-account">
        {user?.picture && (
          <img
            src={user.picture}
            alt="Profile"
            className="profile-picture"
            referrerPolicy="no-referrer"
          />
        )}

        <div className="account-info">
          <strong>{user?.name || "Google User"}</strong>
          <span>{user?.email || ""}</span>
        </div>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Header;