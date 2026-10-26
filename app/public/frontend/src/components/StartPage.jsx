const StartPage = ({ loggedIn, onJoin, onEnterPortal }) => {
  const handleBliMedlem = () => (loggedIn ? onEnterPortal() : onJoin());

  // For logged-in users, offer a direct "Gå till portalen" button too
  return (
    <div className="start-page">
      <h1>Välkommen till Fenixportalen</h1>
      <p>Fenixportalen är en plattform för att hantera evenemang och medlemskap.</p>
      <button onClick={handleBliMedlem}>
        {loggedIn ? 'Gå till portalen' : 'Bli medlem'}
      </button>
    </div>
  );
};

export default StartPage;