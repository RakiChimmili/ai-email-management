import { useEffect, useState } from "react";
import axios from "axios";

function GoogleLogin({ onLogin }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/auth/user",
        {
          withCredentials: true
        }
      );

      setUser(response.data);

      if (onLogin) {
        onLogin(response.data);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = () => {
    window.location.href = "http://localhost:5000/auth/google";
  };

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://localhost:5000/auth/logout",
        {},
        {
          withCredentials: true
        }
      );

      setUser(null);

      if (onLogin) {
        onLogin(null);
      }
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (checking) {
    return null;
  }

  if (!user) {
    return (
      <button className="google-login-button" onClick={handleLogin}>
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="google-user">
      {user.picture && (
        <img
          src={user.picture}
          alt="Profile"
          className="google-profile-picture"
        />
      )}

      <div className="google-user-info">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </div>

      <button
        className="logout-button"
        onClick={handleLogout}
      >
        Logout
      </button>
    </div>
  );
}

export default GoogleLogin;