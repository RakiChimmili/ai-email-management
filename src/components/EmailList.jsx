import EmailItem from "./EmailItem";

function EmailList({ emails, onEmailClick, onStarChange }) {

  return (
    <section className="email-section">

      <h3>Recent Emails</h3>

      {emails.length === 0 ? (

        <p>No emails in this folder.</p>

      ) : (

        emails.map((email) => (

          <EmailItem
            key={email.id}
            email={email}
            onEmailClick={onEmailClick}
            onStarChange={onStarChange}
          />

        ))

      )}

    </section>
  );
}

export default EmailList;