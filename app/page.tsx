"use client";

import Image from "next/image";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Edit3,
  Eye,
  History,
  Lock,
  MapPin,
  Menu,
  Minus,
  Plus,
  Save,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

type Drink = string;
type QuestionType = "text" | "yes_no" | "select";

interface Attendee {
  id: string;
  nombre: string;
  traeAcompanante: boolean;
  nombreAcompanante?: string;
  seQuedaACenar: boolean;
  alergias: string;
  bebidas: Drink[];
  comentarios: string;
  puntos: number;
  respuestas?: Record<string, string>;
}

interface QuestionConfig {
  id: string;
  label: string;
  required: boolean;
  type?: QuestionType;
  options?: string[];
  opciones?: string[];
}

interface PointRule {
  id: string;
  label: string;
  value: number;
}

interface PointHistory {
  id: string;
  attendeeId: string;
  attendeeName: string;
  label: string;
  value: number;
  createdAt: string;
}

type State = {
  attendees: Attendee[];
  questions: QuestionConfig[];
  rules: PointRule[];
  history: PointHistory[];
};

type Action =
  | { type: "hydrate"; state: State }
  | { type: "addAttendees"; attendees: Attendee[] }
  | { type: "updateAttendee"; attendee: Attendee }
  | { type: "deleteAttendee"; id: string }
  | { type: "applyPointAction"; id: string; label: string; value: number }
  | { type: "setPoints"; id: string; points: number; label?: string }
  | { type: "addQuestion"; question: QuestionConfig }
  | { type: "updateQuestion"; question: QuestionConfig }
  | { type: "deleteQuestion"; id: string }
  | { type: "addRule"; rule: PointRule }
  | { type: "updateRule"; rule: PointRule }
  | { type: "deleteRule"; id: string };

const drinkLabels: Record<string, string> = {
  cerveza: "Cerveza",
  tinto: "Tinto",
  limon: "Limón",
  sin_alcohol: "Sin alcohol"
};

const getDrinkLabel = (drink: Drink) => drinkLabels[drink] || drink;

const getDrinkOptions = (question?: QuestionConfig) =>
  question?.options?.length ? question.options : Object.values(drinkLabels);

const drinkMatchesOption = (drink: Drink, option: string) => drink === option || getDrinkLabel(drink) === option;

const defaultQuestionTypes: Record<string, QuestionType> = {
  nombre: "text",
  traeAcompanante: "yes_no",
  nombreAcompanante: "text",
  seQuedaACenar: "yes_no",
  alergias: "text",
  bebidas: "select",
  comentarios: "text"
};

const initialState: State = {
  attendees: [
    {
      id: "demo-1",
      nombre: "Invitada Demo",
      traeAcompanante: true,
      nombreAcompanante: "Acompañante Demo",
      seQuedaACenar: true,
      alergias: "Sin alergias",
      bebidas: ["cerveza", "limon"],
      comentarios: "Confirmación inicial",
      puntos: 12
    },
    {
      id: "demo-2",
      nombre: "Acompañante Demo",
      traeAcompanante: false,
      seQuedaACenar: true,
      alergias: "Sin alergias",
      bebidas: ["cerveza", "limon"],
      comentarios: "Acompañante de Invitada Demo",
      puntos: 9
    },
    {
      id: "demo-3",
      nombre: "Participante Demo",
      traeAcompanante: false,
      seQuedaACenar: false,
      alergias: "",
      bebidas: ["sin_alcohol"],
      comentarios: "",
      puntos: 4
    }
  ],
  questions: [
    { id: "nombre", label: "Nombre", required: true },
    { id: "traeAcompanante", label: "¿Traes acompañante?", required: false },
    { id: "nombreAcompanante", label: "Nombre del acompañante", required: true },
    { id: "seQuedaACenar", label: "¿Te quedas a cenar?", required: true },
    { id: "alergias", label: "Alergias", required: false },
    { id: "bebidas", label: "Bebidas", required: true, type: "select", options: Object.values(drinkLabels) },
    { id: "comentarios", label: "Comentarios", required: false }
  ],
  rules: [
    { id: "r-1", label: "Terminar bebida alcohólica", value: 2 },
    { id: "r-2", label: "Terminar bebida normal", value: 1 },
    { id: "r-3", label: "Ganar a los dardos", value: 5 },
    { id: "r-4", label: "Ganar al billar", value: 5 },
    { id: "r-5", label: "Ganar al ping pong", value: 5 },
    { id: "r-6", label: "Ganar al beer pong", value: 5 },
    { id: "r-7", label: "Ganar al cornhole", value: 5 },
    { id: "r-8", label: "Ganar una vez a todos los juegos", value: 20 }
  ],
  history: []
};

const cleanOptions = (question: QuestionConfig) => {
  const options = question.options || question.opciones || [];
  return options.map((option) => option.trim()).filter(Boolean);
};

const normalizeQuestion = (question: QuestionConfig): QuestionConfig => {
  const type = question.type || defaultQuestionTypes[question.id] || "text";
  const options = cleanOptions(question);

  if (question.id === "bebidas") {
    return {
      ...question,
      type: "select",
      options: options.length ? options : Object.values(drinkLabels)
    };
  }

  if (type === "yes_no") {
    return {
      ...question,
      type,
      options: options.length ? options : ["SÃ­", "No"]
    };
  }

  if (type === "select") {
    return {
      ...question,
      type,
      options
    };
  }

  return {
    ...question,
    type
  };
};

