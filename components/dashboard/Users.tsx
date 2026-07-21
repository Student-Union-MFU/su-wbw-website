"use client";

import { useEffect, useState } from "react";
import {
  changePassword,
  createUser,
  deleteUser,
  getUsers,
  patchUser,
  type AdminUser,
} from "@/lib/adminApi";
import { SelectField, TextField } from "@/components/register/ui";
import { useT } from "@/lib/i18n/LanguageProvider";

export function Users({ token, currentUsername }: { token: string; currentUsername: string }) {
  const t = useT();
  const roleLabel: Record<string, string> = { admin: t.dash.users.roleAdmin, staff: t.dash.users.roleStaff };
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<
    | { type: "create" }
    | { type: "edit"; user: AdminUser }
    | { type: "password"; user: AdminUser }
    | { type: "delete"; user: AdminUser }
    | null
  >(null);

  function reload() {
    getUsers(token)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }
  useEffect(reload, [token]);

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-forestdeep">
          {t.dash.users.heading} <span className="text-sm font-normal text-muted">({rows.length})</span>
        </h2>
        <button
          type="button"
          onClick={() => setModal({ type: "create" })}
          className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-forestdeep"
        >
          {t.dash.users.add}
        </button>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">{t.dash.users.colUsername}</th>
                <th className="px-4 py-3 font-medium">{t.dash.users.colDisplayName}</th>
                <th className="px-4 py-3 font-medium">{t.dash.users.colRole}</th>
                <th className="px-4 py-3 font-medium">{t.dash.users.colCreated}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">{t.dash.common.loading}</td></tr>
              ) : (
                rows.map((u) => {
                  const isSelf = u.username === currentUsername;
                  return (
                    <tr key={u.id} className="border-b border-line/70 transition-colors last:border-0 hover:bg-cream/50">
                      <td className="px-4 py-3 font-medium text-ink">
                        {u.username}
                        {isSelf && <span className="ml-2 text-xs text-muted">{t.dash.users.you}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted">{u.display_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs ${u.role === "admin" ? "bg-gold/12 text-gold" : "bg-forest/10 text-forest"}`}>
                          {roleLabel[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{u.created}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <TableAction onClick={() => setModal({ type: "edit", user: u })}>{t.dash.common.edit}</TableAction>
                          <TableAction onClick={() => setModal({ type: "password", user: u })}>{t.dash.users.passwordAction}</TableAction>
                          {!isSelf && <TableAction danger onClick={() => setModal({ type: "delete", user: u })}>{t.dash.common.delete}</TableAction>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.type === "create" && (
        <UserFormModal token={token} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />
      )}
      {modal?.type === "edit" && (
        <UserFormModal token={token} user={modal.user} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />
      )}
      {modal?.type === "password" && (
        <PasswordModal token={token} user={modal.user} onClose={() => setModal(null)} onDone={() => setModal(null)} />
      )}
      {modal?.type === "delete" && (
        <DeleteModal token={token} user={modal.user} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />
      )}
    </section>
  );
}

function TableAction({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={["rounded-full px-3 py-1.5 text-sm transition-colors", danger ? "text-danger hover:bg-danger/8" : "text-forest hover:bg-forest/8"].join(" ")}
    >
      {children}
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-[26px] bg-card p-7 shadow-[0_30px_80px_-40px_rgba(27,67,50,0.5)]">
        <h3 className="mb-5 text-lg font-semibold text-forestdeep">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function Actions({ onClose, onSave, busy, saveLabel, danger }: { onClose: () => void; onSave: () => void; busy: boolean; saveLabel?: string; danger?: boolean }) {
  const t = useT();
  return (
    <div className="mt-6 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 text-muted transition-colors hover:text-ink">{t.dash.common.cancel}</button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy}
        className={["rounded-full px-6 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-60", danger ? "bg-danger hover:brightness-95" : "bg-forest hover:bg-forestdeep"].join(" ")}
      >
        {busy ? t.dash.common.saving : saveLabel ?? t.dash.common.save}
      </button>
    </div>
  );
}

/* create + edit */
function UserFormModal({ token, user, onClose, onDone }: { token: string; user?: AdminUser; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const editing = !!user;
  const [username, setUsername] = useState(user?.username ?? "");
  const [displayName, setDisplayName] = useState(user?.display_name ?? "");
  const [role, setRole] = useState<string>(user?.role ?? "staff");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      if (editing) {
        await patchUser(token, user!.id, { display_name: displayName, role: role as "staff" | "admin" });
      } else {
        await createUser(token, { username: username.trim(), password, role: role as "staff" | "admin", display_name: displayName });
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.common.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? t.dash.users.editTitle : t.dash.users.createTitle} onClose={onClose}>
      <div className="space-y-4">
        {!editing && <TextField label={t.dash.users.colUsername} value={username} onChange={setUsername} autoComplete="off" />}
        <TextField label={t.dash.users.colDisplayName} value={displayName} onChange={setDisplayName} placeholder={t.dash.users.displayNamePlaceholder} />
        <SelectField
          label={t.dash.users.role}
          value={role}
          onChange={setRole}
          options={[
            { value: "staff", label: t.dash.users.roleStaff },
            { value: "admin", label: t.dash.users.roleAdmin },
          ]}
        />
        {!editing && <TextField label={t.dash.login.password} type="password" value={password} onChange={setPassword} autoComplete="new-password" />}
        {error && <p className="rounded-[14px] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      </div>
      <Actions onClose={onClose} onSave={save} busy={busy} saveLabel={editing ? t.dash.common.save : t.dash.users.createAccount} />
    </Modal>
  );
}

/* change password */
function PasswordModal({ token, user, onClose, onDone }: { token: string; user: AdminUser; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    setError(null);
    if (password.length < 8) { setError(t.dash.participants.pwTooShort); return; }
    setBusy(true);
    try {
      await changePassword(token, user.id, password);
      setOk(true);
      setTimeout(onDone, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.users.changePwFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={t.dash.users.changePwTitle(user.username)} onClose={onClose}>
      {ok ? (
        <p className="py-4 text-center text-forest">{t.dash.users.changePwOk}</p>
      ) : (
        <>
          <TextField label={t.dash.users.newPassword} type="password" value={password} onChange={setPassword} autoComplete="new-password" error={error ?? undefined} />
          <Actions onClose={onClose} onSave={save} busy={busy} saveLabel={t.dash.users.changePw} />
        </>
      )}
    </Modal>
  );
}

/* delete confirm */
function DeleteModal({ token, user, onClose, onDone }: { token: string; user: AdminUser; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteUser(token, user.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.dash.common.deleteFailed);
      setBusy(false);
    }
  }

  return (
    <Modal title={t.dash.users.deleteTitle} onClose={onClose}>
      <p className="text-ink">{t.dash.users.deleteConfirm(user.username)}</p>
      {error && <p className="mt-4 rounded-[14px] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <Actions onClose={onClose} onSave={confirm} busy={busy} saveLabel={t.dash.users.deleteTitle} danger />
    </Modal>
  );
}
