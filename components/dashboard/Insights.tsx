"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAnalytics, type Analytics } from "@/lib/adminApi";
import { formatTs } from "@/lib/datetime";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { analyticsToRows } from "@/lib/analyticsCsv";
import { saveCSV } from "@/lib/csv";
import {
  BarsH,
  Columns,
  DataTable,
  Empty,
  Funnel,
  GroupedBars,
  HeatGrid,
  Hero,
  LineArea,
  Meter,
  MiniStat,
  Panel,
  RAMP,
  ShareBar,
  STATUS,
  SERIES,
  TableToggle,
  type BarItem,
} from "@/components/dashboard/viz";

/* ============================================================
   แท็บ "วิเคราะห์" — ทุกกราฟบนหน้านี้มาจากคำตอบก้อนเดียวของ
   GET /wbw/admin/analytics · ตั้งใจให้เป็นก้อนเดียว ไม่ใช่หลาย endpoint
   เพราะกราฟที่ดึงคนละรอบจะเป็นภาพของคนละนาที แล้วตัวเลขบนหน้าเดียวกัน
   จะไม่บวกกันโดยไม่มีใครหาสาเหตุเจอ

   หน้านี้ "อ่านอย่างเดียว" ทั้งหน้า — ไม่มีปุ่มที่แก้อะไรได้เลย การแก้ข้อมูล
   อยู่ในแท็บของมันเอง (ผู้เข้าร่วม/ฐาน/ประกาศ) ซึ่งเป็นที่ที่คนมองหาอยู่แล้ว
   ============================================================ */

/* ---------- ตัวช่วยเล็ก ๆ ---------- */

/** วินาที → ข้อความที่คนอ่านออก · null = ยังไม่มีเคสที่ถึงสถานะนั้น ไม่ใช่ศูนย์ */
function useDuration() {
  const { t } = useLang();
  return (sec: number | null) => {
    if (sec == null) return "—";
    const s = Math.round(sec);
    if (s < 90) return t.dash.insights.dur.sec(s);
    if (s < 5400) return t.dash.insights.dur.min(Math.round(s / 60));
    return t.dash.insights.dur.hr(Math.round((s / 3600) * 10) / 10);
  };
}

/** "2026-08-25 10:00" → ป้ายสั้นบนแกน (ชั่วโมง) และหัวข้อเต็มใน tooltip */
function hourLabels(bucket: string) {
  const [date, time] = bucket.split(" ");
  return { short: time ?? bucket, full: `${date?.slice(8, 10)}/${date?.slice(5, 7)} ${time ?? ""}`.trim() };
}

function dayLabel(day: string) {
  return `${day.slice(8, 10)}/${day.slice(5, 7)}`;
}

