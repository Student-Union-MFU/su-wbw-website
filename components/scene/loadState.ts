/**
 * ฉาก 3D โหลดโมเดลครั้งเดียวตลอดอายุแอป (Canvas เดียวใน SceneHost)
 * หน้าโหลด (progress bar) จึงควรโชว์แค่ครั้งแรกเท่านั้น — เปลี่ยนหน้าทีหลัง
 * ห้ามโชว์ ไม่งั้นจะกลายเป็น "จอเขียวแวบ" แบบเดิมที่เรากำลังแก้
 *
 * flag ระดับโมดูล (นอก React) — คงอยู่ข้ามการ mount/unmount ของหน้า
 */
let loaded = false;

export const isSceneLoaded = () => loaded;
export const markSceneLoaded = () => {
  loaded = true;
};
