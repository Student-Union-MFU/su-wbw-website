"use client";

import ForestScene from "@/components/ForestScene";
import { useEffect, useMemo, useState } from "react";
import { GhostButton, PhotoPicker, PrimaryButton, SelectField, Stepper, TextField } from "@/components/register/ui";
import SiteFooter from "@/components/register/SiteFooter";
import { ApologyPopup, DiseaseCheck, useChronic } from "@/components/register/disease";
import { SCHOOL_BY_CODE, MAJORS_BY_SCHOOL, SCHOOLS, SCHOOLS_BY_NAME } from "@/components/register/mfu-data";
import { headingFont, useLang, useT } from "@/lib/i18n/LanguageProvider";
import { dayForStep } from "@/lib/dayCycle";
import { apiUrl } from "@/lib/apiBase";
import { PHONE_RE, STUDENT_ID_RE, digitsOnly } from "@/lib/validation";

/**
 * ฉาก 3D โหลดฝั่ง client เท่านั้น — three.js/drei ห้ามหลุดเข้า server bundle
 * (เหมือนที่หน้า landing ทำกับ TrailScene)
 */

// ข้อมูลฟอร์มทั้งหมด (ค่อยเติมทีละ step)
type FormData = {
  photo: string | null;
  firstName: string;
  lastName: string;
  studentId: string;
  password: string;
  confirmPassword: string;
  sex: string;
  phone: string;
  schoolId: string;
  major: string;
  diseases: string[];
  // step 3 medical
  birthdate: string;
  weightKg: string;
  heightCm: string;
  bloodType: string;
  // step 4 เบอร์โทรฉุกเฉิน
  emergencyPhone: string;
  emergencyName: string;
  // step 5 ยินยอม
  consentHealth: boolean;
  consentEmergency: boolean;
  consentWaiver: boolean;
};

const EMPTY: FormData = {
  photo: null,
  firstName: "",
  lastName: "",
  studentId: "",
  password: "",
  confirmPassword: "",
  sex: "",
  phone: "",
  schoolId: "",
  major: "",
  diseases: [],
  birthdate: "",
  weightKg: "",
  heightCm: "",
  bloodType: "",
  emergencyPhone: "",
  emergencyName: "",
  consentHealth: false,
  consentEmergency: false,
  consentWaiver: false,
};

