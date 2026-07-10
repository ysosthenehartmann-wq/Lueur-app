import { useState, useEffect } from "react";
import {
  Moon, Droplet, Heart, Settings, ChevronLeft, Sparkles, Baby, CalendarDays,
  Pill, Home, Bell, Crown, Check, Plus, Trash2, X,
} from "lucide-react";

/* ---------- Data ---------- */

const SYMPTOMS = ["Crampes", "Fatigue", "Maux de tête", "Ballonnements", "Seins sensibles", "Acné", "Nausées"];
const MOODS = [
  { key: "calme", label: "Calme", emoji: "🌙" },
  { key: "energique", label: "Énergique", emoji: "✨" },
  { key: "irritable", label: "Irritable", emoji: "🌩️" },
  { key: "triste", label: "Triste", emoji: "🌧️" },
];
const FLOWS = [
  { key: "aucun", label: "Aucun" },
  { key: "leger", label: "Léger" },
  { key: "moyen", label: "Moyen" },
  { key: "abondant", label: "Abondant" },
];
const PREGNANCY_SYMPTOMS = ["Nausées", "Fatigue", "Mal de dos", "Brûlures d'estomac", "Gonflement", "Insomnie", "Contractions"];

const SIZE_BY_WEEK = {
  4: ["🌰", "une graine de pavot"], 5: ["🌱", "une graine de sésame"], 6: ["🫛", "un petit pois"],
  7: ["🫐", "un bleuet"], 8: ["🍇", "un grain de raisin"], 9: ["🍒", "une cerise"],
  10: ["🍓", "une fraise"], 11: ["🥝", "une petite figue"], 12: ["🍋", "une prune"],
  13: ["🍑", "une pêche"], 14: ["🍋", "un citron"], 15: ["🍎", "une pomme"],
  16: ["🥑", "un avocat"], 17: ["🧅", "un oignon"], 18: ["🫑", "un poivron"],
  19: ["🥭", "une mangue"], 20: ["🍌", "une banane"], 21: ["🥕", "une carotte"],
  22: ["🥥", "une noix de coco"], 23: ["🌽", "un épi de maïs"], 24: ["🍆", "une aubergine"],
  25: ["🥦", "un chou-fleur"], 26: ["🥬", "une laitue"], 27: ["🥦", "un brocoli"],
  28: ["🍆", "une grosse aubergine"], 29: ["🎃", "une petite courge"], 30: ["🥥", "un gros chou"],
  31: ["🍍", "un ananas"], 32: ["🥭", "une grosse mangue"], 33: ["🍈", "un melon"],
  34: ["🎃", "une courge musquée"], 35: ["🍈", "un cantaloup"], 36: ["🥬", "une romaine"],
  37: ["🍉", "un petit melon d'eau"], 38: ["🥭", "un poireau géant"], 39: ["🍉", "une pastèque"],
  40: ["🎋", "une botte de blettes"],
};

const FREE_REMINDER_LIMIT = 2;
const FREE_HISTORY_LIMIT = 7;
const PREMIUM_HISTORY_LIMIT = 90;

/* ---------- Helpers ---------- */

const DAY_MS = 86400000;
const toDate = (s) => new Date(s + "T00:00:00");
const dateKey = (d) => d.toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.floor((b - a) / DAY_MS);
const todayKey = () => dateKey(new Date());
const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function cyclePhase(dayInCycle, periodLength, cycleLength) {
  const ovulationDay = cycleLength - 14;
  const fertileStart = ovulationDay - 5;
  const fertileEnd = ovulationDay + 1;
  if (dayInCycle <= periodLength) return { key: "regles", label: "Règles" };
  if (dayInCycle >= fertileStart && dayInCycle <= fertileEnd) return { key: "fertile", label: "Fenêtre fertile" };
  if (dayInCycle < fertileStart) return { key: "folliculaire", label: "Phase folliculaire" };
  return { key: "luteale", label: "Phase lutéale" };
}

const PHASE_COLOR = { regles: "#E8556B", fertile: "#4FB0A5", folliculaire: "#E8A33D", luteale: "#8A7FBF" };

function isReminderDueToday(reminder) {
  if (reminder.days === "every") return true;
  const todayIdx = new Date().getDay();
  return reminder.days.includes(todayIdx);
}

/* ---------- Storage ---------- */

