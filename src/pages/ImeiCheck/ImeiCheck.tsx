import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Helmet } from "react-helmet-async";
import { Capacitor } from "@capacitor/core";
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle, LockKeyhole, SearchCheck, Smartphone, X, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import "./ImeiCheck.css";

type CheckResult = {
  kind: "registered" | "unregistered" | "serial-mismatch" | "unknown" | "error";
  message?: string;
};

const CHECK_ENDPOINT = Capacitor.isNativePlatform()
  ? "https://telephonic-pro.tn/api/imei-check"
  : "/api/imei-check";

export function ImeiCheck() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");
  const [imei, setImei] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(true);
  const helpDialogRef = useRef<HTMLDialogElement>(null);
  const imeiDigits = imei.replace(/\D/g, "");
  const serialCharacters = serialNo.trim().length;
  const showImeiError = imeiDigits.length > 0 && !/^\d{14,16}$/.test(imeiDigits);
  const showSerialError = serialCharacters > 0 && (serialCharacters < 5 || serialCharacters > 50);
  const isImeiValid = /^\d{14,16}$/.test(imeiDigits);
  const isSerialValid = serialCharacters >= 5 && serialCharacters <= 50;

  useEffect(() => {
    const dialog = helpDialogRef.current;
    if (!dialog) return;
    if (helpOpen && !dialog.open) dialog.showModal();
    if (!helpOpen && dialog.open) dialog.close();
  }, [helpOpen]);

  useEffect(() => {
    document.documentElement.classList.add("tl-imei-page-active");
    return () => document.documentElement.classList.remove("tl-imei-page-active");
  }, []);

  const copy = isArabic ? {
    title: "تثبّت من تسجيل هاتفك",
    intro: "اكتب IMEI1 والرقم التسلسلي باش تتأكد من حالة تسجيل الجهاز في سجلني.",
    helpButton: "وين تلقى المعطيات؟",
    closeHelp: "فهمت، كمّل",
    imei: "IMEI1",
    serial: "Serial Number",
    imeiHint: "من 14 إلى 16 رقم.",
    serialHint: "من 5 إلى 50 حرف.",
    submit: "تثبّت من التسجيل",
    loading: "جاري التثبّت…",
    privacy: "المعطيات تتبعث لسجلني عبر اتصال آمن، وما نخزّنوهاش في قاعدة بيانات Tele Lab.",
    official: "النتيجة تجي مباشرة من خدمة سجلني الرسمية.",
    registered: "الجهاز مسجّل",
    registeredText: "خدمة سجلني أكّدت إنّ الجهاز مسجّل.",
    unregistered: "الجهاز غير مسجّل",
    unregisteredText: "خدمة سجلني أكّدت إنّ الجهاز غير مسجّل.",
    mismatch: "الـIMEI صحيح، أمّا الرقم التسلسلي ما يطابقش",
    mismatchText: "تثبّت من Serial Number وعاود المحاولة.",
    unknown: "وصل ردّ من الخدمة",
    unknownText: "ما تعرّفناش على حالة التسجيل من الردّ.",
    errorTitle: "ما نجّمش نكمّل التثبّت",
    invalidImei: "اكتب IMEI1 بالأرقام فقط، بين 14 و16 رقم.",
    invalidSerial: "اكتب Serial Number صحيح بين 5 و50 حرف.",
    unavailable: "تعذّر الاتصال بالخدمة. تثبّت من الإنترنت وعاود المحاولة.",
    helperTitle: "وين تلقى المعطيات؟",
    helperImei: "IMEI1 تلقاه في إعدادات الهاتف، أو اكتب ‎*#06#‎ في لوحة الاتصال.",
    helperSerial: "Serial Number تلقاه في إعدادات الجهاز أو على العلبة الأصلية.",
    repair: "تحتاج تصليح؟",
    repairLink: "اطلب إصلاح في المنزل",
    repairText: "نجيوا لعندك ونصلّحوا هاتفك في دارك.",
  } : {
    title: "Vérifiez l’enregistrement de votre téléphone",
    intro: "Saisissez l’IMEI1 et le numéro de série pour vérifier l’état d’enregistrement auprès de Sajalni.",
    helpButton: "Où trouver ces informations ?",
    closeHelp: "Compris, continuer",
    imei: "IMEI1",
    serial: "Numéro de série",
    imeiHint: "14 à 16 chiffres.",
    serialHint: "Entre 5 et 50 caractères.",
    submit: "Vérifier l’enregistrement",
    loading: "Vérification en cours…",
    privacy: "Les données sont transmises à Sajalni via une connexion sécurisée. Tele Lab ne les enregistre pas dans sa base de données.",
    official: "Le résultat provient directement du service officiel Sajalni.",
    registered: "Appareil enregistré",
    registeredText: "Sajalni confirme que cet appareil est enregistré.",
    unregistered: "Appareil non enregistré",
    unregisteredText: "Sajalni confirme que cet appareil n’est pas enregistré.",
    mismatch: "IMEI valide, numéro de série non correspondant",
    mismatchText: "Vérifiez le numéro de série et réessayez.",
    unknown: "Réponse reçue",
    unknownText: "Le statut d’enregistrement n’a pas pu être identifié.",
    errorTitle: "Vérification impossible",
    invalidImei: "Saisissez un IMEI1 de 14 à 16 chiffres.",
    invalidSerial: "Saisissez un numéro de série de 5 à 50 caractères.",
    unavailable: "Connexion impossible. Vérifiez Internet et réessayez.",
    helperTitle: "Où trouver ces informations ?",
    helperImei: "L’IMEI1 se trouve dans les réglages ou en composant ‎*#06#‎.",
    helperSerial: "Le numéro de série se trouve dans les réglages ou sur la boîte d’origine.",
    repair: "Besoin d’une réparation ?",
    repairLink: "Demander une réparation à domicile",
    repairText: "Nous réparons votre téléphone directement chez vous.",
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedImei = imei.replace(/\D/g, "");
    const normalizedSerial = serialNo.trim();
    if (!/^\d{14,16}$/.test(normalizedImei)) {
      setResult({ kind: "error", message: copy.invalidImei });
      return;
    }
    if (normalizedSerial.length < 5 || normalizedSerial.length > 50) {
      setResult({ kind: "error", message: copy.invalidSerial });
      return;
    }

    setIsChecking(true);
    setResult(null);
    try {
      const response = await fetch(CHECK_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imei: normalizedImei, serialNo: normalizedSerial }),
        signal: AbortSignal.timeout(25_000),
      });
      const payload = await response.json();
      if (!response.ok) {
        setResult({ kind: "error", message: payload?.error || copy.unavailable });
        return;
      }
      const kind: CheckResult["kind"] = ["registered", "unregistered", "serial-mismatch", "unknown"].includes(payload?.outcome)
        ? payload.outcome
        : "unknown";
      setResult({ kind });
    } catch {
      setResult({ kind: "error", message: copy.unavailable });
    } finally {
      setIsChecking(false);
    }
  }

  const resultCopy = result?.kind === "registered"
    ? { title: copy.registered, message: copy.registeredText, icon: CheckCircle2 }
    : result?.kind === "unregistered"
      ? { title: copy.unregistered, message: copy.unregisteredText, icon: XCircle }
      : result?.kind === "serial-mismatch"
        ? { title: copy.mismatch, message: copy.mismatchText, icon: CircleAlert }
        : result?.kind === "unknown"
          ? { title: copy.unknown, message: copy.unknownText, icon: CircleAlert }
          : result?.kind === "error"
            ? { title: copy.errorTitle, message: result.message || copy.unavailable, icon: CircleAlert }
            : null;
  const ResultIcon = resultCopy?.icon;

  return (
    <main className="tl-imei-page" dir={isArabic ? "rtl" : "ltr"}>
      <Helmet>
        <title>{isArabic ? "التثبّت من تسجيل الهاتف | Tele Lab" : "Vérifier l’IMEI | Tele Lab"}</title>
        <meta name="description" content={copy.intro} />
      </Helmet>
      <div className="tl-imei-container">
        <header className="tl-imei-heading">
          <span className="tl-imei-eyebrow"><SearchCheck size={16} /> Sajalni · {isArabic ? "تثبّت من IMEI" : "Vérification IMEI"}</span>
          <h1>{copy.title}</h1>
          <p>{copy.intro}</p>
          <button className="tl-imei-help-trigger" type="button" onClick={() => setHelpOpen(true)}>
            <Smartphone size={16} /> {copy.helpButton}
          </button>
        </header>

        <div className="tl-imei-layout">
          <section className="tl-imei-card" aria-label={isArabic ? "نموذج التثبّت" : "Formulaire de vérification"}>
            <form onSubmit={handleSubmit} noValidate>
              <div className="tl-imei-fields">
                <div className={`tl-imei-field${showImeiError ? " is-invalid" : isImeiValid ? " is-valid" : ""}`}>
                  <label htmlFor="imei1">{copy.imei}</label>
                  <input
                    id="imei1"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={16}
                    dir="ltr"
                    placeholder="14–16 chiffres"
                    value={imei}
                    onChange={event => setImei(event.target.value.replace(/\D/g, ""))}
                    aria-describedby="imei-hint"
                    aria-invalid={showImeiError}
                    required
                  />
                  {showImeiError
                    ? <small key={`imei-${imeiDigits.length}`} id="imei-hint" className="tl-imei-validation"><CircleAlert size={13} />{copy.invalidImei}</small>
                    : <small id="imei-hint">{copy.imeiHint}</small>}
                </div>

                <div className={`tl-imei-field${showSerialError ? " is-invalid" : isSerialValid ? " is-valid" : ""}`}>
                  <label htmlFor="serial-number">{copy.serial}</label>
                  <input
                    id="serial-number"
                    type="text"
                    autoComplete="off"
                    minLength={5}
                    maxLength={50}
                    dir="ltr"
                    placeholder="Serial Number"
                    value={serialNo}
                    onChange={event => setSerialNo(event.target.value)}
                    aria-describedby="serial-hint"
                    aria-invalid={showSerialError}
                    required
                  />
                  {showSerialError
                    ? <small key={`serial-${serialCharacters}`} id="serial-hint" className="tl-imei-validation"><CircleAlert size={13} />{copy.invalidSerial}</small>
                    : <small id="serial-hint">{copy.serialHint}</small>}
                </div>
              </div>

              <button className="tl-imei-submit" type="submit" disabled={isChecking}>
                {isChecking ? <LoaderCircle size={18} className="tl-imei-spinner" /> : <SearchCheck size={18} />}
                {isChecking ? copy.loading : copy.submit}
                {!isChecking && <ArrowRight size={17} className="tl-imei-submit-arrow" />}
              </button>
            </form>

            {resultCopy && ResultIcon && (
              <div className={`tl-imei-result is-${result?.kind}`} role="status" aria-live="polite">
                <ResultIcon size={22} aria-hidden="true" />
                <div>
                  <h2>{resultCopy.title}</h2>
                  <p>{resultCopy.message}</p>
                </div>
              </div>
            )}

            <p className="tl-imei-privacy"><LockKeyhole size={16} /> {copy.privacy}</p>
          </section>

          <div className="tl-imei-repair">
            <div className="tl-imei-repair-copy">
              <span>{copy.repair}</span>
              <p>{copy.repairText}</p>
            </div>
            <Link to="/demande" className="tl-imei-repair-link">{copy.repairLink}<ArrowRight size={17} /></Link>
          </div>
        </div>
      </div>

      <dialog
        ref={helpDialogRef}
        className="tl-imei-help-modal"
        aria-labelledby="tl-imei-help-title"
        onCancel={event => { event.preventDefault(); setHelpOpen(false); }}
        onClose={() => setHelpOpen(false)}
      >
        <div className="tl-imei-help-head">
          <span className="tl-imei-aside-icon"><Smartphone size={22} /></span>
          <button type="button" className="tl-imei-help-close" onClick={() => setHelpOpen(false)} aria-label={isArabic ? "إغلاق" : "Fermer"}>
            <X size={19} />
          </button>
        </div>
        <h2 id="tl-imei-help-title">{copy.helperTitle}</h2>
        <div className="tl-imei-tip">
          <strong>{copy.imei}</strong>
          <p>{copy.helperImei}</p>
        </div>
        <div className="tl-imei-tip">
          <strong>{copy.serial}</strong>
          <p>{copy.helperSerial}</p>
        </div>
        <p className="tl-imei-official"><CheckCircle2 size={16} /> {copy.official}</p>
        <button type="button" className="tl-imei-help-done" onClick={() => setHelpOpen(false)}>{copy.closeHelp}</button>
      </dialog>
    </main>
  );
}
