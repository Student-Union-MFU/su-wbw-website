// กติการ่วมของฟอร์มที่กรอกเบอร์โทร/รหัสนักศึกษา — ใช้ทั้งหน้าสมัครและหลังบ้าน
export const PHONE_RE = /^0\d{8,9}$/; // เบอร์ไทย: ขึ้นต้น 0, 9–10 หลัก (มือถือ/เบอร์บ้าน)
export const STUDENT_ID_RE = /^693\d{7}$/;

export const digitsOnly = (v: string, max = 10) => v.replace(/\D/g, "").slice(0, max);
