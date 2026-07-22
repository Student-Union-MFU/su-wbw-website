import { redirect } from "next/navigation";

// หน้าแรก wbw.sumfu.xyz → เด้งไปหน้า landing (ฉากเดินรอบดอย) แล้วค่อยกดสมัครจากตรงนั้น
export default function Home() {
  redirect("/landing");
}
