// เรียก backend admin ผ่าน proxy /api
import { apiUrl } from "@/lib/apiBase";

/** บทบาทที่ backend ส่งกลับมาตอนล็อกอิน (ยืนยันจาก /auth/login จริง) */
export type Role = "admin" | "staff" | "participant";

export type Session = { token: string; username: string; role: Role };

/**
 * เข้าสู่ระบบ — ใช้ได้กับทุกบทบาท
 *
 * `/auth/login` เป็น endpoint กลางอยู่แล้ว เมื่อก่อนฝั่งนี้ดักไว้เองว่า
 * ถ้า role ไม่ใช่ admin ให้โยน error ทิ้ง · ตอนนี้คืน role กลับไปให้ผู้เรียก
 * ตัดสินใจว่าจะพาไปหน้าไหนแทน
 *
 * ผู้เข้าร่วมใช้ "รหัสนักศึกษา" เป็น username (ค่าเดียวกับตอนสมัคร)
 */
export async function login(username: string, password: string): Promise<Session> {
  const res = await fetch(apiUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || "เข้าสู่ระบบไม่สำเร็จ");
  }
  const data = await res.json();
  return {
    token: data.token as string,
    username: data.user?.username as string,
    role: (data.user?.role ?? "participant") as Role,
  };
}

/** โปรไฟล์ของผู้เข้าร่วมที่ล็อกอินอยู่ — ตรงกับ model.ParticipantDetail ฝั่ง backend (/wbw/me) */
export type MyProfile = {
  id: string;
  student_id: string | null;
  bib: number | null;
  first_name: string | null;
  last_name: string | null;
  sex: string | null;
  date_of_birth: string | null;
  contact_phone: string | null;
  school_id: number | null;
  school_name: string | null;
  major: string | null;
  group_number: number | null;
  photo_url: string | null;
  checked_in: boolean;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  blood_type: string | null;
  weight_kg: number | null;
  height_cm: number | null;
};

