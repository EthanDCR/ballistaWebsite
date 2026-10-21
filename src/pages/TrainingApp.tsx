import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Download,
  ExternalLink,
  GitBranch,
  Headphones,
  Home,
  Lock,
  LogOut,
  Pencil,
  PhoneCall,
  Plus,
  Save,
  ScrollText,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Trophy,
  Upload,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BOOKING_URL_OFFSITE } from "../config/booking";
import { modules, trainingLabs } from "../config/modules";
import {
  contentMeta,
  createContentRecord,
  deleteContentRecord,
  fetchContentSnapshot,
  updateContentRecord,
  type ContentKey,
  type ContentRecord,
  type ContentSnapshot,
  type FieldSchema,
} from "../lib/content-repository";
import {
  createDefaultProgress,
  courseScore,
  createProgressRepository,
  type LearnerProgress,
} from "../lib/progress-repository";
import { pb } from "../lib/pb";
import { useAuth } from "../lib/RequireAuth";
import "./TrainingApp.css";

type AppMode = "rep" | "admin";
type RepScreen = "home" | "module" | "lab" | "quiz" | "summary";
type QuizQuestion = {
  id: string;
  type?: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
};
type QuizResult = { id: string; correct: boolean };
type Summary = { title: string; accuracy: number; activityId: string };

const progressRepository = createProgressRepository();

function records(snapshot: ContentSnapshot, key: ContentKey) {
  const value = snapshot[key];
  return Array.isArray(value) ? (value as ContentRecord[]) : [];
}
function appSettings(snapshot: ContentSnapshot) {
  return snapshot.appSettings as ContentRecord;
}
function moduleContentFor(snapshot: ContentSnapshot, moduleKey: string) {
  return records(snapshot, "modulesContent").find((item) => item.module_key === moduleKey);
}
function text(value: unknown) {
  return typeof value === "string" ? value : "";
}
function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
function isAdmin() {
  return (pb.authStore.record as ContentRecord | null)?.staff_role === "admin";
}
function videoEmbedUrl(value: unknown) {
  const match = text(value)
    .trim()
    .match(/https?:\/\/[^\s\]\)"]+/);
  if (!match) return "";
  try {
    const url = new URL(match[0]);
    if (url.hostname === "loom.com" || url.hostname.endsWith(".loom.com")) {
      const videoId = url.pathname.match(/^\/(?:share|embed)\/([^/]+)/)?.[1];
      if (videoId) return `https://www.loom.com/embed/${videoId}`;
    }
    return url.toString();
  } catch {
    return "";
  }
}
function interpolate(script: string, scenario?: ContentRecord) {
  if (!scenario) return script;
  return script.replace(
    /\{(name|address|city|hail_date)\}/g,
    (_, key: string) => text(scenario[key]) || `{${key}}`,
  );
}
async function fetchUploadedRecordings(): Promise<ContentRecord[]> {
  const items = await pb.collection("call_recordings").getFullList({ sort: "-created" });
  // The URL is built at playback, not here: the file is protected, so it needs
  // a token that outlives neither this fetch nor a page left open. See
  // useFileToken.
  return items.map((item) => ({ ...item, file_name: text(item.file) }));
}

/**
 * Reviews of this company's calls, newest first.
 *
 * `author` is expanded so a rep can see who reviewed them. That works because
 * the users view rule allows reading a colleague in your own company — note
 * it is the *view* rule, not list: a rep can resolve a name attached to a
 * review without being able to enumerate the roster.
 */
async function fetchCallReviews(): Promise<ContentRecord[]> {
  const items = await pb
    .collection("call_reviews")
    .getFullList({ sort: "-created", expand: "author", requestKey: null });
  return items as unknown as ContentRecord[];
}

/**
 * A short-lived token for protected file downloads.
 *
 * `call_recordings.file` is protected, so its URL only works with a token on
 * the query string — without that, anyone holding the link could play another
 * company's calls whatever the collection rules say. One token covers every
 * protected file the signed-in rep may read, so this mints one and keeps it
 * fresh rather than one per file. PocketBase issues them for 180s; refreshing
 * at 150 leaves room for a slow request.
 */
