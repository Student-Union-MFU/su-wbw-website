"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/LanguageProvider";

/* ============================================================
   viz — ชิ้นส่วนกราฟที่ใช้ซ้ำได้ทั้งแผงผู้ดูแล (SVG/CSS ล้วน ไม่มี library)

   ทำไมไม่ลง chart library: แผงนี้อยู่ในบิลด์ standalone ที่ deploy ลงเครื่อง
   ตัวเอง และเป็นหน้าที่มีคนเปิดหลักสิบ ไม่ใช่หลักพัน · การเพิ่ม recharts +
   d3 เข้ามาเพื่อวาดแท่งกับเส้นแปลว่าทุกคนที่เปิดแผงโหลด JS เพิ่มหลายร้อย KB
   และเราต้องเขียน theme ให้มันเข้ากับ token ของเว็บอยู่ดี — ซึ่งเป็นงานพอ ๆ
   กับวาดเอง แต่ได้ผลที่คุมสีไม่ได้เท่า

   ⚠ สีในไฟล์นี้ไม่ได้เลือกด้วยตา — ทุกค่าผ่านเครื่องมือตรวจ (lightness band,
   chroma floor, ระยะห่างภายใต้ตาบอดสี protan/deutan, contrast กับพื้นการ์ด)
   บนพื้นการ์ดของธีมมืด #1b2c22 ซึ่งเป็นพื้นจริงของแผงนี้ · ถ้าจะเปลี่ยนสี
   ให้รันตรวจใหม่ ไม่ใช่เลือกเฉดที่ "ดูเข้ากัน" — เฉดที่ดูต่างกันดีสำหรับตา
   ปกติ ยุบเป็นสีเดียวกันภายใต้ตาบอดสีเขียว-แดงได้ง่ายมาก และคนกลุ่มนั้นคือ
   ~8% ของผู้ชาย ซึ่งในทีมงานระดับนี้แปลว่ามีจริงเกือบแน่นอน
   ============================================================ */

/** สีของ "ชุดข้อมูล" (identity) — ใช้ตามลำดับเสมอ ห้ามวนซ้ำหรือสลับที่
 *  ลำดับคือกลไกกันสีชนกันภายใต้ตาบอดสี (คู่ที่แย่ที่สุด ΔE 17.7)
 *  เกินสี่ชุดคือสัญญาณว่าควรแยกกราฟ ไม่ใช่หาสีที่ห้า */
export const SERIES = ["#2fa06a", "#188ceb", "#ba7917", "#d34cae"] as const;

/** ไล่เฉดสำหรับ "ปริมาณ/ลำดับ" (ยิ่งมาก = ยิ่งสว่างบนพื้นมืด)
 *  ปลายเข้มสุดยัง contrast 2.49:1 กับพื้นการ์ด — ยังเห็นว่ามีช่องอยู่ ไม่จมหาย */
export const RAMP = ["#00743d", "#078955", "#409e6e", "#63b487", "#83caa1", "#a3e0bc"] as const;

/** สีของ "สถานะ" — ความหมายจองไว้ ห้ามเอาไปใช้เป็นสีชุดข้อมูลที่ห้า
 *  ทุกที่ที่ใช้ต้องมีข้อความกำกับด้วย ห้ามสื่อด้วยสีอย่างเดียว */
export const STATUS = {
  good: "#2fa06a",
  warning: "#d29922",
  serious: "#df7a32",
  critical: "#dd5652",
  neutral: "#89968e",
} as const;

/** สีพื้นการ์ด — ใช้เป็น "ช่องว่าง" ระหว่างแท่งที่ติดกัน และเป็นวงแหวนรอบจุด
 *  อ้าง token ไม่ใช่ค่าคงที่ เพื่อให้ยังถูกถ้าวันหนึ่งแผงกลับไปเป็นธีมสว่าง */
const SURFACE = "var(--color-card)";

/* ---------- helper ---------- */