export function Insights({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const { t, lang } = useLang();
  const dur = useDuration();
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    getAnalytics(token)
      .then(setData)
      .catch((e: Error) => {
        if (e.message === "unauthorized") onUnauthorized();
        else setError(e.message === "forbidden" ? t.dash.login.forbidden : e.message);
      })
      .finally(() => setLoading(false));
  }, [token, onUnauthorized, t]);

  useEffect(() => {
    load();
  }, [load]);

  /* ชื่อฐาน/ชื่อหมวดตามภาษาที่เลือก — ทำที่เดียวแล้วส่งต่อเป็น label ให้ทุกกราฟ */
  const baseName = useCallback(
    (name: string, nameEn: string | null) => (lang === "en" && nameEn ? nameEn : name),
    [lang],
  );

  const reg = useMemo<BarItem[]>(
    () => (data?.registration ?? []).map((d) => ({ key: d.day, label: d.day, value: d.count, note: dayLabel(d.day) })),
    [data],
  );
  const regCum = useMemo<BarItem[]>(
    () => (data?.registration ?? []).map((d) => ({ key: d.day, label: d.day, value: d.cumulative, note: dayLabel(d.day) })),
    [data],
  );

  if (loading && !data) return <p className="py-16 text-center text-sm text-muted">{t.dash.common.loading}</p>;
  if (error && !data) return <p className="py-16 text-center text-sm text-danger">{error}</p>;
  if (!data) return null;

  const { capacity, demographics: dem, groups, checkins, sos, feedback, staff, notifications: noti } = data;

  /* ชื่อช่วง "ฐานต้นทาง → ฐานปลายทาง" ตามภาษาที่เลือก */
  const legName = (l: Analytics["checkins"]["pace"][number]) =>
    `${baseName(l.from_name, l.from_name_en)} → ${baseName(l.to_name, l.to_name_en)}`;

  /* ช่วงที่เร็วที่สุด/ช้าที่สุด — เทียบเฉพาะช่วงที่มีค่ากลางจริง
     ช่วงที่ median เป็น null ไม่ใช่ "ศูนย์วินาที" มันคือช่วงที่ยังไม่มีใครเดิน */
  const timed = checkins.pace.filter((l) => l.median_sec != null);
  const fastestLeg = timed.length ? timed.reduce((a, b) => (b.median_sec! < a.median_sec! ? b : a)) : null;
  const slowestLeg = timed.length ? timed.reduce((a, b) => (b.median_sec! > a.median_sec! ? b : a)) : null;

  return (
    <div className="space-y-9">
      {/* ---------- หัวแท็บ ---------- */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-forestdeep">{t.dash.insights.heading}</h2>
          <p className="mt-0.5 text-sm text-muted">{t.dash.insights.sub}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted">
            {t.dash.insights.updated(formatTs(data.generated_at, t.dash.locale, { hour: "2-digit", minute: "2-digit" }))}
          </span>
          {/* ประกอบไฟล์จากก้อนที่หน้านี้ถืออยู่แล้ว ไม่ยิงถาม backend ซ้ำ —
              ไฟล์จะได้ตรงกับตัวเลขที่คนกดปุ่มเห็นอยู่บนจอเป๊ะ ๆ ไม่ใช่ภาพของ
              อีกวินาทีหนึ่งที่ต่างออกไป */}
          <ExportButton
            label={t.dash.export.stats}
            onExport={async () =>
              saveCSV(
                `wbw-insights-${data.generated_at.slice(0, 10)}.csv`,
                [t.dash.export.colSection, t.dash.export.colLabel, t.dash.export.colMetric, t.dash.export.colValue],
                analyticsToRows(data),
              )
            }
          />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-forest/40 hover:text-forest disabled:opacity-60"
          >
            {loading ? t.dash.overview.refreshing : t.dash.overview.refresh}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}

      {/* ---------- ตัวเลขนำ + การ์ดสรุป ----------
          Hero มีอันเดียวทั้งหน้าโดยตั้งใจ: ถ้าทุกตัวเลขใหญ่เท่ากันหมด
          แปลว่าไม่มีตัวไหนสำคัญ และสายตาไม่รู้จะเริ่มตรงไหน */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)]">
        <div className="rounded-[20px] border border-line bg-card p-5">
          <Hero
            value={capacity.taken.toLocaleString(t.dash.locale)}
            label={t.dash.insights.seatsTaken}
            sub={t.dash.insights.seatsSub(capacity.seats_left, capacity.max)}
          />
          <div className="mt-4">
            <Meter
              label={t.dash.charts.quota}
              value={capacity.taken}
              total={capacity.max}
              tone={capacity.seats_left === 0 ? "critical" : capacity.taken / Math.max(1, capacity.max) > 0.9 ? "warning" : "good"}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MiniStat label={t.dash.insights.arrived} value={capacity.checked_in} hint={t.dash.insights.arrivedSub} />
          <MiniStat label={t.dash.insights.onRoute} value={checkins.walkers} hint={t.dash.insights.onRouteSub} />
          <MiniStat
            label={t.dash.overview.openSOS}
            value={sos.open}
            tone={sos.open_unacked > 0 ? "critical" : sos.open > 0 ? "warning" : "good"}
            hint={sos.open === 0 ? t.dash.insights.openSOSNone : t.dash.insights.openSOSUnacked(sos.open_unacked)}
          />
          <MiniStat
            label={t.dash.insights.avgRating}
            value={feedback.avg_overall == null ? "—" : feedback.avg_overall.toFixed(2)}
            hint={t.dash.insights.answers(feedback.responses)}
          />
        </div>
      </div>

      {/* ============ การสมัคร ============ */}
      <Section title={t.dash.insights.secRegistration}>
        <Panel title={t.dash.insights.regDaily} sub={t.dash.insights.regDailySub}>
          <Columns items={reg} />
          <div className="mt-3">
            <TableToggle label={t.dash.insights.showTable}>
              <DataTable
                head={[t.dash.insights.colCategory, t.dash.insights.colCount]}
                rows={(data.registration ?? []).map((d) => [d.day, d.count])}
              />
            </TableToggle>
          </div>
        </Panel>
        {/* คนละการ์ดกับแท่งรายวันโดยตั้งใจ — ยอดรายวันกับยอดสะสมคนละสเกล
            การเอามาซ้อนกันบนสองแกนคือกราฟที่อ่านผิดได้ง่ายที่สุดที่มี */}
        <Panel title={t.dash.insights.regCumulative} sub={t.dash.insights.regCumulativeSub(capacity.max)}>
          <LineArea items={regCum} />
        </Panel>
      </Section>

      {/* ============ เส้นทาง ============ */}
      <Section title={t.dash.insights.secRoute}>
        <Panel title={t.dash.insights.funnel} sub={t.dash.insights.funnelSub}>
          <Funnel
            items={checkins.funnel.map((f) => ({
              key: String(f.checkpoint_id),
              label: baseName(f.name, f.name_en),
              value: f.count,
            }))}
          />
        </Panel>
        <Panel title={t.dash.insights.completion} sub={t.dash.insights.completionSub}>
          <Columns
            items={checkins.completion.map((c) => ({
              key: String(c.bases_done),
              label: t.dash.insights.basesDone(c.bases_done),
              value: c.participants,
              note: String(c.bases_done),
              // ไล่เฉดตามจำนวนฐาน ไม่ใช่ตามความสูง — แกนนี้เป็นลำดับ
              color: RAMP[Math.min(RAMP.length - 1, c.bases_done)],
            }))}
          />
        </Panel>
        {/* กินสองคอลัมน์ — ชื่อช่วงเป็น "ฐาน A → ฐาน B" ซึ่งยาวเป็นสองเท่าของชื่อฐานเดี่ยว
            บีบลงครึ่งการ์ดแล้วโดนตัดจนอ่านไม่ออกว่าเป็นช่วงไหน */}
        <Panel title={t.dash.insights.pace} sub={t.dash.insights.paceSub} className="lg:col-span-2">
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              label={t.dash.insights.totalMedian}
              value={dur(checkins.total_median_sec)}
              hint={t.dash.insights.totalSub}
            />
            <MiniStat label={t.dash.insights.totalP90} value={dur(checkins.total_p90_sec)} hint={t.dash.insights.totalSub} />
            <MiniStat
              label={t.dash.insights.legFastest}
              value={fastestLeg ? dur(fastestLeg.median_sec) : "—"}
              hint={fastestLeg ? legName(fastestLeg) : undefined}
              tone="good"
            />
            <MiniStat
              label={t.dash.insights.legSlowest}
              value={slowestLeg ? dur(slowestLeg.median_sec) : "—"}
              hint={slowestLeg ? legName(slowestLeg) : undefined}
              tone="warning"
            />
          </div>
          {checkins.pace.length ? (
            <BarsH
              wide
              format={(v) => dur(v)}
              items={checkins.pace.map((l, i) => ({
                key: `${l.from_id}-${l.to_id}`,
                label: legName(l),
                // ไล่เฉดตามตำแหน่งบนเส้นทาง ไม่ใช่ตามความช้า — ความยาวแท่งบอกความช้าอยู่แล้ว
                color: RAMP[Math.min(RAMP.length - 1, Math.floor((i / Math.max(1, checkins.pace.length - 1)) * (RAMP.length - 1)))],
                value: l.median_sec ?? 0,
                rows: [
                  [t.dash.insights.legP90, dur(l.p90_sec)],
                  [t.dash.insights.legFastestOne, dur(l.fastest_sec)],
                  [t.dash.insights.legSlowestOne, dur(l.slowest_sec)],
                  // จำนวนคนอยู่คู่กับเวลาเสมอ — ค่ากลางที่มาจากสองคนไม่ได้แปลว่าอะไร
                  // และคนอ่านต้องเห็นตัวเลขนั้นพร้อมกัน ไม่ใช่ต้องไปหาที่อื่น
                  [t.dash.insights.legWalkers, String(l.walkers)],
                ] as [string, string][],
              }))}
            />
          ) : (
            <Empty text={t.dash.insights.paceEmpty} />
          )}
        </Panel>

        <Panel title={t.dash.insights.checkinTimeline} sub={t.dash.insights.checkinTimelineSub}>
          <LineArea
            items={checkins.timeline.map((b) => {
              const l = hourLabels(b.bucket);
              return { key: b.bucket, label: l.full, value: b.count, note: l.short };
            })}
            unit={t.dash.insights.times}
          />
        </Panel>
        <Panel title={t.dash.insights.byStaff}>
          {checkins.by_staff.length ? (
            <BarsH
              items={checkins.by_staff.map((c) => ({ key: c.key, label: c.key, value: c.count }))}
              unit={t.dash.insights.times}
            />
          ) : (
            <Empty text={t.dash.insights.byStaffEmpty} />
          )}
        </Panel>
      </Section>

      {/* ============ เหตุฉุกเฉิน ============ */}
      <Section title={t.dash.insights.secSOS}>
        <Panel title={t.dash.insights.sosResponse} sub={t.dash.insights.sosResponseSub} className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label={t.dash.insights.ackMedian} value={dur(sos.ack_median_sec)} />
            <MiniStat label={t.dash.insights.ackP90} value={dur(sos.ack_p90_sec)} />
            <MiniStat label={t.dash.insights.resolveMedian} value={dur(sos.resolve_median_sec)} />
            <MiniStat label={t.dash.insights.resolveP90} value={dur(sos.resolve_p90_sec)} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Meter label={t.dash.insights.sosEscalated} value={sos.escalated} total={sos.total || 1} tone="serious" />
            <Meter label={t.dash.overview.openSOS} value={sos.open} total={sos.total || 1} tone={sos.open ? "critical" : "good"} />
            <Meter label={t.dash.insights.sosWithGPS} value={sos.with_gps} total={sos.total || 1} tone="good" />
            <Meter label={t.dash.insights.sosForOther} value={sos.for_other} total={sos.total || 1} tone="neutral" />
          </div>
        </Panel>

        <Panel title={t.dash.insights.sosSeverity} sub={t.dash.insights.sosSeveritySub}>
          {sos.total ? (
            <BarsH
              items={orderSeverity(sos.by_severity).map((c) => ({
                key: c.key || "unassessed",
                label: t.dash.insights.sev[c.key] ?? c.key,
                value: c.count,
                // สีสถานะ มีข้อความกำกับทุกแท่งอยู่แล้ว ไม่ได้สื่อด้วยสีอย่างเดียว
                color: SEVERITY_TONE[c.key] ?? STATUS.neutral,
              }))}
              total={sos.total}
              unit={t.dash.insights.cases}
            />
          ) : (
            <Empty text={t.dash.insights.sosNone} />
          )}
        </Panel>

        <Panel title={t.dash.insights.sosByBase} sub={t.dash.insights.sosByBaseSub}>
          <BarsH
            items={sos.by_base.map((c) => ({
              key: c.key || "none",
              label: c.key || t.dash.insights.noBase,
              value: c.count,
            }))}
            total={sos.total}
            unit={t.dash.insights.cases}
          />
        </Panel>

        <Panel title={t.dash.insights.sosTimeline}>
          <LineArea
            items={sos.timeline.map((b) => {
              const l = hourLabels(b.bucket);
              return { key: b.bucket, label: l.full, value: b.count, note: l.short };
            })}
            color={STATUS.critical}
            unit={t.dash.insights.cases}
          />
        </Panel>

        <Panel title={t.dash.insights.sosReason}>
          <BarsH
            items={sos.by_reason.map((c) => ({
              key: c.key || "none",
              // ค่าใน resolve_reason เป็นคีย์ของ backend ไม่ใช่ข้อความสำหรับคนอ่าน
              // ค่าที่ยังไม่มีคำแปลแสดงดิบไปก่อน ดีกว่าซ่อนแถวนั้นทิ้ง
              label: c.key ? (t.dash.insights.reason[c.key] ?? c.key) : t.dash.insights.noReason,
              value: c.count,
            }))}
            total={sos.resolved}
            unit={t.dash.insights.cases}
          />
        </Panel>
      </Section>

      {/* ============ ความเห็นต่อฐาน ============ */}
      <Section title={t.dash.insights.secFeedback}>
        <Panel title={t.dash.insights.fbByBase} sub={t.dash.insights.fbByBaseSub} className="lg:col-span-2">
          {feedback.responses ? (
            <GroupedBars
              series={[
                t.dash.insights.dimOverall,
                t.dash.insights.dimScenery,
                t.dash.insights.dimActivity,
                t.dash.insights.dimStaff,
              ]}
              max={5}
              format={(v) => v.toFixed(1)}
              rows={feedback.by_checkpoint.map((b) => ({
                key: String(b.checkpoint_id),
                label: baseName(b.name, b.name_en),
                note: t.dash.insights.answers(b.responses),
                values: [b.avg_overall, b.avg_scenery, b.avg_activity, b.avg_staff],
              }))}
            />
          ) : (
            <Empty text={t.dash.insights.fbNone} />
          )}
        </Panel>

        <Panel title={t.dash.insights.fbDistribution}>
          {feedback.responses ? (
            <BarsH
              items={feedback.distribution.map((n, i) => ({
                key: String(i + 1),
                label: t.dash.insights.stars(i + 1),
                value: n,
                // 1→5 ดาวคือลำดับ ไม่ใช่หมวดที่สลับที่ได้ จึงไล่เฉดสีเดียว
                color: RAMP[Math.min(RAMP.length - 1, i + 1)],
              }))}
              total={feedback.responses}
              unit={t.dash.insights.answers}
            />
          ) : (
            <Empty text={t.dash.insights.fbNone} />
          )}
        </Panel>

        <Panel title={t.dash.insights.fbRecent}>
          {feedback.recent.length ? (
            <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {feedback.recent.map((r, i) => (
                <li key={i} className="border-b border-line/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-medium text-ink">{r.checkpoint_name}</span>
                    <span className="flex-none text-[11px] tabular-nums text-muted">
                      {t.dash.insights.stars(r.rating)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{r.comment}</p>
                  <p className="mt-1 text-[10px] text-muted/70">
                    {formatTs(r.created_at, t.dash.locale)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={t.dash.insights.fbNone} />
          )}
        </Panel>
      </Section>

      {/* ============ กลุ่ม ============ */}
      <Section title={t.dash.insights.secGroups}>
        <Panel title={t.dash.insights.groupFill} sub={t.dash.insights.groupFillSub} className="lg:col-span-2">
          <HeatGrid
            cells={groups.items.map((g) => ({
              key: String(g.group_id),
              label: String(g.group_number),
              value: g.member_count,
              max: g.capacity,
              rows: [
                [t.dash.common.group(g.group_number), ""],
                [t.dash.insights.groupMembers, `${g.member_count} / ${g.capacity}`],
                [t.dash.insights.groupStaffCount, String(g.staff_count)],
              ],
            }))}
          />
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Meter label={t.dash.insights.groupFull} value={groups.full} total={groups.total} tone="warning" />
            <Meter label={t.dash.insights.groupEmpty} value={groups.empty} total={groups.total} tone="neutral" />
            <Meter
              label={t.dash.insights.groupsWithStaff}
              value={staff.groups_with_staff}
              total={staff.groups_total}
              tone={staff.groups_with_staff < staff.groups_total ? "warning" : "good"}
            />
            <Meter
              label={t.dash.insights.groupUnassigned}
              value={groups.unassigned}
              total={groups.assigned + groups.unassigned || 1}
              tone={groups.unassigned ? "serious" : "good"}
            />
          </div>
        </Panel>
      </Section>

      {/* ============ ผู้เข้าร่วมเป็นใคร ============ */}
      <Section title={t.dash.insights.secPeople}>
        <Panel title={t.dash.insights.sexSplit}>
          <ShareBar
            items={dem.sex.map((c, i) => ({
              key: c.key || "unspecified",
              label: sexLabel(c.key, t),
              value: c.count,
              color: SERIES[i % SERIES.length],
            }))}
          />
        </Panel>
        <Panel title={t.dash.insights.yearSplit}>
          <Columns
            items={dem.year.map((c) => ({
              key: c.key || "unknown",
              label: c.key ? t.dash.insights.yearLabel(c.key) : t.dash.insights.unknown,
              value: c.count,
              note: c.key || "—",
              color: RAMP[Math.min(RAMP.length - 1, Number(c.key) || 0)],
            }))}
          />
        </Panel>
        <Panel title={t.dash.insights.bloodSplit} sub={t.dash.insights.bloodSub}>
          <BarsH
            items={dem.blood.map((c) => ({
              key: c.key || "unknown",
              label: c.key || t.dash.insights.unknown,
              value: c.count,
              color: c.key ? SERIES[0] : STATUS.neutral,
            }))}
            total={dem.profiled}
          />
        </Panel>
        <Panel title={t.dash.insights.schoolSplit} sub={`${t.dash.insights.schoolSubHead} · ${t.dash.insights.schoolSubDone}`}>
          <SchoolBars rows={dem.school} headLabel={t.dash.insights.schoolSubHead} doneLabel={t.dash.insights.schoolSubDone} />
        </Panel>
      </Section>

      {/* ============ ความพร้อม ============ */}
      <Section title={t.dash.insights.secReadiness}>
        <Panel title={t.dash.insights.staffCoverage}>
          <div className="space-y-3.5">
            <Meter
              label={t.dash.insights.basesWithStaff}
              value={staff.bases_with_staff}
              total={staff.bases_total || 1}
              tone={staff.bases_with_staff < staff.bases_total ? "serious" : "good"}
            />
            <Meter
              label={t.dash.insights.groupsWithStaff}
              value={staff.groups_with_staff}
              total={staff.groups_total || 1}
              tone={staff.groups_with_staff < staff.groups_total ? "warning" : "good"}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <MiniStat label={t.dash.tabs.users} value={staff.total} />
            <MiniStat label={t.dash.insights.staffPending} value={staff.pending} tone={staff.pending ? "warning" : undefined} />
            <MiniStat label={t.dash.insights.admins} value={staff.admins} />
          </div>
        </Panel>

        <Panel title={t.dash.insights.staffRoles} sub={t.dash.insights.staffRolesSub}>
          {staff.by_role.length ? (
            <BarsH
              items={staff.by_role.map((c) => ({
                key: c.key,
                label: t.staffAuth.register.roles[c.key] ?? c.key,
                value: c.count,
              }))}
            />
          ) : (
            <Empty />
          )}
        </Panel>
      </Section>

      {/* ============ ประกาศ ============ */}
      <Section title={t.dash.insights.secAnnounce}>
        <Panel title={t.dash.insights.notiByLevel}>
          <BarsH
            items={noti.by_level.map((c) => ({
              key: c.key,
              label: t.dash.insights.lvl[c.key] ?? c.key,
              value: c.count,
              color: LEVEL_TONE[c.key] ?? STATUS.neutral,
            }))}
            total={noti.total}
            unit={t.dash.insights.times}
          />
        </Panel>
        <Panel title={t.dash.insights.notiByAudience}>
          <BarsH
            items={noti.by_audience.map((c) => ({
              key: c.key,
              label: t.dash.insights.aud[c.key] ?? c.key,
              value: c.count,
            }))}
            total={noti.total}
            unit={t.dash.insights.times}
          />
        </Panel>
        <Panel title={t.dash.insights.notiReadRate} sub={t.dash.insights.notiReadSub}>
          <Meter
            label={t.dash.insights.notiReadRate}
            value={noti.read}
            total={noti.delivered || 1}
            tone={noti.delivered && noti.read / noti.delivered < 0.5 ? "warning" : "good"}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <MiniStat label={t.dash.tabs.announce} value={noti.total} />
            <MiniStat label={t.dash.insights.notiActive} value={noti.active} />
          </div>
        </Panel>
        <Panel title={t.dash.insights.notiTimeline}>
          <Columns
            items={noti.timeline.map((b) => ({
              key: b.bucket,
              label: b.bucket,
              value: b.count,
              note: dayLabel(b.bucket),
            }))}
            unit={t.dash.insights.times}
          />
        </Panel>
      </Section>
    </div>
  );
}

/* ---------- ส่วนย่อย ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 text-base font-semibold text-forestdeep">{title}</h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}

/** ยอดสมัครต่อสำนักวิชา โดยที่ "มาถึงแล้ว" เป็นส่วนหนึ่งของยอดนั้น ไม่ใช่ค่าคู่ขนาน
 *  จึงวาดเป็นแท่งซ้อนในแท่งเดียวกัน (สองเฉดของสีเดียว) ไม่ใช่สองแท่งคนละสี —
 *  สองแท่งคนละสีจะอ่านเป็น "สองกลุ่มคน" ทั้งที่กลุ่มหนึ่งอยู่ในอีกกลุ่ม */
function SchoolBars({
  rows,
  headLabel,
  doneLabel,
}: {
  rows: { school_id: number | null; name: string; count: number; checked_in: number }[];
  headLabel: string;
  doneLabel: string;
}) {
  const { t } = useLang();
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((r) => r.count), 1);

  return (
    <div>
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        <li className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: RAMP[4] }} />
          {headLabel}
        </li>
        <li className="flex items-center gap-1.5 text-xs text-muted">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: RAMP[1] }} />
          {doneLabel}
        </li>
      </ul>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.school_id ?? "none"} className="flex items-center gap-3">
            <span className="w-28 flex-none truncate text-xs text-muted sm:w-44" title={r.name || t.dash.insights.unknown}>
              {r.name || t.dash.insights.unknown}
            </span>
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-line/60">
              <span
                className="absolute inset-y-0 left-0 transition-[width] duration-500"
                style={{ width: `${(r.count / max) * 100}%`, background: RAMP[4], borderRadius: "0 4px 4px 0" }}
              />
              {r.checked_in > 0 && (
                <span
                  className="absolute inset-y-0 left-0 transition-[width] duration-500"
                  style={{ width: `${(r.checked_in / max) * 100}%`, background: RAMP[1], borderRadius: "0 4px 4px 0" }}
                />
              )}
            </span>
            <span className="w-16 flex-none text-right text-xs tabular-nums text-ink">
              {r.checked_in}
              <span className="text-muted">/{r.count}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- ค่าคงที่ของหมวด ---------- */

/** ระดับความรุนแรงมีลำดับในตัวเอง — เรียงตามลำดับนั้นเสมอ ไม่ใช่เรียงตามจำนวน
 *  กราฟที่สลับลำดับตามข้อมูลทำให้เทียบสองช่วงเวลาไม่ได้ */
const SEVERITY_ORDER = ["", "minor", "major", "urgent"];
const SEVERITY_TONE: Record<string, string> = {
  "": STATUS.neutral,
  minor: STATUS.good,
  major: STATUS.serious,
  urgent: STATUS.critical,
};
const LEVEL_TONE: Record<string, string> = {
  info: STATUS.good,
  warning: STATUS.warning,
  emergency: STATUS.critical,
};

function orderSeverity(list: { key: string; count: number }[]) {
  return [...list].sort((a, b) => SEVERITY_ORDER.indexOf(a.key) - SEVERITY_ORDER.indexOf(b.key));
}

function sexLabel(key: string, t: ReturnType<typeof useLang>["t"]) {
  if (key === "male") return t.dash.participants.male;
  if (key === "female") return t.dash.participants.female;
  return t.dash.participants.unspecified;
}
