import type { Analytics } from "@/lib/adminApi";

/* ============================================================
   แปลงก้อนสถิติเป็นแถวสำหรับ CSV

   รูปแบบ "ยาว" (section, label, metric, value) ไม่ใช่ "กว้าง" หนึ่งตารางต่อหนึ่ง
   หมวด · เหตุผล: ก้อน analytics มีสิบกว่าหมวดที่รูปร่างไม่เหมือนกันเลย บางหมวด
   เป็นตัวเลขเดี่ยว บางหมวดเป็นรายการยาว บางหมวดมีหลายค่าต่อแถว การยัดทั้งหมด
   ลงตารางกว้างเดียวได้ไฟล์ที่เต็มไปด้วยช่องว่าง ส่วนการแยกเป็นสิบไฟล์ทำให้คน
   ที่อยากได้ "ทั้งหมด" ต้องไปประกอบเอง

   รูปแบบยาวเปิดใน Excel แล้วกรองด้วยคอลัมน์ section ได้ทันที และ pivot ได้ถ้า
   อยากได้ตารางกว้างจริง ๆ — ซึ่งเป็นงานที่ Excel ทำได้ดีกว่าเรา
   ============================================================ */

type Row = [string, string, string, string | number];

/** null = "ยังไม่มีข้อมูลพอจะคำนวณ" ไม่ใช่ศูนย์ · เขียนเป็นช่องว่างในไฟล์
 *  เพื่อไม่ให้ค่าเฉลี่ยของศูนย์คำตอบกลายเป็น 0 ตอนเอาไปคำนวณต่อ */
const num = (v: number | null | undefined): string | number => (v == null ? "" : v);

export function analyticsToRows(a: Analytics): Row[] {
  const rows: Row[] = [];
  const push = (section: string, label: string, metric: string, value: string | number) =>
    rows.push([section, label, metric, value]);

  push("meta", "generated_at", "timestamp", a.generated_at);

  /* ที่นั่ง */
  push("capacity", "seats", "max", a.capacity.max);
  push("capacity", "seats", "taken", a.capacity.taken);
  push("capacity", "seats", "seats_left", a.capacity.seats_left);
  push("capacity", "seats", "checked_in", a.capacity.checked_in);

  /* ยอดสมัครรายวัน */
  for (const d of a.registration) {
    push("registration", d.day, "count", d.count);
    push("registration", d.day, "cumulative", d.cumulative);
  }

  /* ประชากร */
  push("demographics", "profiled", "count", a.demographics.profiled);
  for (const c of a.demographics.sex) push("demographics.sex", c.key || "unspecified", "count", c.count);
  for (const c of a.demographics.year) push("demographics.year", c.key || "unknown", "count", c.count);
  for (const c of a.demographics.blood) push("demographics.blood", c.key || "unknown", "count", c.count);
  for (const s of a.demographics.school) {
    push("demographics.school", s.name || "unknown", "signed_up", s.count);
    push("demographics.school", s.name || "unknown", "checked_in", s.checked_in);
  }

  /* กลุ่ม */
  for (const [k, v] of Object.entries(a.groups)) {
    if (typeof v === "number") push("groups", "summary", k, v);
  }
  for (const g of a.groups.items) {
    push("groups.fill", `group ${g.group_number}`, "members", g.member_count);
    push("groups.fill", `group ${g.group_number}`, "capacity", g.capacity);
    push("groups.fill", `group ${g.group_number}`, "staff", g.staff_count);
  }

  /* เช็คอิน */
  push("checkins", "summary", "total", a.checkins.total);
  push("checkins", "summary", "walkers", a.checkins.walkers);
  push("checkins", "summary", "total_median_sec", num(a.checkins.total_median_sec));
  push("checkins", "summary", "total_p90_sec", num(a.checkins.total_p90_sec));
  for (const f of a.checkins.funnel) push("checkins.funnel", f.name, "count", f.count);
  for (const b of a.checkins.timeline) push("checkins.hourly", b.bucket, "count", b.count);
  for (const c of a.checkins.completion) push("checkins.completion", `${c.bases_done} bases`, "participants", c.participants);
  for (const s of a.checkins.by_staff) push("checkins.by_staff", s.key, "count", s.count);
  for (const l of a.checkins.pace) {
    const leg = `${l.from_name} -> ${l.to_name}`;
    push("checkins.pace", leg, "walkers", l.walkers);
    push("checkins.pace", leg, "median_sec", num(l.median_sec));
    push("checkins.pace", leg, "p90_sec", num(l.p90_sec));
    push("checkins.pace", leg, "fastest_sec", num(l.fastest_sec));
    push("checkins.pace", leg, "slowest_sec", num(l.slowest_sec));
  }

  /* เหตุฉุกเฉิน */
  for (const [k, v] of Object.entries(a.sos)) {
    if (typeof v === "number" || v === null) push("sos", "summary", k, num(v as number | null));
  }
  for (const c of a.sos.by_severity) push("sos.severity", c.key || "unassessed", "count", c.count);
  for (const c of a.sos.by_reason) push("sos.reason", c.key || "none", "count", c.count);
  for (const c of a.sos.by_base) push("sos.base", c.key || "unknown", "count", c.count);
  for (const b of a.sos.timeline) push("sos.hourly", b.bucket, "count", b.count);

  /* ความเห็นต่อฐาน */
  push("feedback", "summary", "responses", a.feedback.responses);
  push("feedback", "summary", "respondents", a.feedback.respondents);
  push("feedback", "summary", "avg_overall", num(a.feedback.avg_overall));
  a.feedback.distribution.forEach((n, i) => push("feedback.distribution", `${i + 1} stars`, "count", n));
  for (const b of a.feedback.by_checkpoint) {
    push("feedback.by_base", b.name, "responses", b.responses);
    push("feedback.by_base", b.name, "avg_overall", num(b.avg_overall));
    push("feedback.by_base", b.name, "avg_scenery", num(b.avg_scenery));
    push("feedback.by_base", b.name, "avg_activity", num(b.avg_activity));
    push("feedback.by_base", b.name, "avg_staff", num(b.avg_staff));
  }
  for (const c of a.feedback.recent) {
    push("feedback.comments", c.checkpoint_name, `rating ${c.rating} @ ${c.created_at}`, c.comment);
  }

  /* กำลังคน */
  for (const [k, v] of Object.entries(a.staff)) {
    if (typeof v === "number") push("staff", "summary", k, v);
  }
  for (const c of a.staff.by_role) push("staff.role", c.key, "count", c.count);

  /* ประกาศ */
  for (const [k, v] of Object.entries(a.notifications)) {
    if (typeof v === "number") push("notifications", "summary", k, v);
  }
  for (const c of a.notifications.by_level) push("notifications.level", c.key, "count", c.count);
  for (const c of a.notifications.by_audience) push("notifications.audience", c.key, "count", c.count);
  for (const b of a.notifications.timeline) push("notifications.daily", b.bucket, "count", b.count);

  return rows;
}