/** วัดความกว้างจริงของกล่อง — กราฟ SVG ต้องรู้พิกเซลจริงถึงจะวางป้ายไม่ทับกัน
 *  ใช้ viewBox ยืดเอาไม่ได้ เพราะเส้นกับตัวอักษรจะถูกยืดตามจนบิด */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/* ---------- โครงการ์ด ---------- */

export function Panel({
  title,
  sub,
  right,
  children,
  className = "",
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[20px] border border-line bg-card p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-forestdeep">{title}</h3>
          {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Empty({ text }: { text?: string }) {
  const t = useT();
  return <div className="py-10 text-center text-sm text-muted">{text ?? t.dash.charts.noData}</div>;
}

/* ---------- tooltip ---------- */

type Tip = { x: number; y: number; title: string; rows: [string, string][] } | null;

function TipBox({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl border border-line bg-cream/95 px-3 py-2 shadow-lg backdrop-blur"
      style={{ left: tip.x, top: tip.y - 10 }}
    >
      <p className="whitespace-nowrap text-xs font-medium text-ink">{tip.title}</p>
      {tip.rows.map(([k, v]) => (
        <p key={k} className="mt-0.5 flex gap-3 whitespace-nowrap text-[11px] text-muted">
          <span className="flex-1">{k}</span>
          <span className="font-medium text-ink">{v}</span>
        </p>
      ))}
    </div>
  );
}

/* ============================================================
   แท่งแนวนอน — ใช้กับหมวดที่ชื่อยาว (สำนักวิชา ฐาน สาเหตุ)

   ทุกแท่งสีเดียวกันโดยตั้งใจ เมื่อเป็น "ชุดเดียวหลายหมวด": ความยาวบอกค่าอยู่
   แล้ว การไล่สีตามค่าซ้ำอีกชั้นคือการใช้ช่องทางสีไปกับข้อมูลที่แสดงไปแล้ว
   และทำให้สีไม่เหลือความหมายเวลาต้องแยก "ชุด" จริง ๆ
   ส่ง color มาเฉพาะตอนที่หมวดนั้นมีความหมายเชิงสถานะ (เช่น ระดับความรุนแรง)
   ============================================================ */

export type BarItem = {
  key: string;
  label: string;
  value: number;
  color?: string;
  note?: string;
  /** บรรทัดเพิ่มใน tooltip ของแท่งนี้ — ใช้เมื่อค่าเดียวเล่าไม่ครบ
   *  (เช่น ช่วงเวลาระหว่างฐาน ที่ต้องบอกทั้งค่ากลาง ช้าสุด และนับจากกี่คน) */
  rows?: [string, string][];
};

export function BarsH({
  items,
  total,
  unit,
  max: maxOverride,
  format,
  wide,
}: {
  items: BarItem[];
  /** ถ้าส่งมา จะโชว์เป็นเปอร์เซ็นต์ใน tooltip ด้วย */
  total?: number;
  unit?: (n: number) => string;
  max?: number;
  /** แปลงค่าเป็นข้อความท้ายแท่ง — ใช้เมื่อค่าไม่ใช่ "จำนวน" (เช่น วินาที → "25 นาที")
   *  ตัวเลขดิบ 1500 ท้ายแท่งไม่ได้บอกอะไรกับคนอ่านเลยถ้าหน่วยคือวินาที */
  format?: (n: number) => string;
  /** ป้ายยาวเป็นพิเศษ (เช่น "ฐาน ก → ฐาน ข" ซึ่งเป็นชื่อฐานสองชื่อต่อกัน)
   *  ใช้เฉพาะในการ์ดที่กว้างเต็มแถว — ในการ์ดครึ่งแถวจะไม่เหลือที่ให้แท่ง */
  wide?: boolean;
}) {
  const t = useT();
  const [tip, setTip] = useState<Tip>(null);
  if (!items.length) return <Empty />;
  const max = maxOverride ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="relative space-y-2" onMouseLeave={() => setTip(null)}>
      {items.map((it) => (
        <div
          key={it.key}
          className="flex items-center gap-3"
          onMouseMove={(e) => {
            const box = e.currentTarget.parentElement!.getBoundingClientRect();
            const r = e.currentTarget.getBoundingClientRect();
            setTip({
              x: e.clientX - box.left,
              y: r.top - box.top,
              title: it.label,
              rows: [
                [format ? format(it.value) : unit ? unit(it.value) : t.dash.charts.people(it.value), ""],
                ...(total ? ([[t.dash.insights.shareOfTotal, `${((it.value / total) * 100).toFixed(1)}%`]] as [string, string][]) : []),
                ...(it.rows ?? []),
                ...(it.note ? ([[it.note, ""]] as [string, string][]) : []),
              ].filter(([k]) => k) as [string, string][],
            });
          }}
        >
          <span
            className={`flex-none truncate text-xs text-muted ${wide ? "w-40 sm:w-72" : "w-28 sm:w-40"}`}
            title={it.label}
          >
            {it.label}
          </span>
          {/* ราง = เฉดอ่อนของเส้นขอบ ไม่ใช่สีชุดข้อมูล — รางที่มีสีอ่านเป็นค่าที่สอง */}
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-line/60">
            <span
              className="block h-full transition-[width] duration-500"
              style={{
                width: `${Math.max(it.value > 0 ? 2 : 0, (it.value / max) * 100)}%`,
                background: it.color ?? SERIES[0],
                borderRadius: "0 4px 4px 0",
              }}
            />
          </span>
          <span
            className={`flex-none text-right text-xs font-medium tabular-nums text-ink ${format ? "w-16" : "w-10"}`}
          >
            {format ? format(it.value) : it.value}
          </span>
        </div>
      ))}
      <TipBox tip={tip} />
    </div>
  );
}

/* ============================================================
   คอลัมน์แนวตั้ง — ใช้กับแกนที่เป็นเวลา/ลำดับ (รายวัน รายชั่วโมง จำนวนฐาน)
   ============================================================ */

export function Columns({
  items,
  color,
  unit,
  /** ป้ายค่าบนหัวแท่ง — ติดเฉพาะแท่งสูงสุดกับแท่งสุดท้าย ไม่ใช่ทุกแท่ง
   *  ตัวเลขบนทุกแท่งอ่านไม่ออกและไม่มีใครอ่าน */
  labelPeaks = true,
}: {
  items: BarItem[];
  color?: string;
  unit?: (n: number) => string;
  labelPeaks?: boolean;
}) {
  const t = useT();
  const [tip, setTip] = useState<Tip>(null);
  if (!items.length) return <Empty />;
  const max = Math.max(...items.map((i) => i.value), 1);
  const peak = items.reduce((a, b) => (b.value > a.value ? b : a));

  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      {/* items-stretch ไม่ใช่ items-end: ลูกต้องสูงเท่าแถวจริง ๆ ไม่งั้น height เป็น %
          ของแท่งข้างในไปอ้างกับความสูง auto แล้วได้ศูนย์ — แท่งหายทั้งกราฟ
          แต่ป้ายตัวเลขยังอยู่ ซึ่งทำให้ดูเหมือนข้อมูลเป็นศูนย์แทนที่จะดูเหมือนบั๊ก */}
      <div className="flex h-44 items-stretch gap-[2px]">
        {items.map((it, i) => {
          const marked = labelPeaks && (it.key === peak.key || i === items.length - 1) && it.value > 0;
          return (
            <div
              key={it.key}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              onMouseMove={(e) => {
                const box = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                setTip({
                  x: e.clientX - box.left,
                  y: e.clientY - box.top - 8,
                  title: it.label,
                  rows: [[unit ? unit(it.value) : t.dash.charts.people(it.value), ""]],
                });
              }}
            >
              {marked && <span className="text-[10px] font-medium tabular-nums text-ink">{it.value}</span>}
              <span
                className="w-full max-w-6 transition-[height] duration-500"
                style={{
                  height: `${Math.max(it.value > 0 ? 3 : 0, (it.value / max) * 100)}%`,
                  background: it.color ?? color ?? SERIES[0],
                  borderRadius: "4px 4px 0 0",
                }}
              />
            </div>
          );
        })}
      </div>
      {/* แกน x — เส้นบางเส้นเดียว ไม่ใช่กริดเต็มพื้น */}
      <div className="mt-1 h-px bg-line" />
      {/* ป้ายแกนทุกอันชนกันเมื่อแท่งเยอะ — เว้นให้เหลือราว 8 ป้าย แล้วปล่อยให้
          ตัวที่เหลือ "ล้น" ช่องของตัวเองได้ (เพื่อนบ้านเป็นสตริงว่าง ไม่มีอะไรให้ชน)
          ถ้า truncate ไว้ ป้ายอย่าง 05/07 จะโดนตัดเหลือ 05… ซึ่งอ่านไม่ได้ความ */}
      <div className="mt-1 flex gap-[2px]">
        {items.map((it, i) => (
          <span
            key={it.key}
            className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[10px] text-muted"
          >
            {items.length <= 10 || i % Math.ceil(items.length / 8) === 0 ? it.note ?? it.label : ""}
          </span>
        ))}
      </div>
      <TipBox tip={tip} />
    </div>
  );
}

/* ============================================================
   เส้น + พื้นที่ใต้เส้น — แนวโน้มตามเวลาของชุดเดียว

   ชุดเดียวจึงไม่มีกล่อง legend (หัวข้อการ์ดบอกอยู่แล้วว่าพล็อตอะไร) และ
   ไม่มีแกนที่สอง: สองหน่วยที่สเกลต่างกันต้องเป็นสองกราฟ ไม่ใช่สองแกน
   ============================================================ */

export function LineArea({
  items,
  color = SERIES[0],
  unit,
  height = 176,
}: {
  items: BarItem[];
  color?: string;
  unit?: (n: number) => string;
  height?: number;
}) {
  const t = useT();
  const [wrap, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const padL = 34;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const innerW = Math.max(10, w - padL - padR);
  const innerH = height - padT - padB;
  const count = Math.max(1, items.length);
  const max = Math.max(...items.map((i) => i.value), 1);
  // ปัดเพดานแกนขึ้นเป็นเลขกลม ๆ — แกนที่จบด้วย 37 อ่านยากกว่าที่จบด้วย 40
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;

  const x = (i: number) => padL + (count === 1 ? innerW / 2 : (i / (count - 1)) * innerW);
  const y = (v: number) => padT + innerH - (v / top) * innerH;

  const line = items.map((it, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(it.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(items.length - 1).toFixed(1)},${padT + innerH} L${x(0).toFixed(1)},${padT + innerH} Z`;
  const last = items.length - 1;
  const h = hover;

  // useCallback ต้องอยู่เหนือ early return — hook ที่ถูกข้ามเมื่อไม่มีข้อมูล
  // ทำให้ลำดับ hook ของ render นี้ไม่ตรงกับ render ก่อนหน้า แล้ว React พังทั้ง tree
  const pick = useCallback(
    (clientX: number, el: SVGSVGElement) => {
      const r = el.getBoundingClientRect();
      const rel = clientX - r.left - padL;
      const i = Math.round((rel / innerW) * (count - 1));
      setHover(Math.max(0, Math.min(count - 1, i)));
    },
    [innerW, count],
  );

  if (!items.length) return <Empty />;

  return (
    <div ref={wrap} className="relative">
      {w > 0 && (
        <svg
          width={w}
          height={height}
          onMouseMove={(e) => pick(e.clientX, e.currentTarget)}
          onMouseLeave={() => setHover(null)}
          role="img"
        >
          {/* กริดแนวนอนสามเส้น hairline — ถอยไปเป็นพื้นหลัง ไม่แข่งกับข้อมูล */}
          {/* เส้นกลางมีป้ายก็ต่อเมื่อค่ามันไม่ปัดไปชนกับบนหรือล่าง — ตอนเพดานเป็น 1
              แกนจะอ่านว่า "1 / 1 / 0" ซึ่งดูเหมือนกราฟเสียมากกว่าดูเหมือนสเกลเล็ก */}
          {[0, 0.5, 1].map((f) => {
            const v = Math.round(top * (1 - f));
            const dup = f === 0.5 && (v === top || v === 0);
            return (
              <g key={f}>
                <line
                  x1={padL}
                  x2={w - padR}
                  y1={padT + innerH * f}
                  y2={padT + innerH * f}
                  stroke="var(--color-line)"
                  strokeWidth={1}
                />
                {!dup && (
                  <text x={padL - 6} y={padT + innerH * f + 3} textAnchor="end" className="fill-muted text-[10px]">
                    {v}
                  </text>
                )}
              </g>
            );
          })}
          {/* พื้นที่ใต้เส้น = สีเดียวกันจาง ๆ ไม่ใช่บล็อกทึบ */}
          <path d={area} fill={color} opacity={0.12} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {/* จุดปลายเส้น มีวงแหวนสีพื้นให้เห็นชัดตอนทับเส้น */}
          <circle cx={x(last)} cy={y(items[last].value)} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />
          {h != null && (
            <g>
              <line x1={x(h)} x2={x(h)} y1={padT} y2={padT + innerH} stroke="var(--color-line)" strokeWidth={1} />
              <circle cx={x(h)} cy={y(items[h].value)} r={5} fill={color} stroke={SURFACE} strokeWidth={2} />
            </g>
          )}
          <text x={padL} y={height - 6} className="fill-muted text-[10px]">
            {items[0].note ?? items[0].label}
          </text>
          {items.length > 1 && (
            <text x={w - padR} y={height - 6} textAnchor="end" className="fill-muted text-[10px]">
              {items[last].note ?? items[last].label}
            </text>
          )}
        </svg>
      )}
      <TipBox
        tip={
          h == null
            ? null
            : {
                x: x(h),
                y: y(items[h].value),
                title: items[h].label,
                rows: [[unit ? unit(items[h].value) : t.dash.charts.people(items[h].value), ""]],
              }
        }
      />
    </div>
  );
}

/* ============================================================
   แถบสัดส่วน (part-to-whole) — แท่งเดียวแบ่งเป็นช่วง

   ใช้แทนกราฟวงกลม: วงกลมเทียบมุมด้วยตาไม่ได้ ส่วนแท่งเทียบความยาวได้
   ช่องว่าง 2px สีพื้นคั่นแต่ละช่วง — ไม่ตีเส้นขอบ เพราะเส้นขอบคือหมึกที่
   ไม่ใช่ข้อมูล
   ============================================================ */

export function ShareBar({ items, legend = true }: { items: BarItem[]; legend?: boolean }) {
  const t = useT();
  const [tip, setTip] = useState<Tip>(null);
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return <Empty />;

  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <div className="flex h-3.5 gap-[2px] overflow-hidden rounded-full">
        {items
          .filter((i) => i.value > 0)
          .map((it, i, arr) => (
            <span
              key={it.key}
              className="block h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(it.value / total) * 100}%`, background: it.color ?? SERIES[i % SERIES.length] }}
              onMouseMove={(e) => {
                const box = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                setTip({
                  x: e.clientX - box.left,
                  y: e.clientY - box.top - 8,
                  title: it.label,
                  rows: [
                    [t.dash.charts.people(it.value), ""],
                    [t.dash.insights.shareOfTotal, `${((it.value / total) * 100).toFixed(1)}%`],
                  ],
                });
              }}
              aria-label={`${it.label}: ${it.value}`}
              data-count={arr.length}
            />
          ))}
      </div>
      {legend && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {items.map((it, i) => (
            <li key={it.key} className="flex items-center gap-1.5 text-xs text-muted">
              <span
                className="h-2.5 w-2.5 flex-none rounded-full"
                style={{ background: it.color ?? SERIES[i % SERIES.length] }}
              />
              {it.label}
              <span className="font-medium tabular-nums text-ink">{it.value}</span>
            </li>
          ))}
        </ul>
      )}
      <TipBox tip={tip} />
    </div>
  );
}