/** ดึงโปรไฟล์ตัวเอง (ผู้เข้าร่วม) — ต้องมี token */
export async function getMyProfile(token: string): Promise<MyProfile> {
  const res = await fetch(apiUrl("/api/me"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  return res.json();
}

export type Stats = {
  participants: number;
  total_checkins: number;
  open_sos: number;
  full_groups: number;
};

export async function getStats(token: string): Promise<Stats> {
  const res = await fetch(apiUrl("/api/admin/dashboard"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  return res.json();
}

export type BaseOverview = {
  id: number;
  name: string;
  name_en: string | null;
  sequence: number | null;
  activity_name: string | null;
  activity_name_en: string | null;
  checkin_count: number;
  staff: { id: string; name: string }[];
};

export async function getBasesOverview(token: string): Promise<BaseOverview[]> {
  const res = await fetch(apiUrl("/api/admin/bases-overview"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  if (!res.ok) throw new Error("โหลดข้อมูลฐานไม่สำเร็จ");
  return res.json();
}

export type Participant = {
  id: string;
  student_id: string;
  created: string;
  bib: number | null;
  first_name: string | null;
  last_name: string | null;
  contact_phone: string | null;
  school_id: number | null;
  school_name: string | null;
  major: string | null;
  sex: string | null;
  group_id: number | null;
  group_number: number | null;
  checked_in: boolean;
  blood_type: string | null;
};

export async function getParticipants(token: string): Promise<Participant[]> {
  const res = await fetch(apiUrl("/api/admin/participants"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  if (!res.ok) throw new Error("โหลดรายชื่อไม่สำเร็จ");
  return res.json();
}

export type ParticipantPatch = {
  student_id?: string;
  first_name?: string;
  last_name?: string;
  contact_phone?: string;
  school_id?: number;
  major?: string;
  sex?: string;
  date_of_birth?: string;
  group_id?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  weight_kg?: number;
  height_cm?: number;
  blood_type?: string;
  checked_in?: boolean;
};

export async function patchParticipant(token: string, id: string, patch: ParticipantPatch): Promise<Participant> {
  const res = await fetch(apiUrl(`/api/admin/participants/${id}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || "บันทึกไม่สำเร็จ");
  }
  return res.json();
}

// ข้อมูลเต็มที่เก็บตอนสมัคร (สำหรับหน้าแก้ไข)
export type ParticipantDetail = Participant & {
  date_of_birth: string | null;
  photo_url: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  consent_health_data: boolean | null;
  consent_emergency_treatment: boolean | null;
  waiver_accepted: boolean | null;
};

export async function getParticipantDetail(token: string, id: string): Promise<ParticipantDetail> {
  const res = await fetch(apiUrl(`/api/admin/participants/${id}/detail`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
  return res.json();
}

export async function resetParticipantPassword(token: string, id: string, password: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/participants/${id}/reset-password`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || "รีเซ็ตรหัสไม่สำเร็จ");
  }
}

export async function deleteParticipant(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/participants/${id}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || "ลบไม่สำเร็จ");
  }
}

/* ===== จัดการเจ้าหน้าที่และผู้ดูแล ===== */
export type AdminUser = {
  id: string;
  username: string;
  role: "staff" | "admin";
  display_name: string | null;
  created: string;
};

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function handle<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || fallback);
  }
  return res.json();
}

export async function getUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(apiUrl("/api/admin/users"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดรายชื่อไม่สำเร็จ");
}

export async function createUser(
  token: string,
  data: { username: string; password: string; role: "staff" | "admin"; display_name?: string },
): Promise<AdminUser> {
  const res = await fetch(apiUrl("/api/admin/users"), { method: "POST", headers: authHeaders(token), body: JSON.stringify(data) });
  return handle(res, "สร้างบัญชีไม่สำเร็จ");
}

export async function patchUser(
  token: string,
  id: string,
  patch: { display_name?: string; role?: "staff" | "admin" },
): Promise<AdminUser> {
  const res = await fetch(apiUrl(`/api/admin/users/${id}`), { method: "PATCH", headers: authHeaders(token), body: JSON.stringify(patch) });
  return handle(res, "แก้ไขไม่สำเร็จ");
}

export async function changePassword(token: string, id: string, password: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/users/${id}/password`), { method: "POST", headers: authHeaders(token), body: JSON.stringify({ password }) });
  await handle(res, "เปลี่ยนรหัสผ่านไม่สำเร็จ");
}

export async function deleteUser(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/users/${id}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  await handle(res, "ลบบัญชีไม่สำเร็จ");
}

/* ===== ฐาน (checkpoint) + เจ้าหน้าที่ประจำ ===== */
export type CheckpointStaff = { id: string; username: string; display_name: string | null };
export type Checkpoint = {
  id: number;
  name: string;
  name_en: string | null;
  type: string;
  sequence: number | null;
  staff: CheckpointStaff[];
};

export async function getCheckpoints(token: string): Promise<Checkpoint[]> {
  const res = await fetch(apiUrl("/api/admin/checkpoints"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดฐานไม่สำเร็จ");
}

export async function createCheckpoint(
  token: string,
  data: { name: string; name_en?: string | null; type: string; sequence?: number | null },
): Promise<Checkpoint> {
  const res = await fetch(apiUrl("/api/admin/checkpoints"), { method: "POST", headers: authHeaders(token), body: JSON.stringify(data) });
  return handle(res, "เพิ่มฐานไม่สำเร็จ");
}

export async function patchCheckpoint(
  token: string,
  id: number,
  patch: { name?: string; name_en?: string | null; type?: string; sequence?: number | null },
): Promise<Checkpoint> {
  const res = await fetch(apiUrl(`/api/admin/checkpoints/${id}`), { method: "PATCH", headers: authHeaders(token), body: JSON.stringify(patch) });
  return handle(res, "แก้ไขฐานไม่สำเร็จ");
}

export async function deleteCheckpoint(token: string, id: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/checkpoints/${id}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  await handle(res, "ลบฐานไม่สำเร็จ");
}

export async function assignStaff(token: string, checkpointId: number, userId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/checkpoints/${checkpointId}/staff`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ user_id: userId }),
  });
  await handle(res, "มอบหมายไม่สำเร็จ");
}

