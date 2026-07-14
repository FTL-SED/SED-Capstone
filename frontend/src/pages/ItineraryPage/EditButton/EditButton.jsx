import './EditButton.css'

function EditButton({ onClick }) {
  return (
    <button className="edit-button" onClick={onClick}>edit</button>
  );
}

export default EditButton;