/* ============================================================
   funnel — ขั้นบนเส้นทาง

   ใช้ไล่เฉดสีเดียว ไม่ใช่สีต่างกันรายฐาน เพราะลำดับของขั้นมีความหมาย
   (ฐาน 3 อยู่หลังฐาน 2 เสมอ) · สลับที่แล้วกราฟเปลี่ยนความหมาย = ordinal
   ============================================================ */

export function Funnel({ items, unit }: { items: BarItem[]; unit?: (n: number) => string }) {
  const t = useT();
  const [tip, setTip] = useState<Tip>(null);
  if (!items.length) return <Empty />;
  const first = items[0].value;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="relative space-y-1.5" onMouseLeave={() => setTip(null)}>
      {items.map((it, i) => {
        const keep = first > 0 ? (it.value / first) * 100 : 0;
        return (
          <div
            key={it.key}
            className="flex items-center gap-3"
            onMouseMove={(e) => {
              const box = e.currentTarget.parentElement!.getBoundingClientRect();
              const r = e.currentTarget.getBoundingClientRect();
              setTip({
                x: e.clientX - box.left,
                y: r.top - box.top,
                title: it.label,
                rows: [
                  [unit ? unit(it.value) : t.dash.charts.people(it.value), ""],
                  [t.dash.insights.reachedFromFirst, `${keep.toFixed(0)}%`],
                ],
              });
            }}
          >
            <span className="w-5 flex-none text-right text-[11px] tabular-nums text-muted">{i + 1}</span>
            <span className="w-24 flex-none truncate text-xs text-muted sm:w-36" title={it.label}>
              {it.label}
            </span>
            <span className="h-3 flex-1 overflow-hidden rounded-full bg-line/60">
              <span
                className="block h-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(it.value > 0 ? 2 : 0, (it.value / max) * 100)}%`,
                  background: RAMP[Math.min(RAMP.length - 1, Math.floor((i / Math.max(1, items.length - 1)) * (RAMP.length - 1)))],
                  borderRadius: "0 4px 4px 0",
                }}
              />
            </span>
            <span className="w-10 flex-none text-right text-xs font-medium tabular-nums text-ink">{it.value}</span>
          </div>
        );
      })}
      <TipBox tip={tip} />
    </div>
  );
}

