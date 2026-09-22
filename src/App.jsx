import { useEffect, useState } from "react";
import axios from "axios";

import ComposeEmail from "./components/ComposeEmail";
import AIEmailWriter from "./components/AIEmailWriter";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatsCard from "./components/StatsCard";
import EmailList from "./components/EmailList";
import EmailDetails from "./components/EmailDetails";
import LoginPage from "./components/LoginPage";
import { API_URL } from "./config";

import "./App.css";

function App() {

  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingLogin, setCheckingLogin] = useState(true);

  const [showCompose, setShowCompose] = useState(false);

  const [activeSection, setActiveSection] =
    useState("Inbox");

  const [selectedEmail, setSelectedEmail] =
    useState(null);

  const [emails, setEmails] = useState([]);

  // Search
  const [searchText, setSearchText] = useState("");

  // Dashboard statistics
  const [dashboardStats, setDashboardStats] = useState({
    totalEmails: 0,
    unread: 0,
    important: 0,
    spam: 0
  });


  // ================================
  // CHECK GOOGLE LOGIN
  // ================================

  useEffect(() => {
    checkLogin();
  }, []);


  const checkLogin = async () => {

    try {

      const response = await axios.get(
        `${API_URL}/auth/user`,
        {
          withCredentials: true
        }
      );

      console.log(
        "Google user:",
        response.data
      );

      setLoggedIn(true);
      setUser(response.data);

    } catch (error) {

      console.error(
        "Login check error:",
        error
      );

      console.error(
        "Server response:",
        error.response?.data
      );

      setLoggedIn(false);
      setUser(null);

    } finally {

      setCheckingLogin(false);

    }
  };


  // ================================
  // FETCH GMAIL EMAILS
  // ================================

  useEffect(() => {

    if (!loggedIn) return;

    if (activeSection === "Dashboard") return;

    axios
      .get(
        `${API_URL}/api/gmail/messages`,
        {
          params: {
            folder: activeSection,
            search: searchText
          },

          withCredentials: true
        }
      )

      .then((response) => {

        setEmails(response.data);

      })

      .catch((error) => {

        console.error(
          "Error fetching Gmail messages:",
          error
        );

        setEmails([]);

      });

  }, [
    loggedIn,
    activeSection,
    searchText
  ]);


  // ================================
  // DASHBOARD STATISTICS
  // ================================

  useEffect(() => {

    if (!loggedIn) return;

    if (activeSection !== "Dashboard") return;

    axios
      .get(
        `${API_URL}/api/gmail/dashboard-stats`,
        {
          withCredentials: true
        }
      )

      .then((response) => {

        setDashboardStats(
          response.data
        );

      })

      .catch((error) => {

        console.error(
          "Dashboard stats error:",
          error
        );

      });

  }, [
    loggedIn,
    activeSection
  ]);


  // ================================
  // LOADING
  // ================================

  if (checkingLogin) {
    return null;
  }


  // ================================
  // LOGIN PAGE
  // ================================

  if (!loggedIn) {
    return <LoginPage />;
  }


  // ================================
  // LOGOUT
  // ================================

  const handleLogout = async () => {

    try {

      await axios.post(
        `${API_URL}/auth/logout`,
        {},
        {
          withCredentials: true
        }
      );

      setLoggedIn(false);
      setUser(null);
      setEmails([]);
      setSelectedEmail(null);
      setActiveSection("Inbox");

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }
  };


  // ================================
  // CHANGE SIDEBAR SECTION
  // ================================

  const handleSectionChange = (section) => {

    setActiveSection(section);
    setSelectedEmail(null);

  };


  // ================================
  // UPDATE STAR
  // ================================

  const handleStarChange = (
    emailId,
    newStarredStatus
  ) => {

    setEmails((currentEmails) =>

      currentEmails.map((email) =>

        email.id === emailId
          ? {
              ...email,
              isStarred:
                newStarredStatus
            }
          : email

      )

    );
  };


  const filteredEmails = emails;


  return (

    <div className="app">

      <Sidebar
        activeSection={activeSection}
        onSectionChange={
          handleSectionChange
        }
      />


      <main className="main-content">

        {selectedEmail ? (

          <EmailDetails
  email={selectedEmail}
  onBack={() =>
    setSelectedEmail(null)
  }
  onEmailRead={(emailId) => {

    setEmails((currentEmails) =>
      currentEmails.map((email) =>
        email.id === emailId
          ? {
              ...email,
              isRead: true
            }
          : email
      )
    );

    setSelectedEmail((currentEmail) =>
      currentEmail
        ? {
            ...currentEmail,
            isRead: true
          }
        : currentEmail
    );

  }}
/>
        ) : activeSection === "AI Writer" ? (

          <AIEmailWriter />

        ) : activeSection === "Dashboard" ? (

          <div className="dashboard-page">

            <Header
              user={user}
              onLogout={handleLogout}
            />


            <div className="dashboard-title">

              <h2>Dashboard</h2>

              <p>
                Overview of your email activity
              </p>

            </div>


            <div className="stats-container">

              <StatsCard
                title="Total Emails"
                value={
                  dashboardStats.totalEmails
                }
              />

              <StatsCard
                title="Unread"
                value={
                  dashboardStats.unread
                }
              />

              <StatsCard
                title="Important"
                value={
                  dashboardStats.important
                }
              />

              <StatsCard
                title="Spam"
                value={
                  dashboardStats.spam
                }
              />

            </div>

          </div>

        ) : (

          <div className="inbox-page">

            <Header
              user={user}
              onLogout={handleLogout}
            />


            <div className="compose-area">

              <button
                className="compose-button"
                onClick={() =>
                  setShowCompose(true)
                }
              >
                ✏️ Compose
              </button>

            </div>


            <div className="inbox-title">

              <h2>
                {activeSection}
              </h2>

              <p>
                Manage your emails with MailAI
              </p>

            </div>


            <EmailList
              emails={filteredEmails}
              onEmailClick={
                setSelectedEmail
              }
              onStarChange={
                handleStarChange
              }
            />

          </div>

        )}


        {showCompose && (

          <ComposeEmail
            onClose={() =>
              setShowCompose(false)
            }
          />

        )}

      </main>

    </div>
  );
}

export default App;