async function loadKey(key, fallback) {
  try {
    const r = await window.storage.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch { return fallback; }
}
async function saveKey(key, value) {
  try { await window.storage.set(key, JSON.stringify(value)); } catch (e) { console.error(e); }
}

/* ---------- Cycle Wheel ---------- */

function CycleWheel({ dayInCycle, cycleLength, periodLength }) {
  const size = 220, cx = size / 2, cy = size / 2, r = 92, stroke = 14;
  const segments = [];
  for (let d = 1; d <= cycleLength; d++) {
    const ph = cyclePhase(d, periodLength, cycleLength).key;
    const a0 = (d - 1) / cycleLength * Math.PI * 2 - Math.PI / 2;
    const a1 = d / cycleLength * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const largeArc = a1 - a0 > Math.PI ? 1 : 0;
    segments.push(
      <path key={d} d={`M ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1}`}
        stroke={PHASE_COLOR[ph]} strokeWidth={stroke} fill="none" opacity={0.9} />
    );
  }
  const markerAngle = (dayInCycle - 0.5) / cycleLength * Math.PI * 2 - Math.PI / 2;
  const mx = cx + r * Math.cos(markerAngle), my = cy + r * Math.sin(markerAngle);

  return (
    <svg width={size} height={size} className="mx-auto">
      {segments}
      <circle cx={mx} cy={my} r={7} fill="#F5EFE6" stroke="#1B1330" strokeWidth={2} />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="34" fontFamily="Fraunces, serif" fill="#F5EFE6">{dayInCycle}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="12" letterSpacing="0.05em" fill="#B8ADD1">JOUR DU CYCLE</text>
    </svg>
  );
}

/* ---------- Paywall modal ---------- */

function PaywallModal({ reason, onClose, onUpgrade }) {
  const [step, setStep] = useState("plans"); // plans | details | loading | error
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const choosePlan = (plan) => { setSelectedPlan(plan); setStep("details"); };

  const submit = async () => {
    setStep("loading");
    try {
      await onUpgrade(selectedPlan, { name, phone });
      setStep("error");
      setErrorMsg("Le paiement n'a pas pu être initié. Réessaie dans un instant.");
    } catch (e) {
      setStep("error");
      setErrorMsg("Connexion au serveur de paiement impossible pour le moment.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4">
      <div className="bg-[#241a3a] border border-[#3E3161] rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#E8A33D]"><Crown className="w-5 h-5" /><span className="font-medium">Lueur Premium</span></div>
          <button onClick={onClose} className="text-[#B8ADD1]"><X className="w-5 h-5" /></button>
        </div>

        {step === "plans" && (
          <>
            <p className="text-sm text-[#B8ADD1] mb-4">{reason}</p>
            <ul className="text-sm flex flex-col gap-2 mb-5">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#4FB0A5]" />Rappels illimités</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#4FB0A5]" />Historique complet ({PREMIUM_HISTORY_LIMIT} jours)</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#4FB0A5]" />Export de tes données</li>
            </ul>
            <div className="flex flex-col gap-2">
              <button onClick={() => choosePlan("monthly")}
                className="bg-[#E8A33D] text-[#1B1330] font-medium rounded-xl py-2.5">
                S'abonner — 1500 FCFA / mois
              </button>
              <button onClick={() => choosePlan("lifetime")}
                className="border border-[#E8A33D] text-[#E8A33D] font-medium rounded-xl py-2.5">
                Accès illimité — 12 000 FCFA une fois
              </button>
              <button onClick={onClose} className="text-[#6E6390] text-sm py-1">Plus tard</button>
            </div>
          </>
        )}

        {step === "details" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#B8ADD1] mb-1">Pour confirmer ton paiement mobile money :</p>
            <input placeholder="Ton prénom" value={name} onChange={(e) => setName(e.target.value)}
              className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2 text-sm" />
            <input placeholder="Numéro mobile money (ex. 0707000000)" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2 text-sm" />
            <div className="flex gap-2 mt-1">
              <button onClick={() => setStep("plans")} className="flex-1 border border-[#3E3161] rounded-xl py-2 text-sm">Retour</button>
              <button disabled={!name || !phone} onClick={submit}
                className="flex-1 bg-[#E8A33D] disabled:opacity-40 text-[#1B1330] font-medium rounded-xl py-2 text-sm">
                Payer avec CinetPay
              </button>
            </div>
          </div>
        )}

        {step === "loading" && <p className="text-sm text-[#B8ADD1] text-center py-6">Connexion au paiement en cours…</p>}

        {step === "error" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[#E8556B]">{errorMsg}</p>
            <button onClick={() => setStep("plans")} className="border border-[#3E3161] rounded-xl py-2 text-sm">Réessayer</button>
          </div>
        )}

        <p className="text-[10px] text-[#6E6390] mt-3">Paiement sécurisé via CinetPay (mobile money, carte bancaire).</p>
      </div>
    </div>
  );
}

/* ---------- Onboarding ---------- */

function Onboarding({ onDone }) {
  const [mode, setMode] = useState(null);
  const [lastPeriod, setLastPeriod] = useState("");
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [lmp, setLmp] = useState("");

  const canSubmit = mode === "cycle" ? !!lastPeriod : mode === "grossesse" ? !!lmp : false;

  const submit = () => {
    if (mode === "cycle") {
      onDone({ mode: "cycle", lastPeriodStart: lastPeriod, cycleLength: Number(cycleLength), periodLength: Number(periodLength) });
    } else {
      onDone({ mode: "grossesse", lmp, cycleLength: 28, periodLength: 5 });
    }
  };

  return (
    <div className="min-h-screen bg-[#1B1330] flex flex-col items-center justify-center px-6 py-12 text-[#F5EFE6]">
      <Moon className="w-8 h-8 text-[#E8A33D] mb-3" strokeWidth={1.5} />
      <h1 className="text-3xl mb-1" style={{ fontFamily: "Fraunces, serif" }}>Lueur</h1>
      <p className="text-[#B8ADD1] text-sm mb-8">Ton cycle, ta grossesse, en toute intimité.</p>

      {!mode && (
        <div className="w-full max-w-sm flex flex-col gap-3">
          <button onClick={() => setMode("cycle")}
            className="text-left bg-[#2A1F42] border border-[#3E3161] rounded-2xl p-5 hover:border-[#E8A33D] transition-colors">
            <div className="flex items-center gap-3 mb-1"><Droplet className="w-5 h-5 text-[#E8A33D]" /><span className="font-medium">Suivre mon cycle</span></div>
            <p className="text-sm text-[#B8ADD1]">Règles, ovulation, symptômes.</p>
          </button>
          <button onClick={() => setMode("grossesse")}
            className="text-left bg-[#2A1F42] border border-[#3E3161] rounded-2xl p-5 hover:border-[#E77C8D] transition-colors">
            <div className="flex items-center gap-3 mb-1"><Baby className="w-5 h-5 text-[#E77C8D]" /><span className="font-medium">Suivre ma grossesse</span></div>
            <p className="text-sm text-[#B8ADD1]">Semaine par semaine, jusqu'au terme.</p>
          </button>
        </div>
      )}

      {mode === "cycle" && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Date de début des dernières règles
            <input type="date" value={lastPeriod} max={todayKey()} onChange={(e) => setLastPeriod(e.target.value)}
              className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2 text-[#F5EFE6]" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Durée moyenne du cycle (jours)
            <input type="number" min={20} max={45} value={cycleLength} onChange={(e) => setCycleLength(e.target.value)}
              className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2 text-[#F5EFE6]" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Durée des règles (jours)
            <input type="number" min={2} max={10} value={periodLength} onChange={(e) => setPeriodLength(e.target.value)}
              className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2 text-[#F5EFE6]" />
          </label>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setMode(null)} className="px-4 py-2 rounded-xl border border-[#3E3161] text-sm">Retour</button>
            <button disabled={!canSubmit} onClick={submit}
              className="flex-1 bg-[#E8A33D] disabled:opacity-40 text-[#1B1330] font-medium rounded-xl py-2">Commencer</button>
          </div>
        </div>
      )}

      {mode === "grossesse" && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Date des dernières règles (avant la grossesse)
            <input type="date" value={lmp} max={todayKey()} onChange={(e) => setLmp(e.target.value)}
              className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2 text-[#F5EFE6]" />
          </label>
          <p className="text-xs text-[#B8ADD1]">Sert à estimer la semaine de grossesse et la date prévue d'accouchement.</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setMode(null)} className="px-4 py-2 rounded-xl border border-[#3E3161] text-sm">Retour</button>
            <button disabled={!canSubmit} onClick={submit}
              className="flex-1 bg-[#E77C8D] disabled:opacity-40 text-[#1B1330] font-medium rounded-xl py-2">Commencer</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Day log forms ---------- */

function DayLogForm({ existing, onSave, pregnancy }) {
  const [flow, setFlow] = useState(existing?.flow || "aucun");
  const [mood, setMood] = useState(existing?.mood || null);
  const [symptoms, setSymptoms] = useState(existing?.symptoms || []);
  const list = pregnancy ? PREGNANCY_SYMPTOMS : SYMPTOMS;
  const toggleSymptom = (s) => setSymptoms((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);

  return (
    <div className="bg-[#241a3a] border border-[#3E3161] rounded-2xl p-4 mt-2 flex flex-col gap-4">
      {!pregnancy && (
        <div>
          <p className="text-xs text-[#B8ADD1] mb-2">Flux</p>
          <div className="flex gap-2">
            {FLOWS.map((f) => (
              <button key={f.key} onClick={() => setFlow(f.key)}
                className={`flex-1 rounded-xl py-2 text-xs border ${flow === f.key ? "border-[#E8556B] bg-[#E8556B22]" : "border-[#3E3161]"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-xs text-[#B8ADD1] mb-2">Humeur</p>
        <div className="flex gap-2">
          {MOODS.map((m) => (
            <button key={m.key} onClick={() => setMood(m.key)}
              className={`flex-1 rounded-xl py-2 text-lg border ${mood === m.key ? "border-[#E8A33D] bg-[#E8A33D22]" : "border-[#3E3161]"}`}>
              {m.emoji}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-[#B8ADD1] mb-2">Symptômes</p>
        <div className="flex flex-wrap gap-2">
          {list.map((s) => (
            <button key={s} onClick={() => toggleSymptom(s)}
              className={`px-3 py-1.5 rounded-full text-xs border ${symptoms.includes(s) ? "border-[#4FB0A5] bg-[#4FB0A522]" : "border-[#3E3161]"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <button onClick={() => onSave(pregnancy ? { mood, symptoms } : { flow, mood, symptoms })}
        className="bg-[#E8A33D] text-[#1B1330] font-medium rounded-xl py-2">
        Enregistrer
      </button>
    </div>
  );
}

function HistoryList({ logs, limit, isPremium, onRequestUpgrade }) {
  const entries = Object.entries(logs).sort((a, b) => b[0].localeCompare(a[0]));
  const shown = entries.slice(0, limit);
  const hiddenCount = entries.length - shown.length;

  return (
    <div className="px-5 mt-6">
      <h2 className="text-sm text-[#B8ADD1] mb-2 flex items-center gap-2"><CalendarDays className="w-4 h-4" />Historique récent</h2>
      {shown.length === 0 && <p className="text-sm text-[#6E6390]">Aucune entrée pour l'instant.</p>}
      <div className="flex flex-col gap-2">
        {shown.map(([d, entry]) => (
          <div key={d} className="bg-[#2A1F42] rounded-xl px-3 py-2 text-sm flex items-center justify-between">
            <span className="text-[#B8ADD1]">{d}</span>
            <span className="flex items-center gap-2">
              {entry.mood && <span>{MOODS.find((m) => m.key === entry.mood)?.emoji}</span>}
              {entry.flow && entry.flow !== "aucun" && <Droplet className="w-3.5 h-3.5 text-[#E8556B]" />}
              {entry.symptoms?.length > 0 && <span className="text-xs text-[#8A7FBF]">{entry.symptoms.length} symptôme(s)</span>}
            </span>
          </div>
        ))}
      </div>
      {!isPremium && hiddenCount > 0 && (
        <button onClick={onRequestUpgrade} className="w-full mt-2 text-xs text-[#E8A33D] flex items-center justify-center gap-1 py-2">
          <Crown className="w-3.5 h-3.5" /> {hiddenCount} entrée(s) de plus avec Premium
        </button>
      )}
    </div>
  );
}

/* ---------- Cycle / Pregnancy views ---------- */

function CycleView({ profile, logs, onLog, isPremium, onRequestUpgrade }) {
  const [showLog, setShowLog] = useState(false);
  const today = new Date();
  const start = toDate(profile.lastPeriodStart);
  const elapsed = daysBetween(start, today);
  const dayInCycle = ((elapsed % profile.cycleLength) + profile.cycleLength) % profile.cycleLength + 1;
  const phase = cyclePhase(dayInCycle, profile.periodLength, profile.cycleLength);
  const daysToNext = profile.cycleLength - dayInCycle + 1;

  return (
    <div className="px-0">
      <div className="px-5 mt-4">
        <CycleWheel dayInCycle={dayInCycle} cycleLength={profile.cycleLength} periodLength={profile.periodLength} />
      </div>
      <div className="px-5 mt-4 text-center">
        <div className="inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: PHASE_COLOR[phase.key] + "33", color: PHASE_COLOR[phase.key] }}>
          {phase.label}
        </div>
        <p className="text-sm text-[#B8ADD1] mt-2">{daysToNext === 1 ? "Règles attendues demain" : `Règles dans ${daysToNext} jours`}</p>
      </div>
      <div className="px-5 mt-6">
        <button onClick={() => setShowLog((s) => !s)} className="w-full bg-[#2A1F42] border border-[#3E3161] rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="font-medium">Journal du jour</span>
          <Sparkles className="w-4 h-4 text-[#E8A33D]" />
        </button>
        {showLog && <DayLogForm existing={logs[todayKey()]} onSave={(entry) => { onLog(todayKey(), entry); setShowLog(false); }} />}
      </div>
      <HistoryList logs={logs} limit={isPremium ? PREMIUM_HISTORY_LIMIT : FREE_HISTORY_LIMIT} isPremium={isPremium} onRequestUpgrade={onRequestUpgrade} />
    </div>
  );
}

function PregnancyView({ profile, logs, onLog, isPremium, onRequestUpgrade }) {
  const [showLog, setShowLog] = useState(false);
  const today = new Date();
  const lmp = toDate(profile.lmp);
  const daysPregnant = daysBetween(lmp, today);
  const week = Math.floor(daysPregnant / 7);
  const dayOfWeek = daysPregnant % 7;
  const dueDate = new Date(lmp.getTime() + 280 * DAY_MS);
  const daysLeft = Math.max(0, daysBetween(today, dueDate));
  const trimester = week < 13 ? "1er trimestre" : week < 27 ? "2e trimestre" : "3e trimestre";
  const sizeKey = Math.min(40, Math.max(4, week));
  const [emoji, sizeLabel] = SIZE_BY_WEEK[sizeKey] || ["🌱", "une graine"];
  const progressPct = Math.min(100, Math.round((week / 40) * 100));

  return (
    <div>
      <div className="px-5 mt-6 text-center">
        <p className="text-xs text-[#B8ADD1] uppercase tracking-wide">{trimester}</p>
        <p className="text-5xl mt-2" style={{ fontFamily: "Fraunces, serif" }}>Semaine {week}</p>
        <p className="text-sm text-[#B8ADD1] mt-1">jour {dayOfWeek + 1} · {daysLeft} jours avant le terme estimé</p>
        <div className="mt-6 bg-[#2A1F42] border border-[#3E3161] rounded-2xl px-6 py-6 mx-auto max-w-xs">
          <div className="text-5xl mb-2">{emoji}</div>
          <p className="text-sm text-[#B8ADD1]">Ton bébé mesure environ la taille de</p>
          <p className="font-medium">{sizeLabel}</p>
        </div>
        <div className="mt-6 mx-auto max-w-xs">
          <div className="h-2 rounded-full bg-[#2A1F42] overflow-hidden">
            <div className="h-full bg-[#E77C8D]" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-[#6E6390] mt-1">{progressPct}% du parcours</p>
        </div>
      </div>
      <div className="px-5 mt-8">
        <button onClick={() => setShowLog((s) => !s)} className="w-full bg-[#2A1F42] border border-[#3E3161] rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="font-medium">Journal du jour</span>
          <Heart className="w-4 h-4 text-[#E77C8D]" />
        </button>
        {showLog && <DayLogForm existing={logs[todayKey()]} pregnancy onSave={(entry) => { onLog(todayKey(), entry); setShowLog(false); }} />}
      </div>
      <HistoryList logs={logs} limit={isPremium ? PREMIUM_HISTORY_LIMIT : FREE_HISTORY_LIMIT} isPremium={isPremium} onRequestUpgrade={onRequestUpgrade} />
    </div>
  );
}

/* ---------- Reminders ---------- */

function ReminderForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState("08:00");
  const [days, setDays] = useState("every");

  const toggleDay = (idx) => {
    setDays((cur) => {
      const arr = cur === "every" ? [] : [...cur];
      return arr.includes(idx) ? arr.filter((x) => x !== idx) : [...arr, idx];
    });
  };

  return (
    <div className="bg-[#241a3a] border border-[#3E3161] rounded-2xl p-4 flex flex-col gap-3">
      <input placeholder="Nom (ex. Fer, Acide folique...)" value={name} onChange={(e) => setName(e.target.value)}
        className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2 text-sm" />
      <input placeholder="Dosage (optionnel)" value={dosage} onChange={(e) => setDosage(e.target.value)}
        className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2 text-sm" />
      <label className="flex flex-col gap-1 text-sm">
        Heure du rappel
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
          className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-3 py-2" />
      </label>
      <div>
        <p className="text-xs text-[#B8ADD1] mb-2">Jours</p>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setDays("every")}
            className={`px-2.5 py-1 rounded-full text-xs border ${days === "every" ? "border-[#4FB0A5] bg-[#4FB0A522]" : "border-[#3E3161]"}`}>
            Tous les jours
          </button>
          {WEEKDAYS.map((label, idx) => (
            <button key={idx} onClick={() => toggleDay(idx)}
              className={`px-2.5 py-1 rounded-full text-xs border ${days !== "every" && days.includes(idx) ? "border-[#4FB0A5] bg-[#4FB0A522]" : "border-[#3E3161]"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={onCancel} className="flex-1 border border-[#3E3161] rounded-xl py-2 text-sm">Annuler</button>
        <button
          disabled={!name || (days !== "every" && days.length === 0)}
          onClick={() => onSave({ id: Date.now().toString(), name, dosage, time, days })}
          className="flex-1 bg-[#4FB0A5] disabled:opacity-40 text-[#1B1330] font-medium rounded-xl py-2 text-sm">
          Ajouter
        </button>
      </div>
    </div>
  );
}

function RemindersView({ reminders, reminderLogs, isPremium, onAdd, onDelete, onToggleTaken, onRequestUpgrade }) {
  const [showForm, setShowForm] = useState(false);
  const dueToday = reminders.filter(isReminderDueToday).sort((a, b) => a.time.localeCompare(b.time));
  const todayLog = reminderLogs[todayKey()] || {};
  const atLimit = !isPremium && reminders.length >= FREE_REMINDER_LIMIT;

  const handleAddClick = () => {
    if (atLimit) { onRequestUpgrade(); return; }
    setShowForm(true);
  };

  return (
    <div className="px-5 mt-6 pb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center gap-2"><Pill className="w-5 h-5 text-[#4FB0A5]" />Rappels</h2>
        <button onClick={handleAddClick} className="text-[#4FB0A5] flex items-center gap-1 text-sm"><Plus className="w-4 h-4" />Ajouter</button>
      </div>

      {!isPremium && (
        <p className="text-xs text-[#6E6390] mb-3">{reminders.length}/{FREE_REMINDER_LIMIT} rappels utilisés en gratuit</p>
      )}

      {showForm && (
        <div className="mb-4">
          <ReminderForm onCancel={() => setShowForm(false)} onSave={(r) => { onAdd(r); setShowForm(false); }} />
        </div>
      )}

      {dueToday.length === 0 && !showForm && (
        <p className="text-sm text-[#6E6390]">Aucun rappel aujourd'hui. Ajoute une prise de médicament ou de vitamine à suivre.</p>
      )}

      <div className="flex flex-col gap-2">
        {dueToday.map((r) => {
          const taken = !!todayLog[r.id];
          return (
            <div key={r.id} className="bg-[#2A1F42] border border-[#3E3161] rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{r.name}{r.dosage ? ` · ${r.dosage}` : ""}</p>
                <p className="text-xs text-[#B8ADD1]">{r.time} · {r.days === "every" ? "tous les jours" : r.days.map((d) => WEEKDAYS[d]).join(", ")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onToggleTaken(r.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center border ${taken ? "bg-[#4FB0A5] border-[#4FB0A5]" : "border-[#3E3161]"}`}>
                  {taken && <Check className="w-4 h-4 text-[#1B1330]" />}
                </button>
                <button onClick={() => onDelete(r.id)} className="text-[#6E6390]"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {reminders.length > dueToday.length && (
        <div className="mt-6">
          <p className="text-xs text-[#B8ADD1] mb-2">Autres jours</p>
          <div className="flex flex-col gap-2">
            {reminders.filter((r) => !isReminderDueToday(r)).map((r) => (
              <div key={r.id} className="bg-[#2A1F42]/50 border border-[#3E3161] rounded-xl px-4 py-3 flex items-center justify-between opacity-60">
                <div>
                  <p className="font-medium text-sm">{r.name}{r.dosage ? ` · ${r.dosage}` : ""}</p>
                  <p className="text-xs text-[#B8ADD1]">{r.time} · {r.days === "every" ? "tous les jours" : r.days.map((d) => WEEKDAYS[d]).join(", ")}</p>
                </div>
                <button onClick={() => onDelete(r.id)} className="text-[#6E6390]"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#6E6390] mt-6">
        Ces rappels s'affichent dans l'app. Pour une alerte sonore même app fermée, demande-moi de te créer une alarme réelle sur ton téléphone.
      </p>
    </div>
  );
}

/* ---------- Settings ---------- */

function SettingsView({ profile, isPremium, plan, onSwitchProfile, onRequestUpgrade, onDowngrade }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  if (showOnboarding) return <Onboarding onDone={(p) => { onSwitchProfile(p); setShowOnboarding(false); }} />;

  return (
    <div className="px-5 mt-6 pb-6 flex flex-col gap-4">
      <div className="bg-[#2A1F42] border border-[#3E3161] rounded-2xl p-4">
        <p className="text-sm text-[#B8ADD1] mb-1">Abonnement</p>
        {isPremium ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[#E8A33D] font-medium"><Crown className="w-4 h-4" />{plan === "lifetime" ? "Premium illimité" : "Premium mensuel"}</span>
            <button onClick={onDowngrade} className="text-xs text-[#6E6390] underline">se désabonner (démo)</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span>Gratuit</span>
            <button onClick={onRequestUpgrade} className="bg-[#E8A33D] text-[#1B1330] text-sm font-medium rounded-lg px-3 py-1.5 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" />Passer Premium
            </button>
          </div>
        )}
      </div>

      <div className="bg-[#2A1F42] border border-[#3E3161] rounded-2xl p-4">
        <p className="text-sm text-[#B8ADD1] mb-2">Mode de suivi actuel : {profile.mode === "cycle" ? "Cycle" : "Grossesse"}</p>
        <button onClick={() => setShowOnboarding(true)} className="text-sm text-[#4FB0A5] underline">Changer de mode / réinitialiser les dates</button>
      </div>

      <p className="text-xs text-[#6E6390]">Toutes tes données restent privées, stockées uniquement sur cet appareil.</p>
    </div>
  );
}

/* ---------- Bottom nav ---------- */

function BottomNav({ tab, setTab }) {
  const items = [
    { key: "home", label: "Accueil", icon: Home },
    { key: "reminders", label: "Rappels", icon: Bell },
    { key: "settings", label: "Réglages", icon: Settings },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1B1330] border-t border-[#2A1F42] flex justify-around py-2">
      {items.map(({ key, label, icon: Icon }) => (
        <button key={key} onClick={() => setTab(key)} className={`flex flex-col items-center gap-0.5 px-4 py-1 ${tab === key ? "text-[#E8A33D]" : "text-[#6E6390]"}`}>
          <Icon className="w-5 h-5" />
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- App ---------- */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [logs, setLogs] = useState({});
  const [reminders, setReminders] = useState([]);
  const [reminderLogs, setReminderLogs] = useState({});
  const [billing, setBilling] = useState({ plan: "free" });
  const [tab, setTab] = useState("home");
  const [paywall, setPaywall] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, l, r, rl, b] = await Promise.all([
        loadKey("lueur-profile", null),
        loadKey("lueur-logs", {}),
        loadKey("lueur-reminders", []),
        loadKey("lueur-reminder-logs", {}),
        loadKey("lueur-billing", { plan: "free" }),
      ]);
      setProfile(p); setLogs(l); setReminders(r); setReminderLogs(rl); setBilling(b);
      setLoading(false);
    })();
  }, []);

  const isPremium = billing.plan !== "free";

  const handleOnboardingDone = async (p) => { setProfile(p); await saveKey("lueur-profile", p); };
  const handleLog = async (dateStr, entry) => { const next = { ...logs, [dateStr]: entry }; setLogs(next); await saveKey("lueur-logs", next); };
  const handleAddReminder = async (r) => { const next = [...reminders, r]; setReminders(next); await saveKey("lueur-reminders", next); };
  const handleDeleteReminder = async (id) => { const next = reminders.filter((r) => r.id !== id); setReminders(next); await saveKey("lueur-reminders", next); };
  const handleToggleTaken = async (id) => {
    const day = todayKey();
    const next = { ...reminderLogs, [day]: { ...(reminderLogs[day] || {}), [id]: !(reminderLogs[day]?.[id]) } };
    setReminderLogs(next); await saveKey("lueur-reminder-logs", next);
  };
  // Lance un vrai paiement CinetPay via la fonction serveur create-payment.
  // La page redirige ensuite vers le guichet CinetPay ; au retour, on vérifie
  // le statut réel (voir useEffect ci-dessous) avant de débloquer le Premium.
  const handleUpgrade = async (plan, customer) => {
    const res = await fetch("/api/create-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, customer }),
    });
    const data = await res.json();
    if (data.payment_url) {
      window.location.href = data.payment_url;
    } else {
      throw new Error(data.error || "Échec de l'initialisation du paiement");
    }
  };

  const handleDowngrade = async () => { const next = { plan: "free" }; setBilling(next); await saveKey("lueur-billing", next); };

  // Au retour du guichet CinetPay, l'URL contient ?transaction_id=...
  // On vérifie le vrai statut côté serveur avant de débloquer quoi que ce soit.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const txId = params.get("transaction_id");
    if (!txId) return;
    (async () => {
      try {
        const res = await fetch(`/api/check-status?transaction_id=${encodeURIComponent(txId)}`);
        const data = await res.json();
        if (data.status === "ACCEPTED") {
          const next = { plan: data.plan || "monthly" };
          setBilling(next);
          await saveKey("lueur-billing", next);
        }
      } catch (e) {
        console.error("Vérification du paiement impossible", e);
      } finally {
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();
  }, []);

  if (loading) return <div className="min-h-screen bg-[#1B1330] flex items-center justify-center text-[#B8ADD1]">Chargement…</div>;
  if (!profile) return <Onboarding onDone={handleOnboardingDone} />;
  if (profile.mode === "grossesse" && !profile.lmp) return <Onboarding onDone={handleOnboardingDone} />;

  return (
    <div className="min-h-screen bg-[#1B1330] text-[#F5EFE6] pb-20">
      <header className="flex items-center justify-between px-5 pt-6 pb-2">
        <div className="flex items-center gap-2"><Moon className="w-5 h-5 text-[#E8A33D]" /><span className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>Lueur</span></div>
        {isPremium && <span className="flex items-center gap-1 text-xs text-[#E8A33D]"><Crown className="w-3.5 h-3.5" />Premium</span>}
      </header>

      {tab === "home" && (
        profile.mode === "grossesse"
          ? <PregnancyView profile={profile} logs={logs} onLog={handleLog} isPremium={isPremium} onRequestUpgrade={() => setPaywall("Débloque l'historique complet de ton suivi.")} />
          : <CycleView profile={profile} logs={logs} onLog={handleLog} isPremium={isPremium} onRequestUpgrade={() => setPaywall("Débloque l'historique complet de ton suivi.")} />
      )}

      {tab === "reminders" && (
        <RemindersView
          reminders={reminders} reminderLogs={reminderLogs} isPremium={isPremium}
          onAdd={handleAddReminder} onDelete={handleDeleteReminder} onToggleTaken={handleToggleTaken}
          onRequestUpgrade={() => setPaywall(`Passe à Premium pour ajouter plus de ${FREE_REMINDER_LIMIT} rappels.`)}
        />
      )}

      {tab === "settings" && (
        <SettingsView
          profile={profile} isPremium={isPremium} plan={billing.plan}
          onSwitchProfile={handleOnboardingDone}
          onRequestUpgrade={() => setPaywall("Débloque tous les avantages Premium.")}
          onDowngrade={handleDowngrade}
        />
      )}

      <BottomNav tab={tab} setTab={setTab} />
      {paywall && <PaywallModal reason={paywall} onClose={() => setPaywall(null)} onUpgrade={handleUpgrade} />}
    </div>
  );
}
