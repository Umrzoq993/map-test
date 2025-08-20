// src/components/map/modals/ConfirmModal.jsx
import Modal from "./Modal";

export default function ConfirmModal({ open, text, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      title="Tasdiqlaysizmi?"
      onClose={onClose}
      footer={
        <>
          <button className="m-btn" onClick={onClose}>
            Yo‘q
          </button>
          <button className="m-btn m-btn--danger" onClick={onConfirm}>
            Ha, o‘chir
          </button>
        </>
      }
    >
      <p>{text}</p>
    </Modal>
  );
}