function useFileToken() {
  const [token, setToken] = useState("");
  useEffect(() => {
    let active = true;
    const mint = () => {
      if (!pb.authStore.isValid) return;
      void pb.files
        .getToken()
        .then((next) => {
          if (active) setToken(next);
        })
        .catch(() => undefined);
    };
    mint();
    const timer = setInterval(mint, 150_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return token;
}
function labIcon(id: string, size = 24) {
  if (id === "script") return <ScrollText size={size} />;
  if (id === "calls") return <Headphones size={size} />;
  if (id === "tools") return <Wrench size={size} />;
  if (id === "mastery") return <Shield size={size} />;
  if (id === "closing-lab") return <Target size={size} />;
  if (id === "decision-tree") return <GitBranch size={size} />;
  return <Timer size={size} />;
}

const EMPTY_SNAPSHOT: ContentSnapshot = contentMeta.reduce((snapshot, meta) => {
  snapshot[meta.key] = meta.singleton ? {} : [];
  return snapshot;
}, {} as ContentSnapshot);

/**
 * Modules a signed-out visitor may open. The landing page sends people
 * straight in to look around, and this is what they get.
 *
 * This list only decides what the UI offers. The real gate is the collection
 * rules in main.go, which serve a signed-out request nothing but these
 * modules however it asks — keep `previewModuleKey` there in sync with this.
 */
const PREVIEW_MODULES = new Set(["intro"]);

/**
 * Which module a "/training?module=intro" link asks for, if any.
 *
 * The landing page's "See Call-Stars" uses it to drop a visitor inside module
 * 1 rather than on the course path with the lesson still a click away. The
 * same gate as everywhere else applies: an id nobody has, or one a signed-out
 * visitor may not open, falls back to the course home rather than failing.
 */
function requestedModule(search: string, signedIn: boolean) {
  const id = new URLSearchParams(search).get("module");
  if (!id || !modules.some((item) => item.id === id)) return null;
  if (!signedIn && !PREVIEW_MODULES.has(id)) return null;
  return id;
}

export default function TrainingApp() {
  const signedIn = useAuth();
  const previewing = !signedIn;
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AppMode>("rep");
  // Read once, on mount: after that the screen is the app's own state, and a
  // stale `?module=` in the address bar should not drag anyone back.
  const [screen, setScreen] = useState<RepScreen>(() =>
    requestedModule(location.search, signedIn) ? "module" : "home",
  );
  const [content, setContent] = useState<ContentSnapshot>(EMPTY_SNAPSHOT);
  const [progress, setProgress] = useState<LearnerProgress>(createDefaultProgress);
  const [activeModuleId, setActiveModuleId] = useState(
    () => requestedModule(location.search, signedIn) ?? "intro",
  );
  const [activeLabId, setActiveLabId] = useState("script");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizActivityId, setQuizActivityId] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [uploadedRecordings, setUploadedRecordings] = useState<ContentRecord[]>([]);
  const [callReviews, setCallReviews] = useState<ContentRecord[]>([]);
  const progressRef = useRef(progress);

  const refreshContent = useCallback(async () => {
    setContent(await fetchContentSnapshot());
  }, []);

  const refreshUploadedRecordings = useCallback(async () => {
    try {
      setUploadedRecordings(await fetchUploadedRecordings());
    } catch {
      setUploadedRecordings([]);
    }
    try {
      setCallReviews(await fetchCallReviews());
    } catch {
      setCallReviews([]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchContentSnapshot().then((snapshot) => {
      if (active) setContent(snapshot);
    });
    void progressRepository.getProgress().then((saved) => {
      progressRef.current = saved;
      setProgress(saved);
    });
    void fetchUploadedRecordings()
      .then((items) => {
        if (active) setUploadedRecordings(items);
      })
      .catch(() => undefined);
    void fetchCallReviews()
      .then((items) => {
        if (active) setCallReviews(items);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const persistProgress = useCallback((next: LearnerProgress) => {
    progressRef.current = next;
    setProgress(next);
    void progressRepository.saveProgress(next);
  }, []);

  const awardActivity = useCallback(
    (activityId: string, score?: { correct: number; total: number }) => {
      const current = progressRef.current;
      const existing = current.completedActivities[activityId];
      // Already done and nothing new to record — an unscored repeat is a no-op.
      if (existing && !score) return;
      const next: LearnerProgress = {
        ...current,
        completedActivities: {
          ...current.completedActivities,
          [activityId]: {
            // A retake keeps the original completion date but refreshes the
            // score, so the course total reflects the most recent attempt.
            completedAt: existing?.completedAt ?? new Date().toISOString(),
            ...score,
          },
        },
        updatedAt: new Date().toISOString(),
      };
      persistProgress(next);
    },
    [persistProgress],
  );

  const openModule = useCallback(
    (moduleId: string) => {
      if (previewing && !PREVIEW_MODULES.has(moduleId)) return;
      setMode("rep");
      setActiveModuleId(moduleId);
      setScreen("module");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [previewing],
  );
  const openLab = useCallback(
    (labId: string) => {
      if (previewing) return;
      if (labId === "decision-tree") {
        navigate("/cold-call-tree");
        return;
      }
      setMode("rep");
      setActiveLabId(labId);
      setScreen("lab");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate, previewing],
  );

  function setModeGuarded(next: AppMode) {
    if (next === "admin" && !isAdmin()) return;
    setMode(next);
  }

  function questionsForModule(moduleId: string): QuizQuestion[] {
    return records(content, "quizQuestions").filter(
      (item) => item.module_key === moduleId,
    ) as unknown as QuizQuestion[];
  }
  function startQuiz(activityId: string, title: string, questions: QuizQuestion[]) {
    if (!questions.length) return;
    setQuizActivityId(activityId);
    setQuizTitle(title);
    setQuizQuestions(questions);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizResults([]);
    setSummary(null);
    setScreen("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function chooseAnswer(index: number) {
    if (selectedAnswer !== null) return;
    const question = quizQuestions[questionIndex];
    const correct = index === question.correct_index;
    setSelectedAnswer(index);
    setQuizResults((current) => [...current, { id: question.id, correct }]);
  }
  function advanceQuiz() {
    if (selectedAnswer === null) return;
    if (questionIndex < quizQuestions.length - 1) {
      setQuestionIndex((current) => current + 1);
      setSelectedAnswer(null);
      return;
    }
    const correctCount = quizResults.filter((item) => item.correct).length;
    const accuracy = Math.round((correctCount / quizQuestions.length) * 100);
    awardActivity(quizActivityId, { correct: correctCount, total: quizQuestions.length });
    setSummary({ title: quizTitle, accuracy, activityId: quizActivityId });
    setScreen("summary");
  }
  function goHome() {
    setScreen("home");
    setSummary(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const effectiveMode = mode === "admin" && !isAdmin() ? "rep" : mode;

  return (
    <div className="app-shell">
      <Topbar mode={effectiveMode} onMode={setModeGuarded} onHome={goHome} previewing={previewing} />
      {effectiveMode === "admin" ? (
        <AdminStudio
          content={content}
          onContent={refreshContent}
          uploadedRecordings={uploadedRecordings}
          onRecordingsChanged={refreshUploadedRecordings}
        />
      ) : (
        <main>
          {screen === "home" && (
            <RepHome progress={progress} onModule={openModule} onLab={openLab} previewing={previewing} />
          )}
          {screen === "module" && (
            <ModuleView
              moduleId={activeModuleId}
              content={content}
              progress={progress}
              previewing={previewing}
              questionsConfigured={questionsForModule(activeModuleId).length > 0}
              onBack={goHome}
              onStartQuiz={() => {
                const courseModule = modules.find((item) => item.id === activeModuleId)!;
                startQuiz(
                  `module-${activeModuleId}`,
                  `${courseModule.title} checkpoint`,
                  questionsForModule(activeModuleId),
                );
              }}
              onAward={awardActivity}
            />
          )}
          {screen === "lab" && (
            <LabView
              labId={activeLabId}
              content={content}
              uploadedRecordings={uploadedRecordings}
              callReviews={callReviews}
              onRecordingsChanged={refreshUploadedRecordings}
              onBack={goHome}
              onAward={awardActivity}
            />
          )}
          {screen === "quiz" && (
            <QuizView
              title={quizTitle}
              questions={quizQuestions}
              index={questionIndex}
              selected={selectedAnswer}
              onSelect={chooseAnswer}
              onAdvance={advanceQuiz}
              onExit={() => setScreen("module")}
            />
          )}
          {screen === "summary" && summary && <SummaryView summary={summary} onContinue={goHome} />}
        </main>
      )}
    </div>
  );
}

function Topbar({
  mode,
  onMode,
  onHome,
  previewing,
}: {
  previewing: boolean;
  mode: AppMode;
  onMode: (mode: AppMode) => void;
  onHome: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <button
          className="brand-button"
          onClick={() => {
            onMode("rep");
            onHome();
          }}
          aria-label="Call-Stars home"
        >
          <span className="brand-mark">
            <PhoneCall size={18} strokeWidth={2.6} />
          </span>
          <span>
            <strong>CALL-STARS</strong>
            <small>Training HQ</small>
          </span>
        </button>
        <div className="mode-switch" aria-label="Portal mode">
          <button className={mode === "rep" ? "active" : ""} onClick={() => onMode("rep")}>
            <Home size={13} /> Rep portal
          </button>
          {!previewing && isAdmin() && (
            <button className={mode === "admin" ? "active" : ""} onClick={() => onMode("admin")}>
              <Settings size={13} /> Admin
            </button>
          )}
        </div>
        <div className="stats">
          {previewing ? (
            <Link className="primary-button compact" to="/login">
              Log in
            </Link>
          ) : (
            <button
              className="sign-out-button"
              onClick={() => pb.authStore.clear()}
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function RepHome({
  progress,
  onModule,
  onLab,
  previewing,
}: {
  progress: LearnerProgress;
  onModule: (id: string) => void;
  onLab: (id: string) => void;
  previewing: boolean;
}) {
  const completedCount = modules.filter(
    (item) => progress.completedActivities[`module-${item.id}`],
  ).length;
  return (
    <div className="portal-page">
      <section className="hero-card">
        <div>
          <span className="eyebrow">ONBOARDING COURSE</span>
          <h1>Build the base, then win one call at a time.</h1>
          <p>
            Seven focused modules that will show you the tools, and set up the framework for how
            you&apos;ll call. This won&apos;t make you an expert, but it will get you on the path to
            becoming one.
          </p>
        </div>
        <div className="hero-score">
          <strong>
            {completedCount}
            <span>/{modules.length}</span>
          </strong>
          <small>modules complete</small>
          <div className="mini-progress">
            <i style={{ width: `${(completedCount / modules.length) * 100}%` }} />
          </div>
        </div>
      </section>
      {previewing && (
        <aside className="preview-notice">
          <p>
            <strong>You&apos;re previewing Call-Stars.</strong> Module 1 is open to everyone. The
            rest of the course and every training lab come with an account.
          </p>
          <Link className="primary-button compact" to="/login">
            Create an account
          </Link>
        </aside>
      )}
      <div className="portal-columns">
      <section className="path-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR PATH</span>
            <h2>Onboarding course</h2>
          </div>
          <span className="section-count">
            {completedCount} of {modules.length} complete
          </span>
        </div>
        <div className="module-path">
          <div className="path-spine" />
          {modules.map((courseModule, index) => {
            const completed = Boolean(progress.completedActivities[`module-${courseModule.id}`]);
            // Signed in, the course unlocks in order. Previewing, only the
            // preview modules ever open, however far you get.
            const unlocked = previewing
              ? PREVIEW_MODULES.has(courseModule.id)
              : index === 0 ||
                Boolean(progress.completedActivities[`module-${modules[index - 1].id}`]);
            return (
              <article
                className={`module-step step-${index % 2} ${completed ? "completed" : ""} ${!unlocked ? "locked" : ""}`}
                key={courseModule.id}
              >
                <button
                  className="module-node"
                  onClick={() => unlocked && onModule(courseModule.id)}
                  disabled={!unlocked}
                >
                  <span>
                    {completed ? (
                      <Check size={24} strokeWidth={3} />
                    ) : unlocked ? (
                      courseModule.number
                    ) : (
                      <Lock size={20} />
                    )}
                  </span>
                </button>
                <button
                  className="module-copy"
                  onClick={() => unlocked && onModule(courseModule.id)}
                  disabled={!unlocked}
                >
                  <span>MODULE {courseModule.number}</span>
                  <strong>{courseModule.title}</strong>
                  <small>
                    {completed
                      ? "Completed"
                      : unlocked
                        ? "Ready to start"
                        : previewing
                          ? "Included with an account"
                          : "Complete the previous module"}
                  </small>
                </button>
              </article>
            );
          })}
        </div>
      </section>
      <section className="labs-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">KEEP SHARP</span>
            <h2>Training labs</h2>
          </div>
          <p>Practice after onboarding or jump into a quick daily rep.</p>
        </div>
        <div className="labs-grid">
          {trainingLabs.map((lab, index) => (
            <button
              className={`lab-card tone-${index % 4} ${previewing ? "locked" : ""}`}
              key={lab.id}
              onClick={() => onLab(lab.id)}
              disabled={previewing}
            >
              <span className="lab-icon">{previewing ? <Lock size={16} /> : labIcon(lab.id)}</span>
              <span>
                <strong>{lab.title}</strong>
                <small>{previewing ? "Included with an account" : lab.description}</small>
              </span>
              {previewing ? <Lock size={14} /> : <ChevronRight size={16} />}
            </button>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

function ModuleView({
  moduleId,
  content,
  progress,
  previewing,
  questionsConfigured,
  onBack,
  onStartQuiz,
  onAward,
}: {
  moduleId: string;
  content: ContentSnapshot;
  progress: LearnerProgress;
  previewing: boolean;
  questionsConfigured: boolean;
  onBack: () => void;
  onStartQuiz: () => void;
  onAward: (id: string) => void;
}) {
  const courseModule = modules.find((item) => item.id === moduleId)!;
  const moduleContent = moduleContentFor(content, moduleId);
  const videoUrl = videoEmbedUrl(moduleContent?.video_url);
  const [scenarioId, setScenarioId] = useState(
    text(records(content, "openingCallScenarios")[0]?.id),
  );
  const scenario = records(content, "openingCallScenarios").find((item) => item.id === scenarioId);
  const completed = Boolean(progress.completedActivities[`module-${moduleId}`]);
  return (
    <div className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ChevronLeft size={14} /> Back to path
      </button>
      <section className="detail-hero">
        <div className="detail-number">{completed ? <Check size={27} /> : courseModule.number}</div>
        <div>
          <span className="eyebrow">MODULE {courseModule.number}</span>
          <h1>{courseModule.title}</h1>
          <p>{moduleDescription(moduleId)}</p>
        </div>
        {completed && (
          <span className="complete-badge">
            <Check size={13} /> Complete
          </span>
        )}
      </section>
      {/* The overview sits directly under the hero so reps read what the module
          covers before the video. Renders for any module whose modules_content
          row has an overview filled in; hides itself otherwise. */}
      <FlexibleModuleContent content={moduleContent} />
      {videoUrl && (
        <ModuleVideo number={courseModule.number} title={courseModule.title} url={videoUrl} />
      )}
      {moduleId === "scripts" && (
        <ScriptModule
          scripts={records(content, "openingCallScripts")}
          scenarios={records(content, "openingCallScenarios")}
          scenario={scenario}
          scenarioId={scenarioId}
          onScenario={setScenarioId}
        />
      )}
      {moduleId === "objections" && <ObjectionModule items={records(content, "objections")} />}
      {moduleId === "closing" && (
        <ClosingModule items={records(content, "closingScripts")} scenario={scenario} />
      )}
      {moduleId === "signoff" && (
        <SignOffModule content={content} progress={progress} onAward={onAward} />
      )}
      {/* Previewing, the only module that opens is module 1 and the quiz is
          not on offer — so the end of the lesson asks for a conversation
          instead of a checkpoint. Signed in, this is the course's own gate:
          pass the quiz, unlock the next module. */}
      {previewing ? (
        <section className="checkpoint-card">
          <div>
            <span className="eyebrow">NEXT STEP</span>
            <h2>Want this on your floor?</h2>
            <p>
              That is module 1. The rest of the course — plus the script, the call library and the
              decision tree — comes with the platform. Book a call and we will walk your team
              through it.
            </p>
          </div>
          <a className="primary-button" href={BOOKING_URL_OFFSITE}>
            <PhoneCall size={15} /> Book a call
          </a>
        </section>
      ) : (
        moduleId !== "signoff" && (
          <section className="checkpoint-card">
            <div>
              <span className="eyebrow">CHECKPOINT</span>
              <h2>{questionsConfigured ? "Ready to prove it?" : "Quiz setup pending"}</h2>
              <p>
                {questionsConfigured
                  ? "Finish the bite-sized quiz to earn XP and unlock the next module."
                  : `Add Module ${courseModule.number} quiz questions in Admin → Quiz questions to activate this checkpoint.`}
              </p>
            </div>
            <button className="primary-button" disabled={!questionsConfigured} onClick={onStartQuiz}>
              <CirclePlay size={15} /> {questionsConfigured ? "Start checkpoint" : "Quiz not set up"}
            </button>
          </section>
        )
      )}
    </div>
  );
}

function ModuleVideo({ number, title, url }: { number: number; title: string; url: string }) {
  return (
    <section className="lesson-video-card">
      <div className="lesson-video-heading">
        <CirclePlay size={16} />
        <div>
          <span className="eyebrow">MODULE {number} VIDEO</span>
          <strong>{title}</strong>
        </div>
      </div>
      <div className="lesson-video-frame">
        <iframe
          src={url}
          title={`Module ${number} training video`}
          allow="fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  );
}

function moduleDescription(id: string) {
  const descriptions: Record<string, string> = {
    intro:
      "Get oriented to the training path, checkpoints, and practice labs before building your call framework.",
    scripts: "Practice the exact opening while learning why each question earns the next step.",
    objections: "Turn resistance into useful information with a calm agree–inform–ask rhythm.",
    closing: "Match the close to the prospect's temperature and make the next step easy.",
    mindset:
      "Build the habits, self-review, and mindset that turn consistent practice into measurable improvement.",
    operations:
      "Learn the standards and repeatable workflows that create reliable, high-quality execution.",
    signoff: "Read the operating standard, sign it, and commit to accurate, respectful selling.",
  };
  return descriptions[id];
}

function FlexibleModuleContent({ content }: { content?: ContentRecord }) {
  if (!content || (!content.overview_title && !content.overview_description)) return null;
  return (
    <article className="intro-card">
      <div className="intro-icon">
        <Sparkles size={22} />
      </div>
      <div>
        <span className="eyebrow">START HERE</span>
        <h2>{text(content.overview_title)}</h2>
        <p>{text(content.overview_description)}</p>
        <div className="intro-topics">
          {stringList(content.overview_topics).map((topic) => (
            <span key={topic}>
              <Check size={13} />
              {topic}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function ScriptModule({
  scripts,
  scenarios,
  scenario,
  scenarioId,
  onScenario,
}: {
  scripts: ContentRecord[];
  scenarios: ContentRecord[];
  scenario?: ContentRecord;
  scenarioId: string;
  onScenario: (id: string) => void;
}) {
  return (
    <>
      <section className="scenario-bar">
        <div>
          <span className="eyebrow">PRACTICE SCENARIO</span>
          <strong>Swap the variables in every exact script</strong>
        </div>
        <select value={scenarioId} onChange={(event) => onScenario(event.target.value)}>
          {scenarios.map((item) => (
            <option key={text(item.id)} value={text(item.id)}>
              {text(item.name)} · {text(item.address)}
            </option>
          ))}
        </select>
      </section>
      <div className="content-stack">
        {scripts
          .filter((item) => item.active !== false)
          .map((item) => (
            <article className="script-card" key={text(item.id)}>
              <div className="script-part">PART {String(item.part)}</div>
              <div>
                <h2>{text(item.part_title)}</h2>
                <p>{text(item.purpose)}</p>
                <blockquote>“{interpolate(text(item.exact_script), scenario)}”</blockquote>
                <div className="two-column-list">
                  <InfoList title="Listen for" items={stringList(item.success_indicators)} good />
                  <InfoList title="Avoid" items={stringList(item.common_mistakes)} />
                </div>
              </div>
            </article>
          ))}
      </div>
    </>
  );
}

function ObjectionModule({ items }: { items: ContentRecord[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="objection-grid">
      {items
        .filter((item) => item.active !== false)
        .map((item) => {
          const id = text(item.id);
          return (
            <article className={`objection-card ${openId === id ? "open" : ""}`} key={id}>
              <div className="card-top">
                <span className={`level level-${text(item.level)}`}>{text(item.level)}</span>
                <span>{text(item.objection_id)}</span>
              </div>
              <h2>{text(item.title)}</h2>
              <p className="prompt-line">“{stringList(item.prompts)[0]}”</p>
              <button
                className="outline-button"
                onClick={() => setOpenId(openId === id ? null : id)}
              >
                {openId === id ? "Hide response" : "Reveal response"}
              </button>
              {openId === id && (
                <div className="reveal">
                  <p>{text(item.rebuttal)}</p>
                  <div className="keyword-row">
                    {stringList(item.required_keywords).map((keyword) => (
                      <span key={keyword}>{keyword}</span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
    </div>
  );
}

function ClosingModule({ items, scenario }: { items: ContentRecord[]; scenario?: ContentRecord }) {
  return (
    <div className="closing-grid">
      {items
        .filter((item) => item.active !== false)
        .map((item, index) => (
          <article className={`closing-card close-tone-${index}`} key={text(item.id)}>
            <span className="eyebrow">{text(item.close_type).replaceAll("_", " ")}</span>
            <h2>{text(item.title)}</h2>
            <p>{text(item.when_to_use)}</p>
            <blockquote>“{interpolate(text(item.exact_script), scenario)}”</blockquote>
            <InfoList title="Success looks like" items={stringList(item.success_indicators)} good />
          </article>
        ))}
    </div>
  );
}

function InfoList({
  title,
  items,
  good = false,
}: {
  title: string;
  items: string[];
  good?: boolean;
}) {
  return (
    <div className={`info-list ${good ? "good" : ""}`}>
      <strong>{title}</strong>
      {items.map((item) => (
        <span key={item}>
          {good ? <Check size={11} /> : <X size={11} />} {item}
        </span>
      ))}
    </div>
  );
}

// Version of the Standard of Performance document, stored with each sign-off
// so a signature stays tied to the text that was actually signed. Separate
// from the Terms of Service version stamped on the user record.
const SOP_VERSION = "1.0";

function SignOffModule({
  content,
  progress,
  onAward,
}: {
  content: ContentSnapshot;
  progress: LearnerProgress;
  onAward: (id: string) => void;
}) {
  const [typedName, setTypedName] = useState("");
  const [email, setEmail] = useState("");
  const [signature, setSignature] = useState("");
  const [saved, setSaved] = useState(false);
  const [showScore, setShowScore] = useState(false);
  // Read before awarding the sign-off: it is unscored, so it cannot change the
  // total, and this avoids depending on the parent's state having re-rendered.
  const score = courseScore(progress);
  async function submit() {
    if (!typedName.trim() || !email.trim() || !signature) return;
    await createContentRecord("signOffs", {
      typed_name: typedName.trim(),
      user_email: email.trim(),
      signed_at: new Date().toISOString(),
      document_version: SOP_VERSION,
    });
    onAward("module-signoff");
    setSaved(true);
    setShowScore(true);
  }
  return (
    <div className="signoff-layout">
      <article className="sop-document">
        <span className="eyebrow">DOCUMENT VERSION {SOP_VERSION}</span>
        <h2>Standard of Performance</h2>
        {text(appSettings(content).sop_document_text)
          .split("\n\n")
          .map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
      </article>
      <aside className="signature-card">
        <span className="eyebrow">ACKNOWLEDGMENT</span>
        <h2>Sign your commitment</h2>
        {saved ? (
          <div className="signed-success">
            <Trophy size={34} />
            <strong>Signed and complete</strong>
            <p>Your acknowledgment is saved.</p>
          </div>
        ) : (
          <>
            <label>
              Full name
              <input
                value={typedName}
                onChange={(event) => setTypedName(event.target.value)}
                placeholder="Type your full name"
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </label>
            <SignaturePad onChange={setSignature} />
            <button
              className="primary-button full"
              disabled={!typedName.trim() || !email.trim() || !signature}
              onClick={submit}
            >
              <Save size={14} /> Submit sign-off
            </button>
          </>
        )}
      </aside>
      {showScore && (
        <div className="modal-backdrop" onClick={() => setShowScore(false)}>
          <div
            className="confirm-dialog course-score-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-score-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span className="score-bubble">
              <Trophy size={28} />
            </span>
            <h2 id="course-score-title">Course complete</h2>
            {score.total > 0 ? (
              <>
                <p>You signed the Standard of Performance. Here's how you scored overall.</p>
                <div className="course-score-readout">
                  <strong>{score.percent}%</strong>
                  <span>
                    {score.correct} of {score.total} correct
                  </span>
                </div>
              </>
            ) : (
              <p>
                You signed the Standard of Performance. No quiz scores are recorded yet — finish a
                module checkpoint to start building your score.
              </p>
            )}
            <div>
              <button className="primary-button" onClick={() => setShowScore(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SignaturePad({ onChange }: { onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }
  function down(event: React.PointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d")!;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const p = point(event);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#19324d";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function up() {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }
  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }
  return (
    <div className="signature-field">
      <div>
        <span>Draw signature</span>
        <button onClick={clear} type="button">
          Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={520}
        height={150}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />
    </div>
  );
}

function QuizView({
  title,
  questions,
  index,
  selected,
  onSelect,
  onAdvance,
  onExit,
}: {
  title: string;
  questions: QuizQuestion[];
  index: number;
  selected: number | null;
  onSelect: (index: number) => void;
  onAdvance: () => void;
  onExit: () => void;
}) {
  const question = questions[index];
  const correct = selected === question.correct_index;
  return (
    <div className="quiz-page">
      <div className="quiz-top">
        <button onClick={onExit} aria-label="Exit lesson">
          <X />
        </button>
        <div className="quiz-progress">
          <i
            style={{
              width: `${((index + (selected !== null ? 1 : 0)) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>
      <section className="question-card">
        <span className="eyebrow">
          {title} · QUESTION {index + 1} OF {questions.length}
        </span>
        <h1>{question.question}</h1>
        <div className="answer-grid">
          {question.options.map((option, optionIndex) => {
            const chosen = selected === optionIndex;
            const isCorrect = selected !== null && optionIndex === question.correct_index;
            return (
              <button
                className={`${chosen ? "chosen" : ""} ${isCorrect ? "correct" : ""} ${chosen && !isCorrect ? "wrong" : ""}`}
                disabled={selected !== null}
                onClick={() => onSelect(optionIndex)}
                key={`${question.id}-${optionIndex}`}
              >
                <span>{String.fromCharCode(65 + optionIndex)}</span>
                {option}
                {isCorrect && <Check size={16} />}
                {chosen && !isCorrect && <X size={16} />}
              </button>
            );
          })}
        </div>
      </section>
      {selected !== null && (
        <div className={`feedback-dock ${correct ? "correct" : "wrong"}`}>
          <div>
            {correct ? <Check size={21} /> : <X size={21} />}
            <span>
              <strong>{correct ? "Nice work!" : "Not quite"}</strong>
              <small>
                {correct
                  ? (question.explanation ?? "Correct answer.")
                  : `Correct answer: ${question.options[question.correct_index]}${question.explanation ? `. ${question.explanation}` : ""}`}
              </small>
            </span>
          </div>
          <button onClick={onAdvance}>
            {index === questions.length - 1 ? "See results" : "Continue"} <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryView({ summary, onContinue }: { summary: Summary; onContinue: () => void }) {
  return (
    <div className="summary-page">
      <section className="summary-card">
        <div className="trophy-bubble">
          <Trophy size={42} />
        </div>
        <span className="eyebrow">LESSON COMPLETE</span>
        <h1>{summary.title}</h1>
        <p>You finished the checkpoint and saved your progress.</p>
        <div className="summary-stats">
          <div>
            <Target size={20} />
            <strong>{summary.accuracy}%</strong>
            <span>accuracy</span>
          </div>
        </div>
        <button className="primary-button full" onClick={onContinue}>
          Continue to path <ArrowRight size={14} />
        </button>
      </section>
    </div>
  );
}

function LabView({
  labId,
  content,
  uploadedRecordings,
  callReviews,
  onRecordingsChanged,
  onBack,
  onAward,
}: {
  labId: string;
  content: ContentSnapshot;
  uploadedRecordings: ContentRecord[];
  callReviews: ContentRecord[];
  onRecordingsChanged: () => Promise<void>;
  onBack: () => void;
  onAward: (id: string) => void;
}) {
  const lab = trainingLabs.find((item) => item.id === labId)!;
  return (
    <div className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ChevronLeft size={14} /> Back to portal
      </button>
      <section className="lab-hero">
        <span className="lab-icon large">{labIcon(lab.id, 32)}</span>
        <div>
          <span className="eyebrow">TRAINING LAB</span>
          <h1>{lab.title}</h1>
          <p>{lab.description}</p>
        </div>
      </section>
      {labId === "script" && <ScriptDocument content={content} />}
      {labId === "calls" && (
        <CallLibrary
          items={uploadedRecordings}
          reviews={callReviews}
          onChanged={onRecordingsChanged}
        />
      )}
      {labId === "tools" && <ToolsLab items={records(content, "trainingVideos")} />}
      {labId === "mastery" && (
        <MasteryLab items={records(content, "objectionMasteryLabs")} onAward={onAward} />
      )}
      {labId === "closing-lab" && (
        <ClosingModule
          items={records(content, "closingScripts")}
          scenario={records(content, "openingCallScenarios")[0]}
        />
      )}
    </div>
  );
}

function ScriptDocument({ content }: { content: ContentSnapshot }) {
  const settings = appSettings(content);
  const uploadedFile = text(settings.script_lab_document_file);
  const fileUrl = uploadedFile
    ? pb.files.getURL(settings, uploadedFile)
    : "/resources/cold-calling-script-and-objections.pdf";
  const title = text(settings.script_lab_document_title) || "Cold Calling Script and Objections";
  const description = text(settings.script_lab_document_description);
  return (
    <section className="pdf-reader-card">
      <div className="pdf-reader-toolbar">
        <div className="pdf-reader-title">
          <span>
            <ScrollText size={20} />
          </span>
          <div>
            <span className="eyebrow">SCRIPT FIELD GUIDE</span>
            <strong>{title}</strong>
            <small>{description}</small>
          </div>
        </div>
        <div className="pdf-reader-actions">
          <a className="outline-button compact" href={fileUrl} target="_blank" rel="noreferrer">
            Open full screen <ExternalLink size={12} />
          </a>
          <a className="primary-button compact" href={fileUrl} download>
            Download PDF <Download size={12} />
          </a>
        </div>
      </div>
      <object
        className="pdf-reader-frame"
        data={`${fileUrl}#view=FitH&toolbar=1`}
        type="application/pdf"
        aria-label={title}
      >
        <div className="pdf-reader-fallback">
          <ScrollText size={29} />
          <strong>Open the script field guide</strong>
          <p>Your browser cannot display the PDF inside this page.</p>
          <a className="primary-button" href={fileUrl} target="_blank" rel="noreferrer">
            Open PDF <ExternalLink size={14} />
          </a>
        </div>
      </object>
    </section>
  );
}

/**
 * Picker for a `relation` field.
 *
 * Loads the related collection so the admin chooses a record by name rather
 * than pasting a 15-character id. The list is already scoped by that
 * collection's own rules, so a manager only ever sees their own company's
 * rows here — no extra filtering needed.
 */
function RelationField({
  field,
  draft,
  onChange,
}: {
  field: FieldSchema;
  draft: Draft;
  onChange: (next: Draft) => void;
}) {
  const [options, setOptions] = useState<ContentRecord[]>([]);
  const [failed, setFailed] = useState(false);
  const { collection, optionLabel } = field;

  useEffect(() => {
    if (!collection) return;
    let active = true;
    void pb
      .collection(collection)
      .getFullList({ requestKey: null })
      .then((items) => {
        if (active) setOptions(items as unknown as ContentRecord[]);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [collection]);

  return (
    <label>
      {field.label}
      <select
        value={text(draft[field.name])}
        onChange={(event) => onChange({ ...draft, [field.name]: event.target.value })}
      >
        <option value="">—</option>
        {options.map((item) => (
          <option key={text(item.id)} value={text(item.id)}>
            {text(item[optionLabel ?? "title"]) || text(item.id)}
          </option>
        ))}
      </select>
      {failed && <small>Could not load {collection}.</small>}
      {!failed && options.length === 0 && <small>Nothing in {collection} yet.</small>}
    </label>
  );
}

/** Playback URL for a protected recording, empty until a token is in hand. */
function recordingUrl(item: ContentRecord, token: string) {
  const file = text(item.file);
  if (!file || !token) return "";
  return pb.files.getURL(item, file, { token });
}

function CallLibrary({
  items,
  reviews,
  onChanged,
}: {
  items: ContentRecord[];
  reviews: ContentRecord[];
  onChanged: () => Promise<void>;
}) {
  const fileToken = useFileToken();
  const me = text((pb.authStore.record as ContentRecord | null)?.id);
  // Your own calls first — the feedback on them is the reason to come here.
  // The rest of the company's sit below, to learn from rather than act on.
  const mine = items.filter((item) => text(item.owner) === me);
  const theirs = items.filter((item) => text(item.owner) !== me);
  const reviewsFor = (recordingId: string) =>
    reviews.filter((review) => text(review.recording) === recordingId);

  async function removeOwn(id: string) {
    if (!window.confirm("Remove this call? Any review of it goes too.")) return;
    try {
      await pb.collection("call_recordings").delete(id);
      await onChanged();
    } catch {
      // The delete rule is the real gate; if it refuses, leave the list alone.
    }
  }

  return (
    <>
      {/* Reps upload their own calls here. The server decides what they may
          remove; see the variant note on AudioUploadPanel. */}
      <AudioUploadPanel recordings={items} onChanged={onChanged} variant="rep" />

      <section className="call-section">
        <span className="eyebrow">YOUR CALLS</span>
        {mine.length === 0 ? (
          <p className="empty-media">
            Nothing yet. Upload a call above and it will come back with a review.
          </p>
        ) : (
          <CallLibraryList
            items={mine}
            fileToken={fileToken}
            reviewsFor={reviewsFor}
            onRemove={removeOwn}
          />
        )}
      </section>

      {theirs.length > 0 && (
        <section className="call-section">
          <span className="eyebrow">YOUR TEAM&apos;S CALLS</span>
          <CallLibraryList items={theirs} fileToken={fileToken} reviewsFor={reviewsFor} />
        </section>
      )}
    </>
  );
}

/** One manager's review of a call: written notes, a Loom link, or both. */
function CallReview({ review }: { review: ContentRecord }) {
  const expand = review.expand as { author?: ContentRecord } | undefined;
  const author = text(expand?.author?.name);
  const when = text(review.created).slice(0, 10);
  const loom = text(review.loom_url);
  return (
    <div className="call-review">
      <span className="eyebrow">
        REVIEW{author ? ` · ${author}` : ""}
        {when ? ` · ${when}` : ""}
      </span>
      {text(review.body) && <p>{text(review.body)}</p>}
      {loom && (
        <a className="call-review-link" href={loom} target="_blank" rel="noreferrer">
          <ExternalLink size={13} /> Watch the review
        </a>
      )}
    </div>
  );
}

function CallLibraryList({
  items,
  fileToken,
  reviewsFor,
  onRemove,
}: {
  items: ContentRecord[];
  fileToken: string;
  reviewsFor: (recordingId: string) => ContentRecord[];
  /** Only passed for a rep's own calls; the server allows nothing else. */
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="content-stack">
      {items.map((item) => (
        <article className="call-card" key={text(item.id)}>
          <div className="call-play">
            <Headphones size={22} />
          </div>
          <div className="card-main">
            <span className="eyebrow">
              COACHED CALL{text(item.duration) ? ` · ${text(item.duration)}` : ""}
            </span>
            <h2>
              {text(item.title)}
              {onRemove && (
                <button
                  className="danger-icon"
                  onClick={() => onRemove(text(item.id))}
                  aria-label={`Remove ${text(item.title)}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </h2>
            <p>{text(item.coaching_notes)}</p>
            {recordingUrl(item, fileToken) && (
              <audio
                className="call-audio"
                controls
                preload="metadata"
                src={recordingUrl(item, fileToken)}
              >
                Your browser does not support audio playback.
              </audio>
            )}
            <div className="timestamp-row">
              {Array.isArray(item.timestamps) &&
                (item.timestamps as ContentRecord[]).map((stamp) => (
                  <span key={text(stamp.time)}>
                    <strong>{text(stamp.time)}</strong>
                    {text(stamp.label)}
                  </span>
                ))}
            </div>
            {(() => {
              const reviews = reviewsFor(text(item.id));
              if (reviews.length === 0) {
                return <p className="call-awaiting">Not reviewed yet.</p>;
              }
              return reviews.map((review) => (
                <CallReview review={review} key={text(review.id)} />
              ));
            })()}
          </div>
        </article>
      ))}
    </div>
  );
}

function ToolsLab({ items }: { items: ContentRecord[] }) {
  const active = items
    .filter((item) => item.active !== false)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const software = active.filter((item) => text(item.category) !== "prospecting");
  const prospecting = active.filter((item) => text(item.category) === "prospecting");
  return (
    <div className="content-stack">
      <ToolVideoGroup title="Software tutorials" items={software} />
      <ToolVideoGroup title="Prospecting" items={prospecting} />
    </div>
  );
}

function ToolVideoGroup({ title, items }: { title: string; items: ContentRecord[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h2>{title}</h2>
      <div className="content-stack">
        {items.map((item) => {
          const url = videoEmbedUrl(item.video_url);
          return (
            <article className="tool-card" key={text(item.id)}>
              <div>
                <span className="eyebrow">{title.toUpperCase()}</span>
                <h2>{text(item.title)}</h2>
                <p>{text(item.description)}</p>
              </div>
              {url ? (
                <div className="lesson-video-frame">
                  <iframe
                    src={url}
                    title={text(item.title)}
                    allow="fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <span className="empty-media">Video coming soon</span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MasteryLab({ items, onAward }: { items: ContentRecord[]; onAward: (id: string) => void }) {
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState("");
  const [checked, setChecked] = useState(false);
  if (!items.length) return <p className="empty-media">No objection mastery prompts yet.</p>;
  const item = items[index % items.length];
  const keywords = stringList(item.keywords);
  const hits = keywords.filter((keyword) => response.toLowerCase().includes(keyword.toLowerCase()));
  function next() {
    if (checked) onAward(`mastery-${text(item.id)}`);
    setIndex((value) => (value + 1) % items.length);
    setResponse("");
    setChecked(false);
  }
  return (
    <section className="practice-stage">
      <div className="practice-prompt">
        <span className={`level level-${text(item.level)}`}>{text(item.level)}</span>
        <span>PROSPECT SAYS</span>
        <blockquote>“{text(item.prompt)}”</blockquote>
      </div>
      <label className="response-box">
        Your response
        <textarea
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          placeholder="Type the response you would say out loud…"
        />
      </label>
      {checked && (
        <div className="practice-feedback">
          <strong>
            {hits.length}/{keywords.length} coaching phrases included
          </strong>
          <div className="keyword-row">
            {keywords.map((keyword) => (
              <span className={hits.includes(keyword) ? "hit" : ""} key={keyword}>
                {keyword}
              </span>
            ))}
          </div>
          <p>
            <b>Model response:</b> {text(item.rebuttal)}
          </p>
        </div>
      )}
      <div className="practice-actions">
        <button
          className="outline-button"
          onClick={() => setChecked(true)}
          disabled={!response.trim()}
        >
          Check response
        </button>
        <button className="primary-button" onClick={next}>
          {checked ? "Next scenario" : "Skip"} <ArrowRight size={14} />
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Admin studio: a schema-driven form engine. Each content type declares its
// fields (see content-repository.ts); this renders proper labeled inputs
// (text/textarea/number/boolean/select/repeatable lists/file) instead of a
// raw JSON editor, and saves through per-record PocketBase create/update.
// ---------------------------------------------------------------------------

type Draft = ContentRecord & { __files?: Record<string, File> };

function buildPayload(fields: FieldSchema[], draft: Draft): Record<string, unknown> | FormData {
  const hasFile = fields.some((field) => field.type === "file");
  if (!hasFile) {
    const payload: Record<string, unknown> = {};
    fields.forEach((field) => {
      payload[field.name] = draft[field.name];
    });
    return payload;
  }
  const form = new FormData();
  fields.forEach((field) => {
    if (field.type === "file") {
      const file = draft.__files?.[field.name];
      if (file) form.set(field.name, file);
      return;
    }
    if (field.type === "string-list") {
      form.set(field.name, JSON.stringify(stringList(draft[field.name])));
      return;
    }
    if (field.type === "boolean") {
      form.set(field.name, draft[field.name] ? "true" : "false");
      return;
    }
    if (field.type === "number") {
      form.set(field.name, String(draft[field.name] ?? ""));
      return;
    }
    form.set(field.name, text(draft[field.name]));
  });
  return form;
}

function emptyDraft(fields: FieldSchema[]): Draft {
  const draft: Draft = {};
  fields.forEach((field) => {
    if (field.type === "boolean") draft[field.name] = true;
    else if (field.type === "string-list") draft[field.name] = [];
    else if (field.type === "number") draft[field.name] = 0;
    else draft[field.name] = "";
  });
  return draft;
}

function RecordFormField({
  field,
  draft,
  onChange,
}: {
  field: FieldSchema;
  draft: Draft;
  onChange: (next: Draft) => void;
}) {
  const raw = draft[field.name];

  if (field.type === "boolean") {
    return (
      <label className="record-form-checkbox">
        <input
          type="checkbox"
          checked={raw !== false}
          onChange={(event) => onChange({ ...draft, [field.name]: event.target.checked })}
        />{" "}
        {field.label}
      </label>
    );
  }

  if (field.type === "relation") {
    return <RelationField field={field} draft={draft} onChange={onChange} />;
  }

  if (field.type === "select") {
    return (
      <label>
        {field.label}
        <select
          value={text(raw)}
          onChange={(event) => onChange({ ...draft, [field.name]: event.target.value })}
        >
          <option value="">—</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label>
        {field.label}
        <input
          type="number"
          value={typeof raw === "number" ? raw : text(raw)}
          onChange={(event) =>
            onChange({
              ...draft,
              [field.name]: event.target.value === "" ? "" : Number(event.target.value),
            })
          }
        />
      </label>
    );
  }

  if (field.type === "string-list") {
    const list = stringList(raw);
    return (
      <div className="record-form-list">
        <span>{field.label}</span>
        {list.map((item, index) => (
          <div className="record-form-list-row" key={index}>
            <input
              value={item}
              onChange={(event) => {
                const next = [...list];
                next[index] = event.target.value;
                onChange({ ...draft, [field.name]: next });
              }}
            />
            <button
              type="button"
              className="danger-icon"
              onClick={() =>
                onChange({ ...draft, [field.name]: list.filter((_, i) => i !== index) })
              }
              aria-label="Remove item"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="outline-button compact"
          onClick={() => onChange({ ...draft, [field.name]: [...list, ""] })}
        >
          <Plus size={11} /> Add
        </button>
      </div>
    );
  }

  if (field.type === "file") {
    const current = text(raw);
    const picked = draft.__files?.[field.name];
    return (
      <label>
        {field.label}
        <input
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            onChange({
              ...draft,
              __files: { ...draft.__files, ...(file ? { [field.name]: file } : {}) },
            });
          }}
        />
        <small>
          {picked
            ? `Selected: ${picked.name}`
            : current
              ? `Current file: ${current}`
              : "No file uploaded yet"}
        </small>
      </label>
    );
  }

  if (field.type === "textarea") {
    return (
      <label>
        {field.label}
        <textarea
          value={text(raw)}
          onChange={(event) => onChange({ ...draft, [field.name]: event.target.value })}
        />
      </label>
    );
  }

  return (
    <label>
      {field.label}
      <input
        value={text(raw)}
        onChange={(event) => onChange({ ...draft, [field.name]: event.target.value })}
      />
    </label>
  );
}

function recordTitle(record: ContentRecord) {
  return text(
    record.title ||
      record.part_title ||
      record.name ||
      record.question ||
      record.module_key ||
      record.typed_name ||
      record.id,
  );
}

function AdminStudio({
  content,
  onContent,
  uploadedRecordings,
  onRecordingsChanged,
}: {
  content: ContentSnapshot;
  onContent: () => Promise<void>;
  uploadedRecordings: ContentRecord[];
  onRecordingsChanged: () => Promise<void>;
}) {
  const [activeKey, setActiveKey] = useState<ContentKey | "callRecordings">("openingCallScripts");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const meta = useMemo(() => contentMeta.find((item) => item.key === activeKey), [activeKey]);
  const items = meta && !meta.singleton ? records(content, meta.key) : [];
  const filtered = items.filter((item) =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase()),
  );

  const settingsRecord = appSettings(content);

  const showingCallRecordings = activeKey === "callRecordings";

  function selectEntity(key: ContentKey) {
    setActiveKey(key);
    setSelectedId(null);
    setDraft({});
    setNotice("");
  }
  function selectRecord(record: ContentRecord) {
    setSelectedId(text(record.id));
    setDraft({ ...record });
    setNotice("");
  }
  function newRecord() {
    if (!meta) return;
    setSelectedId(null);
    setDraft(emptyDraft(meta.fields));
    setNotice("New record — fill in the fields and save.");
  }
  function editSettings() {
    setSelectedId(text(settingsRecord.id));
    setDraft({ ...settingsRecord });
    setNotice("");
  }

  async function saveDraft() {
    if (!meta) return;
    setSaving(true);
    try {
      const payload = buildPayload(meta.fields, draft);
      if (selectedId) {
        await updateContentRecord(meta.key, selectedId, payload);
      } else {
        const created = await createContentRecord(meta.key, payload);
        setSelectedId(text((created as unknown as ContentRecord).id));
      }
      await onContent();
      setNotice("Saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save this record.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId || !meta) return;
    await deleteContentRecord(meta.key, deleteId);
    await onContent();
    setDeleteId(null);
    setSelectedId(null);
    setDraft({});
    setNotice("Record deleted.");
  }

  const editingSettings = meta?.singleton && selectedId === text(settingsRecord.id);

  return (
    <main className="admin-page">
      <section className="admin-head">
        <div>
          <span className="eyebrow">ADMIN</span>
          <h1>Content studio</h1>
          <p>Edit training content directly — changes save to the database immediately.</p>
        </div>
      </section>
      <div className="admin-layout">
        <nav className="entity-nav">
          {contentMeta.map((item) => {
            const count = item.singleton ? 1 : records(content, item.key).length;
            return (
              <button
                className={activeKey === item.key ? "active" : ""}
                onClick={() => selectEntity(item.key)}
                key={item.key}
              >
                <span>{item.label}</span>
                <small>{count}</small>
              </button>
            );
          })}
          <button
            className={showingCallRecordings ? "active" : ""}
            onClick={() => {
              setActiveKey("callRecordings");
              setSelectedId(null);
              setDraft({});
            }}
          >
            <span>Call recordings</span>
            <small>{uploadedRecordings.length}</small>
          </button>
        </nav>
        <section className="record-panel">
          {showingCallRecordings || !meta ? (
            <div className="editor-empty">
              <Headphones size={30} />
              <h2>Call recordings</h2>
              <p>Upload and manage audio from the panel on the right.</p>
            </div>
          ) : (
            <>
              <div className="record-toolbar">
                <div>
                  <h2>{meta.label}</h2>
                </div>
                {!meta.singleton && !meta.existingOnly && (
                  <button className="primary-button compact" onClick={newRecord}>
                    <Plus size={14} /> New record
                  </button>
                )}
              </div>
              {meta.singleton ? (
                <button
                  className={`record-row ${editingSettings ? "active" : ""}`}
                  onClick={editSettings}
                >
                  <span className="record-avatar">
                    <Settings size={14} />
                  </span>
                  <span>
                    <strong>Global portal settings</strong>
                    <small>SOP text and script PDF</small>
                  </span>
                  <Pencil size={13} />
                </button>
              ) : (
                <>
                  <label className="search-box">
                    <Search size={14} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search records…"
                    />
                  </label>
                  <div className="record-list">
                    {filtered.map((record) => (
                      <button
                        className={`record-row ${selectedId === record.id ? "active" : ""}`}
                        onClick={() => selectRecord(record)}
                        key={text(record.id)}
                      >
                        <span className="record-avatar">
                          {(recordTitle(record) || "?").slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong>{recordTitle(record)}</strong>
                          <small>{text(record.id)}</small>
                        </span>
                        <Pencil size={13} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
        <section className="editor-panel">
          {showingCallRecordings && (
            <AudioUploadPanel recordings={uploadedRecordings} onChanged={onRecordingsChanged} />
          )}
          {!showingCallRecordings && meta && (selectedId || Object.keys(draft).length > 0) ? (
            <>
              <div className="editor-head">
                <div>
                  <span className="eyebrow">{meta.label.toUpperCase()}</span>
                  <h2>{selectedId ? recordTitle(draft) || selectedId : "New record"}</h2>
                </div>
                {!meta.singleton && !meta.existingOnly && selectedId && (
                  <button
                    className="danger-icon"
                    onClick={() => setDeleteId(selectedId)}
                    aria-label="Delete record"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="record-form">
                {meta.fields.map((field) => (
                  <RecordFormField
                    key={field.name}
                    field={field}
                    draft={draft}
                    onChange={setDraft}
                  />
                ))}
              </div>
              <div className="editor-footer">
                <span>{notice}</span>
                <button className="primary-button compact" onClick={saveDraft} disabled={saving}>
                  <Save size={14} /> {saving ? "Saving…" : "Save record"}
                </button>
              </div>
            </>
          ) : (
            !showingCallRecordings && (
              <div className="editor-empty">
                <BookOpen size={30} />
                <h2>Select a record</h2>
                <p>Choose an item to edit it, or create a new one.</p>
              </div>
            )
          )}
        </section>
      </div>
      {deleteId && (
        <div className="modal-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <span className="danger-bubble">
              <Trash2 size={19} />
            </span>
            <h2 id="delete-title">Delete this record?</h2>
            <p>
              This permanently removes <strong>{deleteId}</strong> from the database.
            </p>
            <div>
              <button className="outline-button" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="danger-button" onClick={confirmDelete}>
                Delete record
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * Upload and manage call recordings.
 *
 * Two audiences, one panel. A rep uploads their own calls to be reviewed and
 * may only remove their own; a manager is curating the whole company's
 * library and may remove any of it. The server enforces both — the delete
 * rule is `owner = @request.auth.id || manager || staff` — so `variant` is
 * only about not offering a rep a button that would be refused.
 */
function AudioUploadPanel({
  recordings,
  onChanged,
  variant = "admin",
}: {
  recordings: ContentRecord[];
  onChanged: () => Promise<void>;
  variant?: "rep" | "admin";
}) {
  const isRep = variant === "rep";
  const currentUserId = text((pb.authStore.record as ContentRecord | null)?.id);
  const canRemove = (recording: ContentRecord) =>
    !isRep || text(recording.owner) === currentUserId;
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload() {
    if (!file) {
      setStatus("Choose an audio file first.");
      return;
    }
    setBusy(true);
    setStatus("Uploading audio…");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", title || file.name);
      form.set("duration", duration);
      form.set("coaching_notes", notes);
      await pb.collection("call_recordings").create(form);
      setFile(null);
      setTitle("");
      setDuration("");
      setNotes("");
      setStatus(
        isRep
          ? "Uploaded. Your manager can see it in the Call Library."
          : "Audio uploaded. It is now available in the Call Library.",
      );
      const input = document.getElementById("call-audio-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await onChanged();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("Remove this uploaded call?")) return;
    setStatus("Removing audio…");
    try {
      await pb.collection("call_recordings").delete(id);
      await onChanged();
      setStatus("Uploaded call removed.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not remove the audio.");
    }
  }
  return (
    <div className="audio-upload-manager">
      <div className="audio-upload-heading">
        <span className="upload-bubble">
          <Upload size={18} />
        </span>
        <div>
          <span className="eyebrow">{isRep ? "UPLOAD A CALL" : "UPLOAD AUDIO"}</span>
          <h2>{isRep ? "Submit a call for review" : "Add a coached call"}</h2>
          <p>MP3, M4A, WAV, AAC, OGG, or WebM. Maximum file size: 100 MB.</p>
        </div>
      </div>
      <label className="file-drop">
        <input
          id="call-audio-file"
          type="file"
          accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.webm"
          onChange={(event) => {
            const next = event.target.files?.[0] ?? null;
            setFile(next);
            if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, ""));
          }}
        />
        <Upload size={20} />
        <span>
          <strong>{file ? file.name : "Choose an audio file"}</strong>
          <small>
            {file
              ? `${(file.size / 1024 / 1024).toFixed(1)} MB selected`
              : "Click here to browse your computer"}
          </small>
        </span>
      </label>
      <div className="upload-fields">
        <label>
          Call title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={
              isRep ? "Example: Tuesday morning — gatekeeper" : "Example: Warm lead — inspection set"
            }
          />
        </label>
        <label>
          Duration
          <input
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            placeholder="Example: 04:18"
          />
        </label>
      </div>
      <label>
        {isRep ? "Anything you want looked at?" : "Coaching notes"}
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={
            isRep
              ? "Optional. Where did it get away from you?"
              : "What should the rep listen for in this call?"
          }
          maxLength={1500}
        />
      </label>
      <div className="upload-actions">
        <span>{status}</span>
        <button className="primary-button compact" onClick={upload} disabled={busy || !file}>
          <Upload size={13} /> {busy ? "Uploading…" : "Upload call"}
        </button>
      </div>
      {/* Admin only: in the rep portal the Call Library below is already this
          list, and showing both renders every call twice. */}
      {!isRep && recordings.length > 0 && (
        <div className="uploaded-call-list">
          <span className="eyebrow">UPLOADED CALLS</span>
          {recordings.map((recording) => (
            <div className="uploaded-call-row" key={text(recording.id)}>
              <Headphones size={14} />
              <span>
                <strong>{text(recording.title)}</strong>
                <small>
                  {text(recording.file_name)}
                  {text(recording.duration) ? ` · ${text(recording.duration)}` : ""}
                </small>
              </span>
              {canRemove(recording) && (
                <button
                  className="danger-icon"
                  onClick={() => remove(text(recording.id))}
                  aria-label={`Remove ${text(recording.title)}`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