export default function RegisterPage() {
  const t = useT();
  const STEPS = t.page.steps;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showApology, setShowApology] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof FormData) => (v: string | null) =>
    setData((d) => ({ ...d, [k]: v }));

  // รหัสนักศึกษา → auto เลือกสำนักวิชา (หลัก 4-5 = รหัสสำนัก) · เปลี่ยนเองได้
  function onStudentId(v: string) {
    const sid = digitsOnly(v);
    setData((d) => {
      const next: FormData = { ...d, studentId: sid };
      if (sid.length >= 5) {
        const name = SCHOOL_BY_CODE[sid.slice(3, 5)];
        const school = name ? SCHOOLS.find((s) => s.name === name) : undefined;
        if (school && String(school.school_id) !== d.schoolId) {
          next.schoolId = String(school.school_id);
          next.major = ""; // สำนักเปลี่ยน → รีเซ็ตสาขา
        }
      }
      return next;
    });
  }
  // เปลี่ยนสำนักเอง → รีเซ็ตสาขา
  const onSchool = (v: string | null) =>
    setData((d) => ({ ...d, schoolId: v ?? "", major: "" }));

  // เลือก/ยกเลิกโรค — ถ้าเลือกเพิ่ม ให้เด้ง popup ทันที
  function toggleDisease(v: string) {
    setData((d) => {
      const has = d.diseases.includes(v);
      if (!has) setShowApology(true);
      return { ...d, diseases: has ? d.diseases.filter((x) => x !== v) : [...d.diseases, v] };
    });
  }

  function toggleConsent(k: "consentHealth" | "consentEmergency" | "consentWaiver") {
    setData((d) => ({ ...d, [k]: !d[k] }));
  }

  const hasDisease = data.diseases.length > 0;
  const isLast = step === STEPS.length - 1;
  // มีปุ่มถัดไปเสมอ ยกเว้น step โรคประจำตัว (index 1) ที่เลือกโรคไว้
  const canNext = !(step === 1 && hasDisease);

  const schoolOptions = useMemo(
    () => SCHOOLS_BY_NAME.map((s) => ({ value: String(s.school_id), label: s.name })),
    [],
  );

  const schoolName = useMemo(
    () => SCHOOLS.find((s) => String(s.school_id) === data.schoolId)?.name ?? "",
    [data.schoolId],
  );
  const majorOptions = useMemo(
    () => (MAJORS_BY_SCHOOL[schoolName] ?? []).map((m) => ({ value: m, label: m })),
    [schoolName],
  );

  function validateStep1() {
    const e: Record<string, string> = {};
    if (!data.firstName.trim()) e.firstName = t.step1.errors.firstName;
    if (!data.lastName.trim()) e.lastName = t.step1.errors.lastName;
    if (!STUDENT_ID_RE.test(data.studentId)) e.studentId = t.step1.errors.studentId;
    if (data.password.length < 8) e.password = t.step1.errors.password;
    if (data.confirmPassword !== data.password) e.confirmPassword = t.step1.errors.confirmPassword;
    if (!data.sex) e.sex = t.step1.errors.sex;
    // เบอร์โทรไม่บังคับ (ตามฟอร์มเดิม) — กรอกแล้วค่อยเช็ครูปแบบ
    if (data.phone && !PHONE_RE.test(data.phone)) e.phone = t.step1.errors.phone;
    if (!data.schoolId) e.schoolId = t.step1.errors.school;
    if (data.schoolId && majorOptions.length > 0 && !data.major) e.major = t.step1.errors.major;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3() {
    const e: Record<string, string> = {};
    if (!data.birthdate) e.birthdate = t.step3.errors.birthdate;
    else if (data.birthdate > new Date().toISOString().slice(0, 10))
      e.birthdate = t.step3.errors.birthdateFuture;

    const w = Number(data.weightKg);
    if (!data.weightKg) e.weightKg = t.step3.errors.weight;
    else if (!(w >= 20 && w <= 200)) e.weightKg = t.step3.errors.weightRange;

    const h = Number(data.heightCm);
    if (!data.heightCm) e.heightCm = t.step3.errors.height;
    else if (!(h >= 100 && h <= 220)) e.heightCm = t.step3.errors.heightRange;

    if (!data.bloodType) e.bloodType = t.step3.errors.bloodType;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep4() {
    const e: Record<string, string> = {};
    // ผู้ติดต่อฉุกเฉินบังคับทั้งชื่อและเบอร์ — ต้องมีคนที่ติดต่อได้จริงตอนฉุกเฉิน
    // เบอร์ตัวเองใช้ไม่ได้ — ต้องเป็นเบอร์ของบุคคลอื่น
    if (!data.emergencyName.trim()) e.emergencyName = t.step4.errors.nameRequired;
    if (!data.emergencyPhone) e.emergencyPhone = t.step4.errors.phoneRequired;
    else if (!PHONE_RE.test(data.emergencyPhone))
      e.emergencyPhone = t.step4.errors.phone;
    else if (data.emergencyPhone === data.phone)
      e.emergencyPhone = t.step4.errors.samePhone;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep5() {
    const e: Record<string, string> = {};
    // ฟอร์มเดิมบังคับเฉพาะ waiver — PDPA สองข้อเป็นทางเลือก
    if (!data.consentWaiver) e.consent = t.step5.error;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validateStep5()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = {
        student_id: data.studentId,
        password: data.password,
        profile: {
          first_name: data.firstName,
          last_name: data.lastName,
          contact_phone: data.phone || undefined,
          school_id: Number(data.schoolId),
          major: data.major || undefined,
          sex: data.sex,
          photo_url: data.photo || undefined,
          emergency_contact_name: data.emergencyName || undefined,
          emergency_contact_phone: data.emergencyPhone || undefined,
        },
        medical: {
          birthdate: data.birthdate,
          weight_kg: Number(data.weightKg),
          height_cm: Number(data.heightCm),
          blood_type: data.bloodType,
        },
        health: { chronic_conditions: data.diseases },
        consent: {
          consent_health_data: data.consentHealth,
          consent_emergency_treatment: data.consentEmergency,
          waiver_accepted: data.consentWaiver,
        },
      };
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t.page.submitFailed);
      }
      setDone(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t.page.submitFailed);
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (step === 0 && !validateStep1()) return;
    if (step === 2 && !validateStep3()) return;
    if (step === 3 && !validateStep4()) return;
    if (isLast) {
      submit();
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setErrors({});
    setSubmitError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  // หน้าสำเร็จ
  if (done) return <SuccessScreen name={data.firstName} studentId={data.studentId} />;

  return (
    <>
      {/* ฉากป่าเดียวกับหน้า landing — ยืนอยู่กับที่ · แสงและต้นไม้เดินตาม step */}
      <ForestScene day={dayForStep(step, STEPS.length)} plantStep={step} />

      {/* ฟอร์มชิดขวา เว้นครึ่งซ้ายไว้ให้เห็นต้นไม้ที่กำลังโต */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <main
          id="register"
          className="flex flex-1 justify-center px-4 pb-20 pt-24 sm:pt-28 lg:justify-end lg:px-[5vw]"
        >
        <div className="on-dark w-full max-w-xl lg:max-w-[31rem]">
          <PageHeader />

          {/* การ์ดฟอร์ม — กระจกเข้มทับฉาก */}
          <div className="rounded-[26px] border border-cream/15 bg-ink/82 p-6 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:p-8">
            <div className="mb-3">
            <Stepper current={step} steps={STEPS} />
          </div>

          {/* ระยะการเติบโตของต้นไม้ข้าง ๆ — ผูกกับ step ตรง ๆ */}
          <p className="mb-7 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.28em] text-goldsoft">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {t.page.growth[Math.min(step, t.page.growth.length - 1)]}
          </p>

          {step === 0 && (
            <Step1
              data={data}
              errors={errors}
              set={set}
              schoolOptions={schoolOptions}
              majorOptions={majorOptions}
              onStudentId={onStudentId}
              onSchool={onSchool}
            />
          )}
          {step === 1 && <Step2 selected={data.diseases} onToggle={toggleDisease} />}
          {step === 2 && <Step3 data={data} errors={errors} set={set} />}
          {step === 3 && <Step4 data={data} errors={errors} set={set} />}
          {step === 4 && <Step5 data={data} error={errors.consent} onToggle={toggleConsent} />}

          {submitError && (
            <p className="mt-5 rounded-[14px] border border-danger/40 bg-danger/20 px-4 py-3 text-sm text-[#ffc4c4]">
              {submitError}
            </p>
          )}

          {/* ปุ่มนำทาง: ย้อนกลับ + ถัดไป/ยืนยันสมัคร (ซ่อนตอนเลือกโรคประจำตัว) */}
          <div className="mt-9 flex items-center justify-between">
            {step > 0 ? <GhostButton onClick={back}>{t.page.back}</GhostButton> : <span />}
            {canNext && (
              <PrimaryButton onClick={next}>
                {isLast ? (submitting ? t.page.submitting : t.page.submit) : t.page.next}
              </PrimaryButton>
            )}
          </div>

          {isLast && (
            <p className="mt-4 text-center text-[13px] text-cream/70">
              {t.page.deadline}
            </p>
          )}
          </div>
        </div>

        {/* popup จดหมายขออภัย เมื่อมีโรคประจำตัว */}
        {showApology && (
          <ApologyPopup
            name={`${data.firstName} ${data.lastName}`}
            diseases={data.diseases}
            onClose={() => setShowApology(false)}
          />
        )}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

/* ============ หัวเรื่องเหนือการ์ดฟอร์ม — โทนเดียวกับหน้า landing ============ */
function PageHeader() {
  const { t, lang } = useLang();
  return (
    <header className="mb-7 px-1">
      <p className="text-[10px] uppercase tracking-[0.42em] text-goldsoft sm:text-xs">
        {t.page.eyebrow}
      </p>
      <h1
        className="mt-4 text-[clamp(1.9rem,4.2vw,3rem)] leading-[1.05] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
        style={headingFont(lang, 1.25)}
      >
        {t.page.heading}
      </h1>
    </header>
  );
}

/* ============ Step 1: ข้อมูลส่วนตัว + สำนักวิชา ============ */
function Step1({
  data,
  errors,
  set,
  schoolOptions,
  majorOptions,
  onStudentId,
  onSchool,
}: {
  data: FormData;
  errors: Record<string, string>;
  set: (k: keyof FormData) => (v: string | null) => void;
  schoolOptions: { value: string; label: string }[];
  majorOptions: { value: string; label: string }[];
  onStudentId: (v: string) => void;
  onSchool: (v: string | null) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-2">
        <PhotoPicker value={data.photo} onChange={set("photo")} />
        <span className="text-xs text-cream/72">{t.step1.photoLabel}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label={t.step1.firstName} value={data.firstName} onChange={set("firstName")} autoComplete="given-name" required error={errors.firstName} />
        <TextField label={t.step1.lastName} value={data.lastName} onChange={set("lastName")} autoComplete="family-name" required error={errors.lastName} />
      </div>

      <TextField
        label={t.step1.studentId}
        value={data.studentId}
        onChange={onStudentId}
        inputMode="numeric"
        maxLength={10}
        hint={t.step1.studentIdHint}
        required
        error={errors.studentId}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label={t.step1.password} type="password" value={data.password} onChange={set("password")} autoComplete="new-password" hint={t.step1.passwordHint} required error={errors.password} />
        <TextField label={t.step1.confirmPassword} type="password" value={data.confirmPassword} onChange={set("confirmPassword")} autoComplete="new-password" required error={errors.confirmPassword} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          label={t.step1.sex}
          value={data.sex}
          onChange={set("sex")}
          placeholder={t.step1.sexPlaceholder}
          options={[
            { value: "male", label: t.step1.male },
            { value: "female", label: t.step1.female },
          ]}
          required
          error={errors.sex}
        />
        <TextField
          label={t.step1.phone}
          value={data.phone}
          onChange={(v) => set("phone")(digitsOnly(v))}
          inputMode="tel"
          autoComplete="tel"
          maxLength={10}
          error={errors.phone}
        />
      </div>

      <SelectField
        label={t.step1.school}
        value={data.schoolId}
        onChange={onSchool}
        placeholder={t.step1.schoolPlaceholder}
        options={schoolOptions}
        required
        error={errors.schoolId}
      />

      {data.schoolId && majorOptions.length > 0 && (
        <SelectField
          label={t.step1.major}
          value={data.major}
          onChange={set("major")}
          placeholder={t.step1.majorPlaceholder}
          options={majorOptions}
          error={errors.major}
        />
      )}
    </div>
  );
}

/* ============ Step 2: โรคประจำตัว (มี gate + popup) ============ */
function Step2({ selected, onToggle }: { selected: string[]; onToggle: (v: string) => void }) {
  const t = useT();
  const chronic = useChronic();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-cream">{t.step2.heading}</h2>
        <p className="mt-1 text-sm text-cream/78">{t.step2.sub}</p>
      </div>
      <div className="space-y-2.5">
        {chronic.map((c) => (
          <DiseaseCheck
            key={c.value}
            label={c.label}
            desc={c.desc}
            checked={selected.includes(c.value)}
            onToggle={() => onToggle(c.value)}
          />
        ))}
      </div>
    </div>
  );
}

/* ============ Step 3: Medical ID ============ */
/** กรุ๊ปเลือด — ป้ายเป็นสัญลักษณ์อยู่แล้ว มีแค่ "ไม่ทราบ" ที่ต้องแปล */
function useBlood(): { value: string; label: string }[] {
  const t = useT();
  return [
    { value: "O+", label: "O+" },
    { value: "O-", label: "O−" },
    { value: "A+", label: "A+" },
    { value: "A-", label: "A−" },
    { value: "B+", label: "B+" },
    { value: "B-", label: "B−" },
    { value: "AB+", label: "AB+" },
    { value: "AB-", label: "AB−" },
    { value: "unknown", label: t.step3.bloodUnknown },
  ];
}

/* วันที่วันนี้ (จำกัดวันเกิดไม่ให้เลือกอนาคต)
   คำนวณหลัง mount — หน้านี้ prerender เป็น static ถ้าคำนวณตอน build จะค้างอยู่ที่วัน build */
function useToday() {
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);
  return today;
}

function Step3({
  data,
  errors,
  set,
}: {
  data: FormData;
  errors: Record<string, string>;
  set: (k: keyof FormData) => (v: string | null) => void;
}) {
  const t = useT();
  const BLOOD = useBlood();
  const fullName = `${data.firstName} ${data.lastName}`.trim() || t.page.fallbackName;
  const TODAY = useToday();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-cream">{t.step3.heading}</h2>
        <p className="mt-1 text-sm text-cream/78">{t.step3.sub}</p>
      </div>

      {/* ชื่อ (อ่านอย่างเดียว จาก step 1) */}
      <div className="rounded-[14px] border border-cream/12 bg-cream/[0.07] px-4 py-3">
        <span className="block text-xs text-cream/72">{t.step3.name}</span>
        <span className="font-medium text-cream">{fullName}</span>
      </div>

      <TextField
        label={t.step3.birthdate}
        type="date"
        value={data.birthdate}
        onChange={set("birthdate")}
        max={TODAY || undefined}
        hint={t.step3.birthdateHint}
        required
        error={errors.birthdate}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField
          label={t.step3.weight}
          value={data.weightKg}
          onChange={(v) => set("weightKg")(v.replace(/[^\d.]/g, ""))}
          inputMode="numeric"
          min={20}
          max={200}
          step={0.1}
          required
          error={errors.weightKg}
        />
        <TextField
          label={t.step3.height}
          value={data.heightCm}
          onChange={(v) => set("heightCm")(v.replace(/[^\d.]/g, ""))}
          inputMode="numeric"
          min={100}
          max={220}
          step={1}
          required
          error={errors.heightCm}
        />
        <SelectField
          label={t.step3.bloodType}
          value={data.bloodType}
          onChange={set("bloodType")}
          placeholder={t.step3.bloodPlaceholder}
          options={BLOOD}
          required
          error={errors.bloodType}
        />
      </div>
    </div>
  );
}

/* ============ Step 4: เบอร์โทรติดต่อฉุกเฉิน ============ */
function Step4({
  data,
  errors,
  set,
}: {
  data: FormData;
  errors: Record<string, string>;
  set: (k: keyof FormData) => (v: string | null) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-cream">{t.step4.heading}</h2>
        <p className="mt-1 text-sm text-cream/78">{t.step4.sub}</p>
      </div>

      <TextField
        label={t.step4.phone}
        value={data.emergencyPhone}
        onChange={(v) => set("emergencyPhone")(digitsOnly(v))}
        inputMode="tel"
        autoComplete="tel"
        maxLength={10}
        placeholder="08xxxxxxxx"
        required
        error={errors.emergencyPhone}
      />
      <TextField
        label={t.step4.name}
        value={data.emergencyName}
        onChange={set("emergencyName")}
        placeholder={t.step4.namePlaceholder}
        required
        error={errors.emergencyName}
      />
    </div>
  );
}

/* ============ Step 5: การยินยอม ============ */
function Step5({
  data,
  error,
  onToggle,
}: {
  data: FormData;
  error?: string;
  onToggle: (k: "consentHealth" | "consentEmergency" | "consentWaiver") => void;
}) {
  const t = useT();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-cream">{t.step5.heading}</h2>
        <p className="mt-1 text-sm text-cream/78">{t.step5.sub}</p>
      </div>

      <div className="space-y-2.5">
        <ConsentCheck
          checked={data.consentHealth}
          onToggle={() => onToggle("consentHealth")}
          text={t.step5.health}
        />
        <ConsentCheck
          checked={data.consentEmergency}
          onToggle={() => onToggle("consentEmergency")}
          text={t.step5.emergency}
        />
        <ConsentCheck
          checked={data.consentWaiver}
          onToggle={() => onToggle("consentWaiver")}
          text={t.step5.waiver}
          required
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function ConsentCheck({
  checked,
  onToggle,
  text,
  required,
}: {
  checked: boolean;
  onToggle: () => void;
  text: string;
  required?: boolean;
}) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "flex w-full items-start gap-3 rounded-[16px] border p-4 text-left transition-all duration-200",
        checked
          ? "border-gold bg-gold/15"
          : "border-cream/15 bg-cream/[0.06] hover:border-cream/35",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-all duration-200",
          checked ? "border-gold bg-gold" : "border-cream/30 bg-transparent",
        ].join(" ")}
      >
        {checked && (
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-ink" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m5 10.5 3.5 3.5L15 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="text-sm leading-relaxed text-cream/90">
        {text}
        {required && <span className="ml-1 font-medium text-[#ffa7a7]">{t.step5.required}</span>}
      </span>
    </button>
  );
}

/* ============ หน้าสำเร็จ — ต้นไม้โตเต็มที่แล้ว ============ */
function SuccessScreen({ name, studentId }: { name: string; studentId: string }) {
  const t = useT();
  const last = t.page.steps.length - 1;
  return (
    <>
      <ForestScene day={dayForStep(last, t.page.steps.length)} plantStep={last} />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-28 lg:justify-end lg:px-[5vw]">
        <div className="w-full max-w-md rounded-[26px] border border-cream/15 bg-ink/82 p-8 text-center shadow-[0_30px_90px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15">
            <svg viewBox="0 0 24 24" className="h-8 w-8 text-gold" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-cream">{t.success.heading}</h1>
          <p className="mt-2 text-cream/78">{t.success.welcome(name.trim() || t.page.fallbackName)}</p>

          {/* ชื่อผู้ใช้สำหรับเข้าสู่ระบบ — ต้องเห็นชัด */}
          <div className="my-5 rounded-[10px] border border-cream/15 bg-cream/[0.07] p-4">
            <div className="text-[13px] text-cream/72">{t.success.usernameLabel}</div>
            <div className="text-[22px] font-extrabold tracking-[0.5px] text-goldsoft">{studentId}</div>
          </div>

          <p className="text-sm leading-relaxed text-cream/78">
            <b className="text-cream">{t.success.nextStepLabel}</b> {t.success.nextStepBefore}{" "}
            <b className="text-cream">“{t.meta.appName}”</b> {t.success.nextStepAfter}
          </p>
        </div>
      </div>
    </>
  );
}