const normalizeState = (state: State): State => {
  const incomingQuestions = state.questions || [];
  const baseIds = new Set(initialState.questions.map((question) => question.id));
  const mergedBaseQuestions = initialState.questions.map((baseQuestion) =>
    normalizeQuestion({
      ...baseQuestion,
      ...incomingQuestions.find((question) => question.id === baseQuestion.id)
    })
  );
  const extraQuestions = incomingQuestions
    .filter((question) => !baseIds.has(question.id))
    .map(normalizeQuestion);

  return {
    ...state,
    questions: [...mergedBaseQuestions, ...extraQuestions]
  };
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return normalizeState(action.state);
    case "addAttendees":
      return { ...state, attendees: [...state.attendees, ...action.attendees] };
    case "updateAttendee":
      return {
        ...state,
        attendees: state.attendees.map((attendee) =>
          attendee.id === action.attendee.id ? action.attendee : attendee
        )
      };
    case "deleteAttendee":
      return {
        ...state,
        attendees: state.attendees.filter((attendee) => attendee.id !== action.id),
        history: state.history.filter((entry) => entry.attendeeId !== action.id)
      };
    case "applyPointAction": {
      const attendee = state.attendees.find((item) => item.id === action.id);
      if (!attendee) return state;
      const entry: PointHistory = {
        id: uid(),
        attendeeId: attendee.id,
        attendeeName: attendee.nombre,
        label: action.label,
        value: action.value,
        createdAt: new Date().toISOString()
      };
      return {
        ...state,
        attendees: state.attendees.map((item) =>
          item.id === action.id ? { ...item, puntos: item.puntos + action.value } : item
        ),
        history: [entry, ...state.history]
      };
    }
    case "setPoints": {
      const attendee = state.attendees.find((item) => item.id === action.id);
      if (!attendee) return state;
      const value = action.points - attendee.puntos;
      return {
        ...state,
        attendees: state.attendees.map((attendee) =>
          attendee.id === action.id ? { ...attendee, puntos: action.points } : attendee
        ),
        history:
          value === 0
            ? state.history
            : [
                {
                  id: uid(),
                  attendeeId: attendee.id,
                  attendeeName: attendee.nombre,
                  label: action.label || "Ajuste manual",
                  value,
                  createdAt: new Date().toISOString()
                },
                ...state.history
              ]
      };
    }
    case "addQuestion":
      return { ...state, questions: [...state.questions, action.question] };
    case "updateQuestion":
      return {
        ...state,
        questions: state.questions.map((question) =>
          question.id === action.question.id ? action.question : question
        )
      };
    case "deleteQuestion":
      return { ...state, questions: state.questions.filter((question) => question.id !== action.id) };
    case "addRule":
      return { ...state, rules: [...state.rules, action.rule] };
    case "updateRule":
      return {
        ...state,
        rules: state.rules.map((rule) => (rule.id === action.rule.id ? action.rule : rule))
      };
    case "deleteRule":
      return { ...state, rules: state.rules.filter((rule) => rule.id !== action.id) };
    default:
      return state;
  }
}

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function Home() {
  const [state, rawDispatch] = useReducer(reducer, initialState);
  const [view, setView] = useState("inicio");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [toast, setToast] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Conectando con Supabase");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localChangeVersion = useRef(0);
  const savedChangeVersion = useRef(0);
  const questionChangeVersion = useRef(0);

  const dispatch = useCallback<React.Dispatch<Action>>((action) => {
    if (action.type !== "hydrate") {
      const nextVersion = localChangeVersion.current + 1;
      localChangeVersion.current = nextVersion;

      if (action.type === "addQuestion" || action.type === "updateQuestion" || action.type === "deleteQuestion") {
        questionChangeVersion.current = nextVersion;
      }
    }
    rawDispatch(action);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const response = await fetch("/api/state", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "No se pudo cargar el estado.");
        }

        if (!cancelled && payload.state) {
          dispatch({ type: "hydrate", state: payload.state });
        }
        if (!cancelled) {
          setIsHydrated(true);
          setSyncStatus(payload.state ? "Datos sincronizados" : "Estado inicial preparado");
        }
      } catch (error) {
        if (!cancelled) {
          setIsHydrated(true);
          setSyncStatus("Modo local: revisa la configuración de Supabase");
          console.error(error);
        }
      }
    }

    loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const versionToSave = localChangeVersion.current;
    if (versionToSave === savedChangeVersion.current) return;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current as ReturnType<typeof setTimeout>);
    }

    saveTimer.current = setTimeout(async () => {
      try {
        setSyncStatus("Guardando cambios");
        let stateToSave = state;

        if (questionChangeVersion.current <= savedChangeVersion.current) {
          const latestResponse = await fetch("/api/state", { cache: "no-store" });
          const latestPayload = await latestResponse.json();

          if (!latestResponse.ok) {
            throw new Error(latestPayload?.error || "No se pudo comprobar el estado actual.");
          }

          if (latestPayload.state?.questions) {
            stateToSave = {
              ...state,
              questions: latestPayload.state.questions
            };
          }
        }

        const response = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: stateToSave })
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "No se pudo guardar el estado.");
        }

        savedChangeVersion.current = Math.max(savedChangeVersion.current, versionToSave);
        if (stateToSave !== state) {
          rawDispatch({ type: "hydrate", state: stateToSave });
        }
        setSyncStatus("Datos sincronizados");
      } catch (error) {
        setSyncStatus("Cambios solo en memoria: revisa Supabase");
        console.error(error);
      }
    }, 700);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current as ReturnType<typeof setTimeout>);
      }
    };
  }, [state, isHydrated]);

  return (
    <main className="min-h-screen">
      <nav className="sticky top-0 z-30 border-b border-white/10 bg-fondo/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-1 items-center justify-between gap-3 min-w-0">
            <button
              onClick={() => {
                setView("inicio");
                setMobileMenuOpen(false);
              }}
              className="flex min-w-0 items-center gap-2 text-left"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-neon to-violeta text-slate-950">
                <Sparkles size={18} />
              </span>
              <span className="truncate text-sm font-black tracking-wide sm:text-base">VILLAGIL FEST 2026</span>
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 sm:hidden"
              onClick={() => setMobileMenuOpen((current) => !current)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className="hidden flex-wrap gap-1 overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-1 sm:flex">
            {[
              ["inicio", "Inicio"],
              ["inscripcion", "Inscripción"],
              ["ranking", "Ranking"],
              ["admin", "Admin"]
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition ${
                  view === id ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/10 bg-fondo/95 px-4 pb-3">
            <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
              {[
                ["inicio", "Inicio"],
                ["inscripcion", "Inscripción"],
                ["ranking", "Ranking"],
                ["admin", "Admin"]
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setView(id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full rounded-md px-3 py-3 text-left text-sm font-semibold transition ${
                    view === id ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {view === "inicio" && <HomeView onPoster={() => setPosterOpen(true)} onSignup={() => setView("inscripcion")} />}
      {view === "inscripcion" && !isHydrated && (
        <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md place-items-center px-4 py-8">
          <div className="w-full rounded-lg border border-white/10 bg-white/10 p-5 text-center">
            <p className="font-black text-white">Cargando inscripción</p>
            <p className="mt-2 text-sm text-slate-300">Sincronizando opciones desde Supabase.</p>
          </div>
        </section>
      )}
      {view === "inscripcion" && isHydrated && (
        <SignupView
          questions={state.questions}
          dispatch={dispatch}
          showToast={showToast}
          onPoster={() => setPosterOpen(true)}
        />
      )}
      {view === "ranking" && (
        <RankingView
          attendees={state.attendees}
          rules={state.rules}
          history={state.history}
          dispatch={dispatch}
        />
      )}
      
      {view === "admin" &&
        (adminUnlocked ? (
          <AdminView state={state} dispatch={dispatch} />
        ) : (
          <AdminGate onUnlock={() => setAdminUnlocked(true)} />
        ))}

      {posterOpen && <PosterModal onClose={() => setPosterOpen(false)} />}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-neon/40 bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-neon">
          <div className="flex items-center gap-2">
            <Check className="text-neon" size={18} />
            {toast}
          </div>
        </div>
      )}
    </main>
  );
}

function HomeView({ onPoster, onSignup }: { onPoster: () => void; onSignup: () => void }) {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-6 px-4 py-6 sm:py-8 sm:gap-8 lg:grid-cols-[1fr_0.82fr]">
      <div className="space-y-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-neon/30 bg-neon/10 px-4 py-2 text-sm font-semibold text-neon">
          <Clock3 size={16} />
          4 de julio de 2026 · 17:00 HRS
        </div>
        <div className="space-y-4">
          <h1 className="max-w-4xl bg-gradient-to-r from-neon via-white to-violeta bg-clip-text text-5xl font-black uppercase leading-none text-transparent sm:text-7xl lg:text-8xl">
            VILLAGIL FEST 2026
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
            ¡Vuelve el evento del verano! Cumplo 29 años y lo celebramos de la mejor manera:
            piscina, barra libre, cena, los 3 escenarios oficiales de siempre y un montón de juegos.
            Id preparando vuestro mejor look y venid con ganas de darlo todo.
          </p>
        </div>
        <div className="grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
          <InfoPill icon={<CalendarDays size={18} />} text="4 de julio de 2026 (17:00 HRS)" />
          <InfoPill
            icon={<MapPin size={18} />}
            text="Urbanización Casa de Campo, Calle de Luis Tristán 7, Toledo"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={onPoster}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon to-violeta px-6 py-3 font-black text-slate-950 shadow-neon transition hover:scale-[1.01]"
          >
            <Eye size={20} />
            Ver el Lineup Oficial
          </button>
          <button
            onClick={onSignup}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/15"
          >
            <Users size={20} />
            Inscribirme
          </button>
        </div>
      </div>
      <button
        onClick={onPoster}
        className="group relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-white/15 bg-white/10 p-2 shadow-2xl"
        aria-label="Abrir cartel oficial"
      >
        <Image
          src="/cartel.jpg"
          alt="Cartel oficial de VILLAGIL FEST 2026"
          width={1200}
          height={1600}
          priority
          className="h-auto w-full rounded-md object-cover transition duration-300 group-hover:scale-[1.015]"
        />
      </button>
      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-lg border border-white/10 bg-white/10 p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neon/30 bg-neon/10 text-neon">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black sm:text-2xl">Dress Code & Premio Outfit</h2>
              <p className="text-sm font-semibold text-slate-300">Venid con rollazo festivalero.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4">
              <p className="text-sm font-bold leading-6 text-amber-100 sm:text-base">
                A las 18:00 se cierra la votación popular al mejor outfit. ¡El ganador se lleva
                +200 pts directos para el ranking!
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/55 p-4">
              <p className="text-sm font-semibold leading-6 text-slate-200">
                Prohibida la purpurina por el bien de la piscina.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/10 p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-neon/30 bg-neon/10 text-neon">
              <Trophy size={20} />
            </span>
            <div>
              <h2 className="text-xl font-black sm:text-2xl">Guía del Ranking VillaGil</h2>
              <p className="text-sm font-semibold text-slate-300">Los 3 mejores tendrán premio.</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-950/55 p-4">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neon">Bebidas</h3>
              <div className="grid gap-2 text-sm font-semibold text-slate-200 sm:grid-cols-3">
                <span className="rounded-md bg-white/5 px-3 py-2">Refresco · 40 pts</span>
                <span className="rounded-md bg-white/5 px-3 py-2">Cerveza/Tinto · 50 pts</span>
                <span className="rounded-md bg-white/5 px-3 py-2">Chupito · 20 pts</span>
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-950/55 p-4">
              <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-neon">Juegos</h3>
              <div className="grid gap-2 text-sm font-semibold text-slate-200 sm:grid-cols-2">
                <span className="rounded-md bg-white/5 px-3 py-2">Dardos · 20 pts</span>
                <span className="rounded-md bg-white/5 px-3 py-2">Cornhole · 30 pts</span>
                <span className="rounded-md bg-white/5 px-3 py-2">Ping-pong · 30 pts</span>
                <span className="rounded-md bg-white/5 px-3 py-2">Beer-pong · 40 pts</span>
                <span className="rounded-md bg-white/5 px-3 py-2 sm:col-span-2">Billar · 50 pts</span>
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-4">
              <p className="text-sm font-black leading-6 text-emerald-200 sm:text-base">
                Bonus: +250 pts si ganas al menos una vez a los 5 juegos.
              </p>
            </div>
            <div className="rounded-lg border border-violeta/30 bg-violeta/10 p-4">
              <p className="text-sm font-semibold leading-6 text-slate-200">
                Misiones especiales: estad atentos, en cualquier momento los jueces pueden lanzar
                misiones sorpresa por puntos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoPill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-lg border border-white/10 bg-white/10 px-4 py-3">
      <span className="text-neon">{icon}</span>
      <span className="font-semibold">{text}</span>
    </div>
  );
}

function SignupView({
  questions,
  dispatch,
  showToast,
  onPoster
}: {
  questions: QuestionConfig[];
  dispatch: React.Dispatch<Action>;
  showToast: (message: string) => void;
  onPoster: () => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    traeAcompanante: false,
    nombreAcompanante: "",
    seQuedaACenar: true,
    alergias: "",
    bebidas: [] as Drink[],
    comentarios: ""
  });
  const [extraAnswers, setExtraAnswers] = useState<Record<string, string>>({});

  const question = (id: string) =>
    questions.find((item) => item.id === id) || { id, label: id, required: false, type: "text" };
  const extraQuestions = questions.filter((item) => item.id.startsWith("extra-"));
  const beverageQuestion = question("bebidas");
  const beverageOptions = getDrinkOptions(beverageQuestion);
  const toggleDrink = (drink: Drink) => {
    setForm((current) => ({
      ...current,
      bebidas: current.bebidas.includes(drink)
        ? current.bebidas.filter((item) => item !== drink)
        : [...current.bebidas, drink]
    }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const main: Attendee = { id: uid(), ...form, puntos: 0, respuestas: extraAnswers };
    const attendees = [main];
    if (form.traeAcompanante) {
      attendees.push({
        id: uid(),
        nombre: form.nombreAcompanante,
        traeAcompanante: false,
        seQuedaACenar: form.seQuedaACenar,
        alergias: form.alergias,
        bebidas: form.bebidas,
        comentarios: `Acompañante de ${form.nombre}`,
        puntos: 0,
        respuestas: extraAnswers
      });
    }
    dispatch({ type: "addAttendees", attendees });
    setForm({
      nombre: "",
      traeAcompanante: false,
      nombreAcompanante: "",
      seQuedaACenar: true,
      alergias: "",
      bebidas: [],
      comentarios: ""
    });
    setExtraAnswers({});
    showToast("Inscripción registrada correctamente.");
  };

  return (
    <section className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:py-8 sm:gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <aside className="space-y-4">
        <h2 className="text-3xl font-black">Inscripción</h2>
        <p className="text-slate-300">
          Completa la información para confirmar asistencia. Consulta el cartel oficial para ver el
          lineup completo.
        </p>
        <button
          onClick={onPoster}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neon/30 bg-neon/10 px-4 py-2 font-bold text-neon"
        >
          <Eye size={18} />
          Ver el cartel oficial
        </button>
      </aside>
      <form onSubmit={submit} className="space-y-3 sm:space-y-5 rounded-lg border border-white/10 bg-white/10 p-3 sm:p-6">
        <Field label={question("nombre").label} required={question("nombre").required}>
          <input
            required={question("nombre").required}
            value={form.nombre}
            onChange={(event) => setForm({ ...form, nombre: event.target.value })}
            className="input text-xs sm:text-sm"
            placeholder="Tu nombre"
          />
        </Field>
        <ToggleRow
          label={question("traeAcompanante").label}
          checked={form.traeAcompanante}
          onChange={(checked) => setForm({ ...form, traeAcompanante: checked })}
        />
        <div
          className={`grid transition-all duration-300 ${
            form.traeAcompanante ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <Field label={question("nombreAcompanante").label} required={form.traeAcompanante}>
              <input
                required={form.traeAcompanante}
                value={form.nombreAcompanante}
                onChange={(event) => setForm({ ...form, nombreAcompanante: event.target.value })}
                className="input text-xs sm:text-sm"
                placeholder="Nombre del acompañante"
              />
            </Field>
          </div>
        </div>
        <ToggleRow
          label={question("seQuedaACenar").label}
          checked={form.seQuedaACenar}
          onChange={(checked) => setForm({ ...form, seQuedaACenar: checked })}
        />
        <Field label={question("alergias").label} required={question("alergias").required}>
          <input
            required={question("alergias").required}
            value={form.alergias}
            onChange={(event) => setForm({ ...form, alergias: event.target.value })}
            className="input text-xs sm:text-sm"
            placeholder="Indica alergias o intolerancias"
          />
        </Field>
        <Field label={beverageQuestion.label} required={beverageQuestion.required}>
          <div className="flex flex-col gap-2">
            {beverageOptions.map((drink) => (
              <button
                key={drink}
                type="button"
                onClick={() => toggleDrink(drink)}
                className={`flex min-h-10 items-center justify-between rounded-lg border px-3 text-left text-xs font-bold transition sm:min-h-12 sm:text-sm ${
                  form.bebidas.includes(drink)
                    ? "border-neon bg-neon text-slate-950"
                    : "border-white/12 bg-slate-950/50 text-slate-200"
                }`}
              >
                <span>{getDrinkLabel(drink)}</span>
                {form.bebidas.includes(drink) && <Check size={16} />}
              </button>
            ))}
          </div>
          <select
            className="sr-only"
            required={beverageQuestion.required}
            value={form.bebidas.length ? "ok" : ""}
            onChange={() => undefined}
          >
            <option value="">Sin selección</option>
            <option value="ok">Seleccionado</option>
          </select>
        </Field>
        <Field label={question("comentarios").label} required={question("comentarios").required}>
          <textarea
            required={question("comentarios").required}
            value={form.comentarios}
            onChange={(event) => setForm({ ...form, comentarios: event.target.value })}
            className="input min-h-20 sm:min-h-28 resize-y text-xs sm:text-sm"
            placeholder="Cualquier comentario útil"
          />
        </Field>
        {extraQuestions.map((item) => (
          <DynamicQuestionField
            key={item.id}
            question={item}
            value={extraAnswers[item.id] || ""}
            onChange={(value) => setExtraAnswers({ ...extraAnswers, [item.id]: value })}
          />
        ))}
        <button className="inline-flex min-h-10 sm:min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon to-violeta px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-black text-slate-950">
          <Save size={16} />
          Enviar inscripción
        </button>
      </form>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 sm:space-y-2">
      <span className="text-xs sm:text-sm font-bold text-slate-200">
        {label} {required && <span className="text-neon">*</span>}
      </span>
      {children}
    </label>
  );
}

function DynamicQuestionField({
  question,
  value,
  onChange
}: {
  question: QuestionConfig;
  value: string;
  onChange: (value: string) => void;
}) {
  const type = question.type || "text";
  const options = type === "yes_no" ? ["Sí", "No"] : question.options || [];

  if (type === "yes_no" || type === "select") {
    return (
      <Field label={question.label} required={question.required}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`min-h-10 sm:min-h-12 rounded-lg border px-2 sm:px-3 text-xs sm:text-sm font-bold transition ${
                value === option
                  ? "border-neon bg-neon text-slate-950"
                  : "border-white/12 bg-slate-950/50 text-slate-200"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <select
          className="sr-only"
          required={question.required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Sin selección</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  return (
    <Field label={question.label} required={question.required}>
      <input
        required={question.required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input"
        placeholder="Respuesta"
      />
    </Field>
  );
}

function ToggleRow({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4 rounded-lg border border-white/10 bg-slate-950/40 p-3 sm:p-4">
      <span className="text-xs sm:text-sm font-bold text-slate-100 flex-1">{label}</span>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span className="min-w-7 sm:min-w-8 text-right text-xs sm:text-sm font-black text-neon">{checked ? "Sí" : "No"}</span>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`relative h-7 sm:h-8 w-12 sm:w-14 rounded-full transition ${checked ? "bg-neon" : "bg-slate-700"}`}
          aria-label={label}
        >
          <span
            className={`absolute top-0.5 sm:top-1 h-6 w-6 rounded-full bg-white transition ${
              checked ? "left-6 sm:left-7" : "left-0.5 sm:left-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function RankingView({
  attendees,
  rules,
  history,
  dispatch
}: {
  attendees: Attendee[];
  rules: PointRule[];
  history: PointHistory[];
  dispatch?: React.Dispatch<Action>;
}) {
  const [remaining, setRemaining] = useState(300);
  const [polledAttendees, setPolledAttendees] = useState<Attendee[]>(attendees);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    setPolledAttendees(attendees);
  }, [attendees]);

  const ranked = useMemo(() => [...polledAttendees].sort((a, b) => b.puntos - a.puntos), [polledAttendees]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining((current) => (current <= 1 ? 300 : current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // When the countdown reaches 0, refresh ranking from the server and reset
  useEffect(() => {
    if (remaining !== 0) return;

    let cancelled = false;
    (async function refresh() {
      try {
        const res = await fetch('/api/state');
        if (!res.ok) throw new Error('Failed to fetch state');
        const payload = await res.json();
        if (!cancelled && payload?.state) {
          // Update global state if dispatch is available so whole app reflects changes
          if (dispatch) {
            try {
              dispatch({ type: 'hydrate', state: payload.state });
            } catch (err) {
              console.error('[RankingView] dispatch error:', err);
            }
          }
          setPolledAttendees(payload.state.attendees ?? []);
        }
      } catch (error) {
        console.error('[RankingView] Error refrescando ranking:', error instanceof Error ? error.message : error);
      } finally {
        if (!cancelled) setRemaining(300);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [remaining, dispatch]);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to fetch state');
      const payload = await res.json();
      if (payload?.state) {
        if (dispatch) {
          try {
            dispatch({ type: 'hydrate', state: payload.state });
          } catch (err) {
            console.error('[RankingView] dispatch error on manual refresh:', err);
          }
        }
        setPolledAttendees(payload.state.attendees ?? []);
        setRefreshMessage('Datos actualizados');
      } else {
        setRefreshMessage('No hay datos');
      }
    } catch (error) {
      console.error('[RankingView] Error recargando ranking:', error instanceof Error ? error.message : error);
      setRefreshMessage('Error al recargar');
    } finally {
      setRefreshing(false);
      setTimeout(() => setRefreshMessage(''), 3000);
      setRemaining(300);
    }
  };

  const minutes = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");

  return (
    <section className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 sm:py-8 lg:grid lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 rounded-lg border border-white/10 bg-white/10 p-3 sm:p-6">
        <div className="mb-3 sm:mb-5 flex flex-col justify-between gap-2 sm:gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black">Ranking Live</h2>
            <p className="text-xs sm:text-sm text-slate-300">Clasificación ordenada por puntos.</p>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center">
            <div className="flex max-w-full items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-300 sm:px-3 sm:py-2 sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Actualizando · {minutes}:{seconds}
            </div>
            <div className="flex max-w-full flex-wrap items-center gap-1">
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-md px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold ${viewMode === 'list' ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
                aria-pressed={viewMode === 'list'}
              >
                Lista
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-md px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold ${viewMode === 'grid' ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
                aria-pressed={viewMode === 'grid'}
              >
                Grid
              </button>
              <button
                onClick={handleRefresh}
                className={`rounded-md px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold ${refreshing ? 'bg-white text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}
                aria-pressed={refreshing}
              >
                {refreshing ? 'Recargando...' : (
                  <>
                    <RefreshCw size={14} /> 
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        {refreshMessage && <div className="mt-2 text-sm font-semibold text-emerald-300">{refreshMessage}</div>}
        {viewMode === 'list' ? (
          <>
          <div className="space-y-2 sm:hidden">
            {ranked.map((attendee, index) => {
              const rowBg =
                index === 0
                  ? 'bg-amber-600/10'
                  : index === 1
                  ? 'bg-slate-400/6'
                  : index === 2
                  ? 'bg-orange-700/8'
                  : 'bg-slate-950/60';

              const posColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-300' : 'text-neon';

              return (
                <div key={attendee.id} className={`flex min-w-0 items-center gap-3 rounded-lg p-3 ${rowBg}`}>
                  <div className={`flex shrink-0 items-center gap-1 text-sm font-black ${posColor}`}>
                    <Trophy className={posColor} size={16} />
                    <span>#{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1 truncate font-bold">{attendee.nombre}</div>
                  <div className="shrink-0 text-right text-xl font-black">{attendee.puntos}</div>
                </div>
              );
            })}
          </div>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[32rem] border-separate border-spacing-y-2">
              <thead className="text-left text-sm text-slate-400">
                <tr>
                  <th className="px-3 py-2">Posición</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2 text-right">Puntos</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((attendee, index) => {
                  const rowBg =
                    index === 0
                      ? 'bg-amber-600/10'
                      : index === 1
                      ? 'bg-slate-400/6'
                      : index === 2
                      ? 'bg-orange-700/8'
                      : 'bg-slate-950/60';

                  const posColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-300' : 'text-neon';

                  return (
                    <tr key={attendee.id} className={rowBg}>
                      <td className={`rounded-l-lg px-3 py-4 font-black ${posColor}`}>
                        <div className="flex items-center gap-2">
                          <Trophy className={`${posColor}`} size={18} />
                          <span>#{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 font-bold">{attendee.nombre}</td>
                      <td className="rounded-r-lg px-3 py-4 text-right text-xl font-black">{attendee.puntos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        ) : (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {ranked.map((a, idx) => {
              const cardBg =
                idx === 0
                  ? 'bg-amber-600/10'
                  : idx === 1
                  ? 'bg-slate-400/6'
                  : idx === 2
                  ? 'bg-orange-700/8'
                  : 'bg-slate-950/60';

              const posColor = idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-orange-300' : 'text-neon';

              return (
                <div key={a.id} className={`min-w-0 rounded-lg border border-white/10 p-3 sm:p-4 ${cardBg}`}>
                  <div className="flex min-w-0 items-center justify-between gap-3 sm:gap-4">
                    <div className={`flex shrink-0 items-center gap-2 text-sm font-black ${posColor}`}>
                      <Trophy className={posColor} size={18} />
                      <span>#{idx + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1 truncate text-center text-base font-black sm:text-lg">{a.nombre}</div>
                    <div className="shrink-0 text-2xl font-black">{a.puntos}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <aside className="rounded-lg border border-white/10 bg-white/10 p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="text-neon" />
          <h3 className="text-xl font-black">Reglas de puntos</h3>
        </div>
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/55 p-3">
              <span className="text-sm font-semibold text-slate-200">{rule.label}</span>
              <span className="rounded-md bg-neon/15 px-2 py-1 font-black text-neon">
                {rule.value > 0 ? "+" : ""}
                {rule.value}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="mb-4 flex items-center gap-2">
            <History className="text-neon" size={20} />
            <h3 className="text-xl font-black">Historial</h3>
          </div>
          <PointHistoryList history={history.slice(0, 8)} />
        </div>
      </aside>
    </section>
  );
}

/* GridView removed — grid is now toggled inside RankingView */

function AdminGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (password === "villagil2026") {
      onUnlock();
      return;
    }
    setError("Contraseña incorrecta.");
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-md place-items-center px-4 py-6 sm:py-8">
      <form onSubmit={submit} className="w-full space-y-3 sm:space-y-5 rounded-lg border border-white/10 bg-white/10 p-4 sm:p-6">
        <div className="grid h-10 sm:h-12 w-10 sm:w-12 place-items-center rounded-lg bg-neon/15 text-neon">
          <Lock size={20} />
        </div>
        <div>
          <h2 className="text-lg sm:text-2xl font-black">Acceso de administración</h2>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-300">Introduce la contraseña para abrir el panel.</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input text-xs sm:text-sm"
          placeholder="Contraseña"
        />
        {error && <p className="text-xs sm:text-sm font-bold text-rose-300">{error}</p>}
        <button className="inline-flex min-h-10 sm:min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon to-violeta px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-black text-slate-950">
          <ShieldCheck size={16} />
          Entrar
        </button>
      </form>
    </section>
  );
}

function AdminView({ state, dispatch }: { state: State; dispatch: React.Dispatch<Action> }) {
  const [tab, setTab] = useState("respuestas");
  const tabs = [
    ["respuestas", "Respuestas"],
    ["control", "Ranking"],
    ["preguntas", "Preguntas"],
    ["reglas", "Reglas"]
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <Settings className="text-neon" />
        <div>
          <h2 className="text-3xl font-black">Panel de Administración</h2>
          <p className="text-slate-300">Gestión completa del evento en modo simulado.</p>
        </div>
      </div>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-white/10 bg-white/10 p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`min-h-11 whitespace-nowrap rounded-md px-4 text-sm font-black ${
              tab === id ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "respuestas" && (
        <ResponsesTab attendees={state.attendees} questions={state.questions} dispatch={dispatch} />
      )}
      {tab === "control" && (
        <QuickControlTab
          attendees={state.attendees}
          rules={state.rules}
          history={state.history}
          dispatch={dispatch}
        />
      )}
      {tab === "preguntas" && <QuestionsTab questions={state.questions} dispatch={dispatch} />}
      {tab === "reglas" && <RulesTab rules={state.rules} dispatch={dispatch} />}
    </section>
  );
}

function ResponsesTab({
  attendees,
  questions,
  dispatch
}: {
  attendees: Attendee[];
  questions: QuestionConfig[];
  dispatch: React.Dispatch<Action>;
}) {
  const [editing, setEditing] = useState<Attendee | null>(null);
  const dinner = attendees.filter((attendee) => attendee.seQuedaACenar).length;
  const drinkTotal = attendees.reduce((total, attendee) => total + attendee.bebidas.length, 0) || 1;
  const questionLabels = Object.fromEntries(questions.map((question) => [question.id, question.label]));
  const beverageQuestion = questions.find((question) => question.id === "bebidas");
  const beverageOptions = getDrinkOptions(beverageQuestion);

  return (
    <div className="space-y-6">
      <div className="grid gap-2 sm:gap-3 sm:grid-cols-3">
        <SummaryCard label="Total asistentes" value={attendees.length.toString()} />
        <SummaryCard label="Se quedan a cenar" value={dinner.toString()} />
        <SummaryCard label="No cenan" value={(attendees.length - dinner).toString()} />
      </div>
      <div className="rounded-lg border border-white/10 bg-white/10 p-4">
        <h3 className="mb-4 text-xl font-black">Bebidas</h3>
        <div className="space-y-3">
          {beverageOptions.map((drink) => {
            const count = attendees.filter((attendee) =>
              attendee.bebidas.some((attendeeDrink) => drinkMatchesOption(attendeeDrink, drink))
            ).length;
            const percent = Math.round((count / drinkTotal) * 100);
            return (
              <div key={drink}>
                <div className="mb-1 flex justify-between text-sm font-bold">
                  <span>{getDrinkLabel(drink)}</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800">
                  <div className="h-3 rounded-full bg-gradient-to-r from-neon to-violeta" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="-mx-4 overflow-x-auto rounded-lg border border-white/10 bg-white/10 p-2 sm:mx-0">
        <table className="w-full min-w-[50rem] sm:min-w-[76rem] text-xs sm:text-sm">
          <thead className="text-left text-slate-400">
            <tr>
              {["Nombre", "Acompañante", "Cena", "Bebidas", "Puntos", "Acciones"].map(
                (header) => (
                  <th key={header} className="px-3 py-3">
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {attendees.map((attendee) => (
              <tr key={attendee.id} className="border-t border-white/10">
                <td className="px-2 sm:px-3 py-3 font-bold">{attendee.nombre}</td>
                <td className="px-2 sm:px-3 py-3 text-xs sm:text-sm">{attendee.nombreAcompanante || "No"}</td>
                <td className="px-2 sm:px-3 py-3 text-xs sm:text-sm">{attendee.seQuedaACenar ? "Sí" : "No"}</td>
                <td className="px-2 sm:px-3 py-3 text-xs sm:text-sm">{attendee.bebidas.map((drink) => getDrinkLabel(drink)).join(", ")}</td>
                <td className="px-2 sm:px-3 py-3 font-black text-neon text-right">{attendee.puntos}</td>
                <td className="px-2 sm:px-3 py-3">
                  <div className="flex gap-1 sm:gap-2">
                    <IconButton label="Editar" onClick={() => setEditing(attendee)} icon={<Edit3 size={14} />} />
                    <IconButton
                      label="Eliminar"
                      onClick={() => dispatch({ type: "deleteAttendee", id: attendee.id })}
                      icon={<Trash2 size={14} />}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <EditAttendeeModal attendee={editing} onClose={() => setEditing(null)} dispatch={dispatch} />}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/10 p-4">
      <p className="text-sm font-bold text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function QuickControlTab({
  attendees,
  rules,
  history,
  dispatch
}: {
  attendees: Attendee[];
  rules: PointRule[];
  history: PointHistory[];
  dispatch: React.Dispatch<Action>;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Attendee | null>(null);
  const filtered = attendees.filter((attendee) => attendee.nombre.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-4">
      <label className="flex min-h-12 items-center gap-3 rounded-lg border border-white/10 bg-white/10 px-4">
        <Search className="text-neon" size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-500"
          placeholder="Buscar asistente"
        />
      </label>
      <div className="space-y-2">
        {filtered.map((attendee) => (
          <div
            key={attendee.id}
            className="grid gap-3 rounded-lg border border-white/10 bg-white/10 p-3 lg:grid-cols-[1fr_auto_auto_8rem] lg:items-center"
          >
            <div>
              <p className="font-black">{attendee.nombre}</p>
              <p className="text-sm text-slate-400">{attendee.puntos} puntos</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[-1, 1, 5, 10].map((delta) => (
                <button
                  key={delta}
                  onClick={() =>
                    dispatch({
                      type: "applyPointAction",
                      id: attendee.id,
                      value: delta,
                      label: delta > 0 ? `Ajuste rápido +${delta}` : `Ajuste rápido ${delta}`
                    })
                  }
                  className="min-h-10 sm:min-h-12 rounded-lg border border-neon/25 bg-neon/10 px-2 sm:px-3 text-xs sm:text-sm font-black text-neon active:scale-95"
                >
                  {delta > 0 ? `+${delta}` : delta}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSelected(attendee)}
              className="inline-flex min-h-10 sm:min-h-12 items-center justify-center gap-2 rounded-lg border border-violeta/30 bg-violeta/10 px-3 sm:px-4 text-xs sm:text-sm font-black text-violeta active:scale-95 sm:col-span-2"
            >
              <Plus size={18} />
              Acción
            </button>
            <input
              type="number"
              value={attendee.puntos}
              onChange={(event) =>
                dispatch({
                  type: "setPoints",
                  id: attendee.id,
                  points: Number(event.target.value || 0),
                  label: "Ajuste manual en control rápido"
                })
              }
              className="input min-h-10 sm:min-h-12 text-center text-xs sm:text-sm font-black"
              aria-label={`Puntos de ${attendee.nombre}`}
            />
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/10 bg-white/10 p-4">
        <div className="mb-4 flex items-center gap-2">
          <History className="text-neon" size={20} />
          <h3 className="text-xl font-black">Historial de puntos</h3>
        </div>
        <PointHistoryList history={history} />
      </div>
      {selected && (
        <PointActionModal
          attendee={selected}
          rules={rules}
          dispatch={dispatch}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PointActionModal({
  attendee,
  rules,
  dispatch,
  onClose
}: {
  attendee: Attendee;
  rules: PointRule[];
  dispatch: React.Dispatch<Action>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"rule" | "custom">("rule");
  const [ruleId, setRuleId] = useState(rules[0]?.id || "");
  const [customLabel, setCustomLabel] = useState("");
  const [customValue, setCustomValue] = useState(1);
  const selectedRule = rules.find((rule) => rule.id === ruleId) || rules[0];

  const apply = () => {
    const label = mode === "rule" ? selectedRule?.label : customLabel.trim();
    const value = mode === "rule" ? selectedRule?.value : customValue;
    if (!label || typeof value !== "number") return;
    dispatch({ type: "applyPointAction", id: attendee.id, label, value });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-slate-950 p-4 sm:p-5">
        <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-black">Añadir puntos</h3>
            <p className="text-xs sm:text-sm text-slate-300">{attendee.nombre}</p>
          </div>
          <IconButton label="Cerrar" onClick={onClose} icon={<X size={17} />} />
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-1">
          {[
            ["rule", "Regla"],
            ["custom", "Personal."]
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMode(id as "rule" | "custom")}
              className={`min-h-10 sm:min-h-11 rounded-md text-xs sm:text-sm font-black ${
                mode === id ? "bg-white text-slate-950" : "text-slate-200 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 sm:mt-5 space-y-3 sm:space-y-4">
          {mode === "rule" ? (
            <Field label="Acción" required>
              <select value={ruleId} onChange={(event) => setRuleId(event.target.value)} className="input text-xs sm:text-sm">
                {rules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.label} ({rule.value > 0 ? "+" : ""}
                    {rule.value})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <>
              <Field label="Nombre de la acción" required>
                <input
                  value={customLabel}
                  onChange={(event) => setCustomLabel(event.target.value)}
                  className="input text-xs sm:text-sm"
                  placeholder="Ej: Penalización por retraso"
                />
              </Field>
              <Field label="Puntos" required>
                <input
                  type="number"
                  value={customValue}
                  onChange={(event) => setCustomValue(Number(event.target.value || 0))}
                  className="input text-xs sm:text-sm"
                />
              </Field>
            </>
          )}
          <button
            onClick={apply}
            className="inline-flex min-h-10 sm:min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon to-violeta px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-black text-slate-950"
          >
            <Plus size={16} />
            Aplicar puntos
          </button>
        </div>
      </div>
    </div>
  );
}

function PointHistoryList({ history }: { history: PointHistory[] }) {
  if (!history.length) {
    return <p className="text-sm text-slate-400">Todavía no hay movimientos de puntos.</p>;
  }

  return (
    <div className="max-h-96 space-y-2 overflow-auto pr-1">
      {history.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-white/10 bg-slate-950/55 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-black">{entry.attendeeName}</p>
              <p className="text-sm text-slate-300">{entry.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Date(entry.createdAt).toLocaleString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
            <span className={`rounded-md px-2 py-1 font-black ${entry.value >= 0 ? "bg-neon/15 text-neon" : "bg-rose-400/15 text-rose-300"}`}>
              {entry.value > 0 ? "+" : ""}
              {entry.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuestionsTab({ questions, dispatch }: { questions: QuestionConfig[]; dispatch: React.Dispatch<Action> }) {
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  const [type, setType] = useState<QuestionType>("text");
  const [newOptions, setNewOptions] = useState([""]);
  const fixedIds = new Set([
    "nombre",
    "traeAcompanante",
    "nombreAcompanante",
    "seQuedaACenar",
    "alergias",
    "bebidas",
    "comentarios"
  ]);

  const addQuestion = () => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    const options =
      type === "yes_no"
        ? ["Sí", "No"]
        : newOptions
            .map((option) => option.trim())
            .filter(Boolean);
    if (type === "select" && !options.length) return;
    dispatch({ type: "addQuestion", question: { id: `extra-${uid()}`, label: cleanLabel, required, type, options } });
    setLabel("");
    setRequired(false);
    setType("text");
    setNewOptions([""]);
  };

  const getQuestionOptions = (question: QuestionConfig) =>
    question.options || (question.id === "bebidas" ? getDrinkOptions(question) : []);

  const updateQuestionOption = (question: QuestionConfig, index: number, value: string) => {
    const options = getQuestionOptions(question).map((option, currentIndex) =>
      currentIndex === index ? value : option
    );
    dispatch({ type: "updateQuestion", question: { ...question, options } });
  };

  const addQuestionOption = (question: QuestionConfig) => {
    dispatch({
      type: "updateQuestion",
      question: { ...question, options: [...getQuestionOptions(question), "Nueva opción"] }
    });
  };

  const removeQuestionOption = (question: QuestionConfig, index: number) => {
    dispatch({
      type: "updateQuestion",
      question: { ...question, options: getQuestionOptions(question).filter((_, currentIndex) => currentIndex !== index) }
    });
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/10 p-4">
        <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-black">Añadir pregunta</h3>
        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-[1fr_12rem_auto_auto] md:items-center">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="input text-xs sm:text-sm"
            placeholder="Texto de la pregunta"
          />
          <select value={type} onChange={(event) => setType(event.target.value as QuestionType)} className="input text-xs sm:text-sm">
            <option value="text">Texto libre</option>
            <option value="yes_no">Sí / No</option>
            <option value="select">Opciones</option>
          </select>
          <ToggleRow label="Obligatoria" checked={required} onChange={setRequired} />
          <button
            onClick={addQuestion}
            className="inline-flex min-h-10 sm:min-h-12 items-center justify-center gap-1 sm:gap-2 rounded-lg bg-gradient-to-r from-neon to-violeta px-3 sm:px-5 text-xs sm:text-sm font-black text-slate-950 md:col-span-1"
          >
            <Plus size={16} />
            Añadir
          </button>
        </div>
        {type === "select" && (
          <div className="mt-3 space-y-2">
            {newOptions.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  value={option}
                  onChange={(event) =>
                    setNewOptions((current) =>
                      current.map((item, currentIndex) => (currentIndex === index ? event.target.value : item))
                    )
                  }
                  className="input text-xs sm:text-sm"
                  placeholder={`Opción ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => setNewOptions((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-slate-950/55 text-slate-300 transition hover:bg-white/10"
                  aria-label="Eliminar opción"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setNewOptions((current) => [...current, ""])}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neon/25 bg-neon/10 px-3 text-xs font-black text-neon transition hover:bg-neon/15"
            >
              <Plus size={15} />
              Añadir opción
            </button>
          </div>
        )}
        {type === "yes_no" && (
          <p className="mt-3 text-sm font-semibold text-slate-300">Respuestas visibles: Sí / No.</p>
        )}
      </div>
      {questions.map((question) => (
        <div key={question.id} className="grid gap-2 sm:gap-3 rounded-lg border border-white/10 bg-white/10 p-3 sm:p-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-[1fr_12rem_auto_auto]">
          <input
            value={question.label}
            onChange={(event) => dispatch({ type: "updateQuestion", question: { ...question, label: event.target.value } })}
            className="input text-xs sm:text-sm"
          />
          <select
            value={question.type || defaultQuestionTypes[question.id] || "text"}
            onChange={(event) => {
              const nextType = event.target.value as QuestionType;
              dispatch({
                type: "updateQuestion",
                question: {
                  ...question,
                  type: nextType,
                  options: nextType === "yes_no" ? ["Sí", "No"] : question.options
                }
              });
            }}
            className="input text-xs sm:text-sm"
            disabled={fixedIds.has(question.id)}
          >
            <option value="text">Texto libre</option>
            <option value="yes_no">Sí / No</option>
            <option value="select">Opciones</option>
          </select>
          <ToggleRow
            label="Obligatoria"
            checked={question.required}
            onChange={(required) => dispatch({ type: "updateQuestion", question: { ...question, required } })}
          />
          {fixedIds.has(question.id) ? (
            <span className="inline-flex min-h-8 sm:min-h-10 items-center justify-center rounded-lg border border-white/10 px-2 sm:px-3 text-xs font-bold text-slate-400">
              Base
            </span>
          ) : (
            <IconButton
              label="Eliminar"
              onClick={() => dispatch({ type: "deleteQuestion", id: question.id })}
              icon={<Trash2 size={14} />}
            />
          )}
          {(question.type || defaultQuestionTypes[question.id] || "text") === "select" && (
            <div className="space-y-2 md:col-span-4">
              {getQuestionOptions(question).map((option, index) => (
                <div key={`${question.id}-${index}`} className="flex gap-2">
                  <input
                    value={option}
                    onChange={(event) => updateQuestionOption(question, index, event.target.value)}
                    className="input text-xs sm:text-sm"
                    placeholder={`Opción ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeQuestionOption(question, index)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-slate-950/55 text-slate-300 transition hover:bg-white/10"
                    aria-label="Eliminar opción"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addQuestionOption(question)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-neon/25 bg-neon/10 px-3 text-xs font-black text-neon transition hover:bg-neon/15"
              >
                <Plus size={15} />
                Añadir opción
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RulesTab({ rules, dispatch }: { rules: PointRule[]; dispatch: React.Dispatch<Action> }) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState(1);

  const addRule = () => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    dispatch({ type: "addRule", rule: { id: `r-${uid()}`, label: cleanLabel, value } });
    setLabel("");
    setValue(1);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/10 p-3 sm:p-4">
        <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-black">Añadir regla</h3>
        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-[1fr_9rem_auto]">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="input text-xs sm:text-sm"
            placeholder="Nombre de la regla"
          />
          <input
            type="number"
            value={value}
            onChange={(event) => setValue(Number(event.target.value || 0))}
            className="input text-xs sm:text-sm font-black"
            placeholder="Puntos"
          />
          <button
            onClick={addRule}
            className="inline-flex min-h-10 sm:min-h-12 items-center justify-center gap-1 sm:gap-2 rounded-lg bg-gradient-to-r from-neon to-violeta px-3 sm:px-5 text-xs sm:text-sm font-black text-slate-950 sm:col-span-2 md:col-span-1"
          >
            <Plus size={16} />
            Añadir
          </button>
        </div>
      </div>
      {rules.map((rule) => (
        <div key={rule.id} className="grid gap-2 sm:gap-3 rounded-lg border border-white/10 bg-white/10 p-3 sm:p-4 grid-cols-1 sm:grid-cols-[1fr_auto] md:grid-cols-[1fr_9rem_auto]">
          <input
            value={rule.label}
            onChange={(event) => dispatch({ type: "updateRule", rule: { ...rule, label: event.target.value } })}
            className="input text-xs sm:text-sm"
          />
          <input
            type="number"
            value={rule.value}
            onChange={(event) =>
              dispatch({ type: "updateRule", rule: { ...rule, value: Number(event.target.value || 0) } })
            }
            className="input text-xs sm:text-sm font-black"
            placeholder="Puntos"
          />
          <IconButton
            label="Eliminar"
            onClick={() => dispatch({ type: "deleteRule", id: rule.id })}
            icon={<Trash2 size={14} />}
          />
        </div>
      ))}
    </div>
  );
}

function EditAttendeeModal({
  attendee,
  onClose,
  dispatch
}: {
  attendee: Attendee;
  onClose: () => void;
  dispatch: React.Dispatch<Action>;
}) {
  const [draft, setDraft] = useState(attendee);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg border border-white/10 bg-slate-950 p-4 sm:p-5">
        <div className="mb-4 sm:mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <h3 className="text-lg sm:text-xl font-black">Editar respuesta</h3>
          <IconButton label="Cerrar" onClick={onClose} icon={<X size={17} />} />
        </div>
        <div className="grid gap-3 sm:gap-4">
          <input value={draft.nombre} onChange={(event) => setDraft({ ...draft, nombre: event.target.value })} className="input text-xs sm:text-sm" placeholder="Nombre" />
          <input
            value={draft.nombreAcompanante || ""}
            onChange={(event) => setDraft({ ...draft, nombreAcompanante: event.target.value })}
            className="input text-xs sm:text-sm"
            placeholder="Acompañante"
          />
          <ToggleRow label="Se queda a cenar" checked={draft.seQuedaACenar} onChange={(value) => setDraft({ ...draft, seQuedaACenar: value })} />
          <input value={draft.alergias} onChange={(event) => setDraft({ ...draft, alergias: event.target.value })} className="input text-xs sm:text-sm" placeholder="Alergias" />
          <textarea value={draft.comentarios} onChange={(event) => setDraft({ ...draft, comentarios: event.target.value })} className="input min-h-20 sm:min-h-24 text-xs sm:text-sm" placeholder="Comentarios" />
          <input
            type="number"
            value={draft.puntos}
            onChange={(event) => setDraft({ ...draft, puntos: Number(event.target.value || 0) })}
            className="input text-xs sm:text-sm"
            placeholder="Puntos"
          />
          <button
            onClick={() => {
              dispatch({ type: "updateAttendee", attendee: draft });
              onClose();
            }}
            className="inline-flex min-h-10 sm:min-h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-neon to-violeta px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-black text-slate-950"
          >
            <Save size={16} />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function PosterModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/90 p-3 backdrop-blur-sm sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="sticky top-3 z-10 mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/90 p-3">
          <div>
            <p className="font-black">Cartel oficial</p>
            <p className="text-sm text-slate-300">Consulta el cartel oficial para ver el lineup completo.</p>
          </div>
          <IconButton label="Cerrar" onClick={onClose} icon={<X size={18} />} />
        </div>
        <Image
          src="/cartel.jpg"
          alt="Cartel oficial de VILLAGIL FEST 2026"
          width={1200}
          height={1600}
          className="h-auto w-full rounded-lg border border-white/10"
        />
      </div>
    </div>
  );
}

function IconButton({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/10 text-slate-100 transition hover:bg-white/15"
    >
      {icon}
    </button>
  );
}
