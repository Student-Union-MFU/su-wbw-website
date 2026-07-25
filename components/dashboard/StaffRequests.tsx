"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveStaffRequest,
  getStaffRequests,
  rejectStaffRequest,
  type StaffRequest,
} from "@/lib/adminApi";
import { useT } from "@/lib/i18n/LanguageProvider";

/**
 * แท็บ "คำขอเจ้าหน้าที่" ในแผงผู้ดูแล — รายชื่อคนที่สมัครเป็นเจ้าหน้าที่เอง (pending)
 * อนุมัติ = เปิดใช้บัญชี · ปฏิเสธ = ลบคำขอทิ้ง (ยืนยันก่อน)
 * ใช้ token สีของ dash-dark (bg-card/border-line/text-ink) เข้าชุดกับแท็บอื่น
 */
export function StaffRequests({ token }: { token: string }) {
  const t = useT();
  const r = t.dash.requests;

  const [rows, setRows] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<StaffRequest | null>(null);

  // ไม่ตั้ง setLoading(true) แบบ synchronous ในนี้ (ค่าเริ่มต้นเป็น true อยู่แล้ว
  // และ effect ที่เรียก setState ตรง ๆ ผิดกฎ lint) · รีเฟรชหลัง approve/reject
  // แค่ดึงรายการใหม่มาทับ ไม่ต้องกระพริบ loading
  const reload = useCallback(() => {
    getStaffRequests(token)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(reload, [reload]);

  async function approve(req: StaffRequest) {
    setBusyId(req.id);
    setError(null);
    try {
      await approveStaffRequest(token, req.id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : r.failed);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(req: StaffRequest) {
    setBusyId(req.id);
    setError(null);
    try {
      await rejectStaffRequest(token, req.id);
      setConfirm(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : r.failed);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-forestdeep">{r.heading}</h2>
        <p className="mt-1 text-sm text-muted">{r.sub}</p>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="rounded-[20px] border border-line bg-card p-10 text-center text-sm text-muted">…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-[20px] border border-line bg-card p-10 text-center text-sm text-muted">{r.empty}</div>
      ) : (
        <div className="overflow-x-auto rounded-[20px] border border-line bg-card">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">{r.colName}</th>
                <th className="px-4 py-3 font-medium">{r.colUsername}</th>
                <th className="px-4 py-3 font-medium">{r.colRequested}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((req) => (
                <tr key={req.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{req.display_name || r.noName}</td>
                  <td className="px-4 py-3 text-muted">{req.username}</td>
                  <td className="px-4 py-3 text-muted">{req.created ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => approve(req)}
                        disabled={busyId === req.id}
                        className="rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-forestdeep disabled:opacity-50"
                      >
                        {busyId === req.id ? r.approving : r.approve}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirm(req)}
                        disabled={busyId === req.id}
                        className="rounded-full border border-danger/40 px-4 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                      >
                        {r.reject}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[26px] border border-line bg-card p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)]">
            <p className="text-sm text-ink">{r.confirmReject(confirm.display_name || confirm.username)}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:text-ink"
              >
                {r.cancel}
              </button>
              <button
                type="button"
                onClick={() => reject(confirm)}
                disabled={busyId === confirm.id}
                className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {busyId === confirm.id ? r.rejecting : r.reject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
