import { redirect } from "next/navigation";

// หน้าแรก wbw.sumfu.xyz → เด้งไปหน้าสมัครทันที (2000 คนเข้ามาสมัครเลย ไม่ต้องคลิกต่อ)
export default function Home() {
  redirect("/register");
}
