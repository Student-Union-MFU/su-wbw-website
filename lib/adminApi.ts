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

/**
 * ลบบัญชีของตัวเอง (DELETE /wbw/me) — ถาวร กู้คืนไม่ได้
 *
 * ใช้ token เป็นตัวยืนยันตัวตน ไม่ต้องส่งรหัสผ่านซ้ำ: หน้า /privacy บังคับให้
 * ล็อกอินใหม่ก่อนถึงจะเรียกตัวนี้ได้อยู่แล้ว จึงเท่ากับยืนยันรหัสผ่านไปในตัว
 *
 * ฝั่ง backend เปิดเฉพาะ role participant — เจ้าหน้าที่/ผู้ดูแลได้ 403 กลับมา
 * พร้อมข้อความบอกให้ติดต่อผู้ดูแลระบบ ซึ่งหน้าเว็บแสดงต่อตรง ๆ
 */
export async function deleteMyAccount(token: string): Promise<void> {
  const res = await fetch(apiUrl("/api/me"), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(b.error || "ลบบัญชีไม่สำเร็จ");
  }
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
  leave_quota: number;
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
  leave_quota?: number;
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

/** หนึ่งบรรทัดของประวัติเข้า/ออก/ปรับสิทธิ์ · actor_name เป็น null แปลว่าผู้ใช้ทำเอง ไม่ใช่ admin */
export type MembershipLogEntry = {
  action: "join" | "leave" | "quota_adjust";
  group_id: number | null;
  group_number: number | null;
  quota_after: number;
  actor_name: string | null;
  created_at: string;
};

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
  membership_log: MembershipLogEntry[];
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

/* ===== คำขอเป็นเจ้าหน้าที่ (สมัครเอง รออนุมัติ) ===== */

/** เจ้าหน้าที่สมัครเอง — สร้างบัญชี pending (ไม่ล็อกอินให้ · รอแอดมินอนุมัติ) */
export async function registerStaff(data: {
  username: string;
  password: string;
  school_id: number;
  major?: string;
  staff_role: string;
}): Promise<void> {
  const res = await fetch(apiUrl("/api/auth/staff-register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await handle(res, "สมัครไม่สำเร็จ");
}

export type StaffRequest = {
  id: string;
  username: string;
  /** role ของบัญชี (staff/admin) — คนละอันกับ staff_role ที่เป็นหน้าที่ในงาน */
  role: string;
  display_name: string | null;
  school_id: number | null;
  school_name: string | null;
  major: string | null;
  staff_role: string | null;
  status: string;
  created: string | null;
};

export async function getStaffRequests(token: string): Promise<StaffRequest[]> {
  const res = await fetch(apiUrl("/api/admin/staff-requests"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดคำขอไม่สำเร็จ");
}

export async function approveStaffRequest(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/staff-requests/${id}/approve`), { method: "POST", headers: authHeaders(token) });
  await handle(res, "อนุมัติไม่สำเร็จ");
}

export async function rejectStaffRequest(token: string, id: string): Promise<void> {
  const res = await fetch(apiUrl(`/api/admin/staff-requests/${id}/reject`), { method: "POST", headers: authHeaders(token) });
  await handle(res, "ปฏิเสธไม่สำเร็จ");
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
  /** ตัวเลขหน้างานของฐานนี้ · avg_rating เป็น null = ยังไม่มีใครให้คะแนน ไม่ใช่ 0 ดาว */
  checkin_count: number;
  feedback_count: number;
  avg_rating: number | null;
  sos_count: number;
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

/* ===== สถิติรวม (แท็บ "วิเคราะห์") =====

   ตรงกับ model.Analytics ฝั่ง backend (GET /wbw/admin/analytics) · ทุกฟิลด์ที่
   เป็น `| null` คือ "ยังไม่มีข้อมูลพอจะคำนวณ" ไม่ใช่ศูนย์ — หน้าเว็บต้องวาด
   เป็น "—" ไม่ใช่แท่งความสูงศูนย์ ซึ่งอ่านเป็นคะแนนแย่ทั้งที่ยังไม่มีใครตอบ  */

export type CountByKey = { key: string; count: number };
export type TimeBucket = { bucket: string; count: number };

export type Analytics = {
  generated_at: string;
  capacity: { max: number; taken: number; seats_left: number; checked_in: number };
  registration: { day: string; count: number; cumulative: number }[];
  demographics: {
    profiled: number;
    sex: CountByKey[];
    year: CountByKey[];
    blood: CountByKey[];
    school: { school_id: number | null; name: string; count: number; checked_in: number }[];
  };
  groups: {
    total: number;
    full: number;
    empty: number;
    assigned: number;
    unassigned: number;
    seats: number;
    items: { group_id: number; group_number: number; capacity: number; member_count: number; staff_count: number }[];
  };
  checkins: {
    total: number;
    walkers: number;
    funnel: { checkpoint_id: number; sequence: number | null; name: string; name_en: string | null; count: number }[];
    timeline: TimeBucket[];
    completion: { bases_done: number; participants: number }[];
    by_staff: CountByKey[];
    /** เวลาระหว่างเช็คอินสองครั้งที่ติดกันของคนเดียวกัน · คู่ฐานคือเส้นทางที่เดินจริง */
    pace: {
      from_id: number;
      from_name: string;
      from_name_en: string | null;
      to_id: number;
      to_name: string;
      to_name_en: string | null;
      walkers: number;
      median_sec: number | null;
      p90_sec: number | null;
      fastest_sec: number | null;
      slowest_sec: number | null;
    }[];
    total_median_sec: number | null;
    total_p90_sec: number | null;
  };
  sos: {
    total: number;
    open: number;
    resolved: number;
    escalated: number;
    for_other: number;
    acked: number;
    open_unacked: number;
    with_gps: number;
    by_severity: CountByKey[];
    by_reason: CountByKey[];
    by_base: CountByKey[];
    timeline: TimeBucket[];
    ack_median_sec: number | null;
    ack_p90_sec: number | null;
    resolve_median_sec: number | null;
    resolve_p90_sec: number | null;
  };
  feedback: {
    responses: number;
    respondents: number;
    avg_overall: number | null;
    distribution: number[];
    by_checkpoint: {
      checkpoint_id: number;
      sequence: number | null;
      name: string;
      name_en: string | null;
      responses: number;
      avg_overall: number | null;
      avg_scenery: number | null;
      avg_activity: number | null;
      avg_staff: number | null;
    }[];
    recent: { checkpoint_name: string; rating: number; comment: string; created_at: string }[];
  };
  staff: {
    total: number;
    pending: number;
    admins: number;
    by_role: CountByKey[];
    bases_total: number;
    bases_with_staff: number;
    groups_total: number;
    groups_with_staff: number;
    checked_in_by_staff: number;
  };
  notifications: {
    total: number;
    active: number;
    by_level: CountByKey[];
    by_audience: CountByKey[];
    delivered: number;
    read: number;
    timeline: TimeBucket[];
  };
};

export async function getAnalytics(token: string): Promise<Analytics> {
  const res = await fetch(apiUrl("/api/admin/analytics"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดสถิติไม่สำเร็จ");
}


/* ===== เพิ่มผู้เข้าร่วมด้วยมือ (แผงผู้ดูแล) =====

   ใช้ก้อนเดียวกับหน้าสมัครสาธารณะ (model.RegisterRequest ฝั่ง backend) เพราะ
   backend เดินเส้นทาง Register ตัวเดียวกัน — โควตา รหัสซ้ำ เลข BIB และการ
   เข้ารหัสรหัสผ่านจึงเป็นกติกาชุดเดียวกันทั้งสองทาง  */

export type NewParticipant = {
  student_id: string;
  password: string;
  profile: {
    first_name: string;
    last_name: string;
    sex: string;
    contact_phone?: string | null;
    school_id?: number | null;
    major?: string | null;
    date_of_birth?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
  };
  medical?: { weight_kg?: number | null; height_cm?: number | null; blood_type?: string | null };
  consent?: { consent_health_data: boolean; consent_emergency_treatment: boolean; waiver_accepted: boolean };
};

export async function createParticipant(token: string, data: NewParticipant): Promise<Participant> {
  const res = await fetch(apiUrl("/api/admin/participants"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handle(res, "เพิ่มผู้เข้าร่วมไม่สำเร็จ");
}

/* ===== เคสฉุกเฉิน (แท็บ "เหตุฉุกเฉิน") =====

   ต่างจาก /staff/sos ที่เจ้าหน้าที่ใช้หน้างาน ซึ่งตอบเฉพาะเคสที่ยังต้องจัดการ —
   ตัวนี้คืนทุกเคสของทั้งงานรวมที่ปิดไปแล้ว เพราะคำถามของแอดมินคือ "ทั้งงานเกิด
   อะไรขึ้นบ้าง" ไม่ใช่ "ตอนนี้ต้องวิ่งไปไหน"  */

export type SOSSeverity = "minor" | "major" | "urgent";

export type SOSCase = {
  id: number;
  for_other: boolean;
  lat: number | null;
  lng: number | null;
  accuracy_m: number | null;
  loc_source: string | null;
  checkpoint_id: number | null;
  checkpoint_name: string | null;
  message: string | null;
  resolved: boolean;
  resolve_reason: string | null;
  acked_at: string | null;
  acked_by_name: string | null;
  created_at: string;
  updated_at: string;
  severity: SOSSeverity | null;
  escalated: boolean;
  participant_id: string;
  first_name: string;
  last_name: string;
  bib: number | null;
  group_number: number | null;
  contact_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  /** ข้อมูลสุขภาพเปิดเฉพาะเคสที่ยังเปิดอยู่ + เจ้าตัวยินยอม + ไม่ใช่กดแทนคนอื่น
   *  เงื่อนไขบังคับอยู่ใน SQL ฝั่ง backend ไม่ใช่ที่หน้าจอ */
  blood_type: string | null;
  health_notes: string | null;
};

export async function getSOSCases(token: string, limit = 200): Promise<SOSCase[]> {
  const res = await fetch(apiUrl(`/api/admin/sos?limit=${limit}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดรายการเคสไม่สำเร็จ");
}

export type NewSOSCase = {
  participant_id: string;
  message?: string | null;
  severity?: SOSSeverity | null;
  for_other?: boolean;
};

export async function createSOSCase(token: string, data: NewSOSCase): Promise<SOSCase> {
  const res = await fetch(apiUrl("/api/admin/sos"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  return handle(res, "เปิดเคสไม่สำเร็จ");
}

/** ทุกช่องเป็น optional โดยตั้งใจ — ส่งเฉพาะสิ่งที่เปลี่ยนจริง
 *  severity: "" = ล้างระดับที่เคยประเมิน · undefined = ไม่แตะ */
export type SOSPatch = {
  severity?: SOSSeverity | "";
  escalated?: boolean;
  resolved?: boolean;
  reason?: string;
};

export async function patchSOSCase(token: string, id: number, patch: SOSPatch): Promise<SOSCase> {
  const res = await fetch(apiUrl(`/api/admin/sos/${id}`), {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(patch),
  });
  return handle(res, "แก้ไขเคสไม่สำเร็จ");
}

/* ===== แชทกลุ่มในมุมผู้ดูแล (แท็บ "แชท") =====

   ผู้ดูแลอ่านได้ทุกห้องโดยไม่ต้องเป็นสมาชิก และเห็นสิ่งที่ถูกจัดการไปแล้ว —
   ข้อความที่ลบยังอ่านได้ที่นี่ (ผู้เข้าร่วมเห็นเป็นข้อความแจ้งแทน) และข้อความ
   ที่เซ็นเซอร์มี original_body ติดมาด้วย เพื่อให้ตัดสินใจกู้คืนได้โดยไม่ต้องเดา  */

export type ChatRoom = {
  group_id: number;
  group_number: number;
  member_count: number;
  message_count: number;
  deleted_count: number;
  censored_count: number;
  last_message_at: string | null;
};

export type ChatMessage = {
  id: number;
  group_id: number;
  sender_id: string;
  client_id: string;
  /** ค่าดิบ — ข้อความที่ถูกลบก็ยังอ่านได้ที่นี่ ต่างจากที่แอปได้รับ */
  body: string;
  created_at: string | null;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  sender_role: string | null;
  /** ว่างสำหรับบัญชีเจ้าหน้าที่/ผู้ดูแลที่ไม่ได้ผูกกับรหัสนักศึกษา */
  student_id: string;
  avatar: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  censored_at: string | null;
  censored_by: string | null;
  /** ข้อความก่อนถูกเซ็นเซอร์ · null เมื่อไม่เคยถูกเซ็นเซอร์ */
  original_body: string | null;
};

export type ChatAction = "delete" | "restore" | "censor" | "uncensor";

export async function getChatRooms(token: string): Promise<ChatRoom[]> {
  const res = await fetch(apiUrl("/api/admin/chat"), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  if (res.status === 403) throw new Error("forbidden");
  return handle(res, "โหลดรายการห้องไม่สำเร็จ");
}

export async function getChatMessages(token: string, groupId: number): Promise<ChatMessage[]> {
  const res = await fetch(apiUrl(`/api/admin/chat/${groupId}`), { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) throw new Error("unauthorized");
  return handle(res, "โหลดข้อความไม่สำเร็จ");
}

export async function searchChat(token: string, q: string): Promise<ChatMessage[]> {
  const res = await fetch(apiUrl(`/api/admin/chat/search?q=${encodeURIComponent(q)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  return handle(res, "ค้นหาไม่สำเร็จ");
}

export async function moderateChatMessage(
  token: string,
  id: number,
  action: ChatAction,
  replacement?: string,
): Promise<ChatMessage> {
  const res = await fetch(apiUrl(`/api/admin/chat/messages/${id}`), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ action, replacement: replacement ?? "" }),
  });
  return handle(res, "ดำเนินการไม่สำเร็จ");
}

/* ===== ส่งออก CSV =====

   URL ของสองไฟล์นี้ประกาศไว้ที่เดียว แล้วให้แต่ละหน้าเรียกผ่าน saveServerCSV
   (lib/csv.ts) — path ที่พิมพ์ซ้ำในหลายคอมโพเนนต์คือ path ที่วันหนึ่งจะแก้ไม่ครบ */

export const exportUrls = {
  participants: () => apiUrl("/api/admin/export/participants.csv"),
  staff: () => apiUrl("/api/admin/export/staff.csv"),
};
