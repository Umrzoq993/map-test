// src/components/map/modals/FacilityEditModal.jsx
import Modal from "./Modal";
import { useState, useEffect } from "react";

export default function FacilityEditModal({ open, initial, onSave, onClose }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  useEffect(() => {
    if (open && initial) {
      setName(initial.name || "");
      setStatus(initial.status || "ACTIVE");
    }
  }, [open, initial]);

  return (
    <Modal
      open={open}
      title="Edit Facility"
      onClose={onClose}
      footer={
        <>
          <button className="m-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="m-btn m-btn--primary"
            onClick={() => onSave({ name, status })}
          >
            Save
          </button>
        </>
      }
    >
      <div className="m-field">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="m-field">
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </Modal>
  );
}
