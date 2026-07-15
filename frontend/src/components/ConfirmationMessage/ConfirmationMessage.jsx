import './ConfirmationMessage.css'

function ConfirmationMessage({ message}) {
    if (!message) return null;
  return (
    <div className="confirm-message">
        <p>{message}</p>
    </div>
  );
}

export default ConfirmationMessage;
