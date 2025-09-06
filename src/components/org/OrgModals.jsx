import { useEffect, useRef, useState } from "react";
import Modal from "../ui/Modal"; // <- org/ dan ui/ ga nisbiy yo'l
import css from "./OrgModal.module.scss";

// Sizdagi API: /api/orgs/**
import { createOrg, updateOrg, deleteOrg } from "../../api/org";

function useForm(init) {
  const [v, setV] = useState(init);
  const onChange = (e) =>
    setV((s) => ({ ...s, [e.target.name]: e.target.value }));
  const set = (patch) => setV((s) => ({ ...s, ...patch }));
  return { v, onChange, set };
}

/** + Ildiz */
export function AddRootModal({ open, onClose, onDone }) {
  const { v, onChange, set } = useForm({ name: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const focusRef = useRef(null);

  useEffect(() => {
    if (open) {
      set({ name: "", code: "" });
      setErr("");
    }
  }, [open, set]);

  const submit = async () => {
    if (!v.name.trim()) {
      setErr("Nomi majburiy");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await createOrg({
        name: v.name.trim(),
        code: v.code?.trim() || null,
        parentId: null,
      });
      onDone?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || "Saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="+ Ildiz tashkilot"
      initialFocusRef={focusRef}
    >
      <div className={css.form}>
        <label className={css.label}>Nomi</label>
        <input
          ref={focusRef}
          name="name"
          value={v.name}
          onChange={onChange}
          className={css.input}
          placeholder="Masalan: Viloyat boshqarmasi"
        />

        <label className={css.label}>Kodi (ixtiyoriy)</label>
        <input
          name="code"
          value={v.code}
          onChange={onChange}
          className={css.input}
          placeholder="ABC-01"
        />

        {err && <div className={css.error}>{err}</div>}

        <div className={css.actions}>
          <button className={`btn ${css.btn}`} onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className={`btn primary ${css.btn}`}
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** + Child */
export function AddChildModal({ open, onClose, onDone, parent }) {
  const { v, onChange, set } = useForm({ name: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const focusRef = useRef(null);

  useEffect(() => {
    if (open) {
      set({ name: "", code: "" });
      setErr("");
    }
  }, [open, set]);

  const submit = async () => {
    if (!v.name.trim()) {
      setErr("Nomi majburiy");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await createOrg({
        name: v.name.trim(),
        code: v.code?.trim() || null,
        parentId: parent?.id,
      });
      onDone?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || "Saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="+ Child bo‘lim"
      initialFocusRef={focusRef}
    >
      <div className={css.form}>
        <div className={css.hint}>
          Ota bo‘lim: <b>{parent?.name ?? "—"}</b>
        </div>

        <label className={css.label}>Nomi</label>
        <input
          ref={focusRef}
          name="name"
          value={v.name}
          onChange={onChange}
          className={css.input}
          placeholder="Masalan: Tuman bo‘limi"
        />

        <label className={css.label}>Kodi (ixtiyoriy)</label>
        <input
          name="code"
          value={v.code}
          onChange={onChange}
          className={css.input}
          placeholder="TMN-02"
        />

        {err && <div className={css.error}>{err}</div>}

        <div className={css.actions}>
          <button className={`btn ${css.btn}`} onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className={`btn primary ${css.btn}`}
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Edit */
export function EditOrgModal({ open, onClose, onDone, org }) {
  const { v, onChange, set } = useForm({ name: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const focusRef = useRef(null);

  useEffect(() => {
    if (open && org) {
      set({ name: org.name ?? "", code: org.code ?? "" });
      setErr("");
    }
  }, [open, org, set]);

  const submit = async () => {
    if (!v.name.trim()) {
      setErr("Nomi majburiy");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await updateOrg(org.id, {
        name: v.name.trim(),
        code: v.code?.trim() || null,
      });
      onDone?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || "Saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tashkilotni tahrirlash"
      initialFocusRef={focusRef}
    >
      <div className={css.form}>
        <label className={css.label}>Nomi</label>
        <input
          ref={focusRef}
          name="name"
          value={v.name}
          onChange={onChange}
          className={css.input}
          placeholder="Nomi"
        />

        <label className={css.label}>Kodi (ixtiyoriy)</label>
        <input
          name="code"
          value={v.code}
          onChange={onChange}
          className={css.input}
          placeholder="Kodi"
        />

        {err && <div className={css.error}>{err}</div>}

        <div className={css.actions}>
          <button className={`btn ${css.btn}`} onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className={`btn primary ${css.btn}`}
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Saqlanmoqda…" : "Saqlash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** Delete confirm */
export function DeleteOrgModal({ open, onClose, onDone, org, cascadeInfo }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    setLoading(true);
    setErr("");
    try {
      await deleteOrg(org.id);
      onDone?.();
      onClose?.();
    } catch (e) {
      setErr(e?.message || "O‘chirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="O‘chirishni tasdiqlash"
      size="sm"
    >
      <div className={css.form}>
        <div className={css.confirm}>
          Rostdan ham <b>{org?.name}</b> ni o‘chirmoqchimisiz?
        </div>
        {cascadeInfo && (
          <div className={css.hint}>
            Bo‘ysunuvi: <b>{cascadeInfo.childrenCount ?? 0}</b> · Inshootlar:{" "}
            <b>{cascadeInfo.facilitiesCount ?? 0}</b>
          </div>
        )}
        {err && <div className={css.error}>{err}</div>}
        <div className={css.actions}>
          <button className={`btn ${css.btn}`} onClick={onClose}>
            Bekor qilish
          </button>
          <button
            className={`btn danger ${css.btn}`}
            onClick={submit}
            disabled={loading}
          >
            {loading ? "O‘chirilmoqda…" : "Ha, o‘chirish"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
