"use client";

import { Fragment, useEffect, useState } from "react";
import {
  changePassword,
  createUser,
  deleteUser,
  getUsers,
  patchUser,
  type AdminUser,
  exportUrls,
} from "@/lib/adminApi";
import { SelectField, TextField } from "@/components/register/ui";
import { useT } from "@/lib/i18n/LanguageProvider";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { saveServerCSV } from "@/lib/csv";

export function Users({ token, currentUsername }: { token: string; currentUsername: string }) {
  const t = useT();
  const roleLabel: Record<string, string> = { admin: t.dash.users.roleAdmin, staff: t.dash.users.roleStaff };
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  // เหมือนตารางผู้เข้าร่วม — กางในที่ ไม่เปิด modal ทับทั้งหน้า
  const [expanded, setExpanded] = useState<string | null>(null);
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
        <div className="flex items-center gap-2">
          <ExportButton onExport={() => saveServerCSV(exportUrls.staff(), token, "wbw-staff.csv")} />
          <button
            type="button"
            onClick={() => setModal({ type: "create" })}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110"
          >
            {t.dash.users.add}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">{t.dash.users.colUsername}</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">{t.dash.users.colDisplayName}</th>
                <th className="px-4 py-3 font-medium">{t.dash.users.colRole}</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">{t.dash.users.colCreated}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">{t.dash.common.loading}</td></tr>
              ) : (
                rows.map((u) => {
                  const isSelf = u.username === currentUsername;
                  const open = expanded === u.id;
                  return (
                    <Fragment key={u.id}>
                      <tr
                        onClick={() => setExpanded(open ? null : u.id)}
                        className={`cursor-pointer border-b border-line/70 transition-colors last:border-0 ${
                          open ? "bg-cream/60" : "hover:bg-cream/50"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-ink">
                          {u.username}
                          {isSelf && <span className="ml-2 text-xs text-muted">{t.dash.users.you}</span>}
                        </td>
                        <td className="hidden px-4 py-3 text-muted sm:table-cell">{u.display_name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs ${u.role === "admin" ? "bg-gold/12 text-gold" : "bg-forest/10 text-forest"}`}>
                            {roleLabel[u.role]}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-muted md:table-cell">{u.created}</td>
                        <td className="px-4 py-3 text-right">
                          <svg
                            viewBox="0 0 24 24"
                            className={`ml-auto h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden
                          >
                            <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-line/70 bg-cream/40 last:border-0">
                          <td colSpan={5} className="px-4 pb-5 pt-1">
                            {/* ปุ่มสามอันที่เคยเบียดกันอยู่ในคอลัมน์สุดท้ายมาอยู่ตรงนี้แทน —
                                "ลบบัญชี" ที่อยู่ห่างจาก "แก้ไข" สองพิกเซลคือปุ่มที่จะถูกกดพลาด
                                วันหนึ่งแน่นอน และมันลบบัญชีเจ้าหน้าที่จริง */}
                            <div className="rounded-[18px] border border-line bg-card p-5">
                              <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-3">
                                <Fact k={t.dash.users.colUsername} v={u.username} />
                                <Fact k={t.dash.users.colDisplayName} v={u.display_name || "—"} />
                                <Fact k={t.dash.users.colCreated} v={u.created ?? "—"} />
                              </dl>
                              <div className="mt-5 flex flex-wrap justify-end gap-2">
                                <RowButton onClick={() => setModal({ type: "edit", user: u })}>
                                  {t.dash.common.edit}
                                </RowButton>
                                <RowButton onClick={() => setModal({ type: "password", user: u })}>
                                  {t.dash.users.passwordAction}
                                </RowButton>
                                {!isSelf && (
                                  <RowButton danger onClick={() => setModal({ type: "delete", user: u })}>
                                    {t.dash.common.delete}
                                  </RowButton>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-sm">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{k}</dt>
      <dd className="mt-0.5 break-words text-ink">{v}</dd>
    </div>
  );
}

function RowButton({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm transition-colors",
        danger
          ? "border-danger/50 text-danger hover:bg-danger/10"
          : "border-line text-muted hover:border-forest/40 hover:text-forest",
      ].join(" ")}
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
        className={["rounded-full px-6 py-2.5 font-medium text-white transition-all duration-200 disabled:opacity-60", danger ? "bg-danger hover:brightness-95" : "bg-forest hover:brightness-110"].join(" ")}
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