/* ============================================================
   ตารางความร้อน — ช่องเล็ก ๆ จำนวนมาก (กลุ่ม 40 กลุ่ม)

   40 แท่งเรียงกันอ่านไม่ออกและกินพื้นที่ทั้งหน้า · ตารางช่องบอกภาพรวม
   "แน่นตรงไหน ว่างตรงไหน" ได้ในสายตาเดียว แล้วให้ tooltip เล่ารายละเอียด
   ============================================================ */

export function HeatGrid({
  cells,
}: {
  cells: { key: string; label: string; value: number; max: number; rows: [string, string][] }[];
}) {
  const [tip, setTip] = useState<Tip>(null);
  if (!cells.length) return <Empty />;

  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(30px,1fr))] gap-1.5">
        {cells.map((c) => {
          const f = c.max > 0 ? c.value / c.max : 0;
          // ว่างเปล่า = รางเปล่า ไม่ใช่เฉดอ่อนสุดของไล่สี — "ยังไม่มีใคร" กับ
          // "มีน้อย" เป็นคนละสถานะ และผู้จัดต้องแยกออกจากกันได้ทันที
          const bg = c.value === 0 ? "var(--color-line)" : RAMP[Math.min(RAMP.length - 1, Math.floor(f * (RAMP.length - 1)))];
          return (
            <span
              key={c.key}
              className="flex aspect-square items-center justify-center rounded-md text-[10px] font-medium tabular-nums transition-transform hover:scale-110"
              style={{ background: bg, color: c.value === 0 ? "var(--color-muted)" : "#0d1a13" }}
              onMouseMove={(e) => {
                const box = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                setTip({ x: e.clientX - box.left, y: e.clientY - box.top - 8, title: c.label, rows: c.rows });
              }}
            >
              {c.label.replace(/\D/g, "") || c.label}
            </span>
          );
        })}
      </div>
      <TipBox tip={tip} />
    </div>
  );
}