export async function unassignStaff(token: string, checkpointId: number, userId: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/checkpoints/${checkpointId}/staff/${userId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  await handle(res, "ถอดออกไม่สำเร็จ");
}

/* ===== activity log ===== */
export type LogEntry = {
  id: number;
  actor_name: string | null;
  action: string;
  detail: string | null;
  created_at: string;
};

export async function getLogs(token: string): Promise<LogEntry[]> {
  const res = await fetch(apiUrl("/api/admin/logs"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดบันทึกไม่สำเร็จ");
}

/* ===== ประกาศ / แจ้งเตือน ===== */
export type NotiLevel = "info" | "warning" | "emergency";
export type Audience = "all" | "group" | "school" | "user";

export type SentNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  level: NotiLevel;
  audience: Audience;
  audience_id: string | null;
  created_at: string;
  expires_at: string | null;
  creator_name: string | null;
  delivered_count: number | string;
  read_count: number | string;
};

export type NewNotification = {
  type?: string;
  title: string;
  body?: string;
  level: NotiLevel;
  audience: Audience;
  audience_id?: string | null;
  expires_at?: string | null;
};

export async function createNotification(token: string, data: NewNotification): Promise<SentNotification> {
  const res = await fetch(apiUrl("/api/notifications"), { method: "POST", headers: authHeaders(token), body: JSON.stringify(data) });
  return handle(res, "ส่งประกาศไม่สำเร็จ");
}

/* ---------- ประกาศสำหรับหน้า /announcements ---------- */

/** ประกาศหนึ่งชิ้นที่ผู้เข้าร่วม/สาธารณะเห็น */
export type Announcement = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  level: NotiLevel;
  created_at: string;
  expires_at: string | null;
  creator_name: string | null;
};

/** ประกาศสาธารณะ (audience=all) — ไม่ต้องล็อกอิน */
export async function getPublicAnnouncements(): Promise<Announcement[]> {
  const res = await fetch(apiUrl("/api/notifications/public"));
  if (!res.ok) throw new Error("โหลดประกาศไม่สำเร็จ");
  return res.json();
}

/** ประกาศของผู้เข้าร่วมที่ล็อกอิน (all + เจาะจงกลุ่ม/สำนัก/รายบุคคล) */
export async function getMyAnnouncements(token: string): Promise<Announcement[]> {
  const res = await fetch(apiUrl("/api/notifications"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("โหลดประกาศไม่สำเร็จ");
  return res.json();
}

export async function getSentNotifications(token: string): Promise<SentNotification[]> {
  const res = await fetch(apiUrl("/api/notifications/sent"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดประกาศไม่สำเร็จ");
}

/* draft (ค้างข้อมูล) + preset (เก็บใช้ซ้ำ) */
export type NotiPreset = {
  id: number;
  kind: "preset" | "draft";
  name: string | null;
  title: string | null;
  body: string | null;
  level: NotiLevel;
  audience: Audience;
  audience_id: string | null;
};
export type ComposerState = {
  title?: string | null;
  body?: string | null;
  level: NotiLevel;
  audience: Audience;
  audience_id?: string | null;
};

export async function getDraft(token: string): Promise<NotiPreset | null> {
  const res = await fetch(apiUrl("/api/notifications/draft"), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  return res.json();
}
export async function saveDraft(token: string, data: ComposerState): Promise<void> {
  await fetch(apiUrl("/api/notifications/draft"), { method: "PUT", headers: authHeaders(token), body: JSON.stringify(data) });
}
export async function clearDraft(token: string): Promise<void> {
  await fetch(apiUrl("/api/notifications/draft"), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}
export async function getPresets(token: string): Promise<NotiPreset[]> {
  const res = await fetch(apiUrl("/api/notifications/presets"), { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  return res.json();
}
export async function savePreset(token: string, data: ComposerState & { name: string }): Promise<NotiPreset> {
  const res = await fetch(apiUrl("/api/notifications/presets"), { method: "POST", headers: authHeaders(token), body: JSON.stringify(data) });
  return handle(res, "บันทึก preset ไม่สำเร็จ");
}
export async function deletePreset(token: string, id: number): Promise<void> {
  await fetch(apiUrl(`/api/notifications/presets/${id}`), { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}

/* กลุ่ม + สำนักวิชา (ใช้เป็นตัวเลือกกลุ่มเป้าหมาย) */
export type NotiGroup = { group_id: number; group_number: number };
export type School = { school_id: number; name: string };

export async function getGroups(token: string): Promise<NotiGroup[]> {
  const res = await fetch(apiUrl("/api/groups"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดรายชื่อกลุ่มไม่สำเร็จ");
}

export async function getSchools(token: string): Promise<School[]> {
  const res = await fetch(apiUrl("/api/admin/schools"), { headers: { Authorization: `Bearer ${token}` } });
  return handle(res, "โหลดสำนักวิชาไม่สำเร็จ");
}
