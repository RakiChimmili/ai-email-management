const API_URL = import.meta.env.VITE_API_URL;

function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="mailai-login-page">

      <div className="mailai-login-content">

        {/* AI Icon */}
        <div className="mailai-ai-icon">
          <span>✦</span>
        </div>

        {/* Heading */}
        <h1 className="mailai-login-title">
          Welcome to
          <br />

          <span>AI Email</span>

          <br />

          Management System
        </h1>

        {/* Subtitle */}
        <p className="mailai-login-subtitle">
          Personalize and manage your emails with intelligent AI assistance.
        </p>

        {/* Google Login */}
        <button
          className="mailai-google-button"
          onClick={handleGoogleLogin}
        >

          <span className="mailai-google-logo">
            <span className="google-blue">G</span>
          </span>

          <span className="mailai-google-divider"></span>

          <span className="mailai-google-text">
            Continue with Google
          </span>

          <span className="mailai-google-arrow">
            →
          </span>

        </button>

        {/* Security */}
        <p className="mailai-login-note">
          <span className="security-icon">♢</span>
          Sign in securely with your Google account
        </p>

      </div>

    </div>
  );
}

export default LoginPage;