/* ============================================================
   แท่งกลุ่ม — เทียบหลายมิติของหมวดเดียวกัน (คะแนนความเห็นรายฐาน)

   สี่ชุดคือเพดานของรูปแบบนี้ และเพดานนั้นบังคับให้ต้องมี legend + ป้ายค่า
   ตรงตัว ไม่ใช่ให้จำสีเอา
   ============================================================ */

export function GroupedBars({
  rows,
  series,
  max,
  format,
}: {
  rows: { key: string; label: string; values: (number | null)[]; note?: string }[];
  series: string[];
  max: number;
  format: (v: number) => string;
}) {
  const [tip, setTip] = useState<Tip>(null);
  if (!rows.length) return <Empty />;

  return (
    <div className="relative" onMouseLeave={() => setTip(null)}>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {series.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: SERIES[i] }} />
            {s}
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="truncate text-xs text-muted" title={r.label}>
                {r.label}
              </span>
              {r.note && <span className="flex-none text-[11px] tabular-nums text-muted">{r.note}</span>}
            </div>
            <div className="space-y-[3px]">
              {r.values.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2"
                  onMouseMove={(e) => {
                    if (v == null) return;
                    const box = e.currentTarget.closest("[data-gb]")!.getBoundingClientRect();
                    setTip({
                      x: e.clientX - box.left,
                      y: e.clientY - box.top - 8,
                      title: r.label,
                      rows: [[series[i], format(v)]],
                    });
                  }}
                  data-gb=""
                >
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-line/60">
                    {v != null && (
                      <span
                        className="block h-full transition-[width] duration-500"
                        style={{ width: `${(v / max) * 100}%`, background: SERIES[i], borderRadius: "0 4px 4px 0" }}
                      />
                    )}
                  </span>
                  <span className="w-8 flex-none text-right text-[11px] tabular-nums text-ink">
                    {v == null ? "—" : format(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <TipBox tip={tip} />
    </div>
  );
}

/* ============================================================
   มาตรวัด — อัตราส่วนเดียวเทียบเพดาน (โควตา ความยินยอม ความครอบคลุม)
   ไม่ใช่กราฟวงกลมสองช่อง
   ============================================================ */

export function Meter({
  label,
  value,
  total,
  tone = "good",
  hint,
}: {
  label: string;
  value: number;
  total: number;
  tone?: keyof typeof STATUS;
  hint?: string;
}) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted">{label}</span>
        <span className="text-xs font-medium tabular-nums text-ink">
          {value}
          <span className="text-muted"> / {total}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line/60">
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: STATUS[tone], borderRadius: "0 4px 4px 0" }}
        />
      </div>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/* ---------- การ์ดตัวเลขขนาดเล็ก ---------- */

export function MiniStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof STATUS;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card px-4 py-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums" style={{ color: tone ? STATUS[tone] : "var(--color-ink)" }}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** ตัวเลขนำของทั้งหน้า — มีได้อันเดียวต่อหนึ่งหน้าจอ */
export function Hero({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-5xl font-bold tabular-nums leading-none text-ink">{value}</p>
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

/* ---------- ปุ่มสลับตาราง (ทางเลือกที่ไม่ต้องพึ่งสี) ---------- */

export function TableToggle({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] text-muted underline decoration-line underline-offset-2 transition-colors hover:text-forest"
      >
        {label}
      </button>
      {open && <div className="mt-3 overflow-x-auto">{children}</div>}
    </>
  );
}

/** ตารางตัวเลขแบบเรียบ — ช่องทางอ่านค่าที่ไม่ต้องมองสีหรือความยาวแท่ง */
export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead>
        <tr className="border-b border-line text-muted">
          {head.map((h, i) => (
            <th key={h} className={`py-1.5 pr-3 font-medium ${i > 0 ? "text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-ink">
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-line/50 last:border-0">
            {r.map((c, j) => (
              <td key={j} className={`py-1.5 pr-3 tabular-nums ${j > 0 ? "text-right" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
