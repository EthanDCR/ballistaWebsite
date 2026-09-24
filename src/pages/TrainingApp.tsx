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
import { useNavigate } from "react-router-dom";
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
  return (pb.authStore.record as ContentRecord | null)?.role === "admin";
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
  return items.map((item) => ({
    ...item,
    file_name: text(item.file),
    recording_url: text(item.file) ? pb.files.getURL(item, text(item.file)) : "",
  }));
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

export default function TrainingApp() {
  useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AppMode>("rep");
  const [screen, setScreen] = useState<RepScreen>("home");
  const [content, setContent] = useState<ContentSnapshot>(EMPTY_SNAPSHOT);
  const [progress, setProgress] = useState<LearnerProgress>(createDefaultProgress);
  const [activeModuleId, setActiveModuleId] = useState("intro");
  const [activeLabId, setActiveLabId] = useState("script");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizActivityId, setQuizActivityId] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [uploadedRecordings, setUploadedRecordings] = useState<ContentRecord[]>([]);
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
    (activityId: string) => {
      const current = progressRef.current;
      const existing = current.completedActivities[activityId];
      if (existing) return;
      const next: LearnerProgress = {
        ...current,
        completedActivities: {
          ...current.completedActivities,
          [activityId]: { completedAt: new Date().toISOString() },
        },
        updatedAt: new Date().toISOString(),
      };
      persistProgress(next);
    },
    [persistProgress],
  );

  const openModule = useCallback((moduleId: string) => {
    setMode("rep");
    setActiveModuleId(moduleId);
    setScreen("module");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const openLab = useCallback(
    (labId: string) => {
      if (labId === "decision-tree") {
        navigate("/cold-call-tree");
        return;
      }
      setMode("rep");
      setActiveLabId(labId);
      setScreen("lab");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [navigate],
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
    awardActivity(quizActivityId);
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
      <Topbar mode={effectiveMode} onMode={setModeGuarded} onHome={goHome} />
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
            <RepHome progress={progress} onModule={openModule} onLab={openLab} />
          )}
          {screen === "module" && (
            <ModuleView
              moduleId={activeModuleId}
              content={content}
              progress={progress}
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
}: {
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
            <PhoneCall size={23} strokeWidth={2.6} />
          </span>
          <span>
            <strong>CALL-STARS</strong>
            <small>Training HQ</small>
          </span>
        </button>
        <div className="mode-switch" aria-label="Portal mode">
          <button className={mode === "rep" ? "active" : ""} onClick={() => onMode("rep")}>
            <Home size={16} /> Rep portal
          </button>
          {isAdmin() && (
            <button className={mode === "admin" ? "active" : ""} onClick={() => onMode("admin")}>
              <Settings size={16} /> Admin
            </button>
          )}
        </div>
        <div className="stats">
          <button
            className="sign-out-button"
            onClick={() => pb.authStore.clear()}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

function RepHome({
  progress,
  onModule,
  onLab,
}: {
  progress: LearnerProgress;
  onModule: (id: string) => void;
  onLab: (id: string) => void;
}) {
  const completedCount = modules.filter(
    (item) => progress.completedActivities[`module-${item.id}`],
  ).length;
  return (
    <div className="portal-page">
      <section className="hero-card">
        <div>
          <span className="eyebrow">ONBOARDING COURSE</span>
          <h1>Build the call, one win at a time.</h1>
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
            const unlocked =
              index === 0 ||
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
                      <Check size={30} strokeWidth={3} />
                    ) : unlocked ? (
                      courseModule.number
                    ) : (
                      <Lock size={25} />
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
              className={`lab-card tone-${index % 4}`}
              key={lab.id}
              onClick={() => onLab(lab.id)}
            >
              <span className="lab-icon">{labIcon(lab.id)}</span>
              <span>
                <strong>{lab.title}</strong>
                <small>{lab.description}</small>
              </span>
              <ChevronRight size={20} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuleView({
  moduleId,
  content,
  progress,
  questionsConfigured,
  onBack,
  onStartQuiz,
  onAward,
}: {
  moduleId: string;
  content: ContentSnapshot;
  progress: LearnerProgress;
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
        <ChevronLeft size={18} /> Back to path
      </button>
      <section className="detail-hero">
        <div className="detail-number">{completed ? <Check size={34} /> : courseModule.number}</div>
        <div>
          <span className="eyebrow">MODULE {courseModule.number}</span>
          <h1>{courseModule.title}</h1>
          <p>{moduleDescription(moduleId)}</p>
        </div>
        {completed && (
          <span className="complete-badge">
            <Check size={16} /> Complete
          </span>
        )}
      </section>
      {videoUrl && (
        <ModuleVideo number={courseModule.number} title={courseModule.title} url={videoUrl} />
      )}
      {(moduleId === "intro" || moduleId === "mindset" || moduleId === "operations") && (
        <FlexibleModuleContent content={moduleContent} />
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
      {moduleId === "signoff" && <SignOffModule content={content} onAward={onAward} />}
      {moduleId !== "signoff" && (
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
            <CirclePlay size={19} /> {questionsConfigured ? "Start checkpoint" : "Quiz not set up"}
          </button>
        </section>
      )}
    </div>
  );
}

function ModuleVideo({ number, title, url }: { number: number; title: string; url: string }) {
  return (
    <section className="lesson-video-card">
      <div className="lesson-video-heading">
        <CirclePlay size={20} />
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
        <Sparkles size={28} />
      </div>
      <div>
        <span className="eyebrow">START HERE</span>
        <h2>{text(content.overview_title)}</h2>
        <p>{text(content.overview_description)}</p>
        <div className="intro-topics">
          {stringList(content.overview_topics).map((topic) => (
            <span key={topic}>
              <Check size={16} />
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
          {good ? <Check size={14} /> : <X size={14} />} {item}
        </span>
      ))}
    </div>
  );
}

function SignOffModule({
  content,
  onAward,
}: {
  content: ContentSnapshot;
  onAward: (id: string) => void;
}) {
  const [typedName, setTypedName] = useState("");
  const [email, setEmail] = useState("");
  const [signature, setSignature] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit() {
    if (!typedName.trim() || !email.trim() || !signature) return;
    await createContentRecord("signOffs", {
      typed_name: typedName.trim(),
      user_email: email.trim(),
      signed_at: new Date().toISOString(),
      document_version: "1.0",
    });
    onAward("module-signoff");
    setSaved(true);
  }
  return (
    <div className="signoff-layout">
      <article className="sop-document">
        <span className="eyebrow">DOCUMENT VERSION 1.0</span>
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
            <Trophy size={42} />
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
              <Save size={18} /> Submit sign-off
            </button>
          </>
        )}
      </aside>
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
                {isCorrect && <Check size={20} />}
                {chosen && !isCorrect && <X size={20} />}
              </button>
            );
          })}
        </div>
      </section>
      {selected !== null && (
        <div className={`feedback-dock ${correct ? "correct" : "wrong"}`}>
          <div>
            {correct ? <Check size={26} /> : <X size={26} />}
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
            {index === questions.length - 1 ? "See results" : "Continue"} <ArrowRight size={18} />
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
          <Trophy size={52} />
        </div>
        <span className="eyebrow">LESSON COMPLETE</span>
        <h1>{summary.title}</h1>
        <p>You finished the checkpoint and saved your progress.</p>
        <div className="summary-stats">
          <div>
            <Target size={25} />
            <strong>{summary.accuracy}%</strong>
            <span>accuracy</span>
          </div>
        </div>
        <button className="primary-button full" onClick={onContinue}>
          Continue to path <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}

function LabView({
  labId,
  content,
  uploadedRecordings,
  onBack,
  onAward,
}: {
  labId: string;
  content: ContentSnapshot;
  uploadedRecordings: ContentRecord[];
  onBack: () => void;
  onAward: (id: string) => void;
}) {
  const lab = trainingLabs.find((item) => item.id === labId)!;
  return (
    <div className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ChevronLeft size={18} /> Back to portal
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
      {labId === "calls" && <CallLibrary items={uploadedRecordings} />}
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
            <ScrollText size={25} />
          </span>
          <div>
            <span className="eyebrow">SCRIPT FIELD GUIDE</span>
            <strong>{title}</strong>
            <small>{description}</small>
          </div>
        </div>
        <div className="pdf-reader-actions">
          <a className="outline-button compact" href={fileUrl} target="_blank" rel="noreferrer">
            Open full screen <ExternalLink size={15} />
          </a>
          <a className="primary-button compact" href={fileUrl} download>
            Download PDF <Download size={15} />
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
          <ScrollText size={36} />
          <strong>Open the script field guide</strong>
          <p>Your browser cannot display the PDF inside this page.</p>
          <a className="primary-button" href={fileUrl} target="_blank" rel="noreferrer">
            Open PDF <ExternalLink size={17} />
          </a>
        </div>
      </object>
    </section>
  );
}

function CallLibrary({ items }: { items: ContentRecord[] }) {
  if (!items.length)
    return (
      <p className="empty-media">
        No calls uploaded yet. Admins can add some from Admin → Call recordings.
      </p>
    );
  return (
    <div className="content-stack">
      {items.map((item) => (
        <article className="call-card" key={text(item.id)}>
          <div className="call-play">
            <Headphones size={28} />
          </div>
          <div className="card-main">
            <span className="eyebrow">
              COACHED CALL{text(item.duration) ? ` · ${text(item.duration)}` : ""}
            </span>
            <h2>{text(item.title)}</h2>
            <p>{text(item.coaching_notes)}</p>
            {text(item.recording_url) && (
              <audio
                className="call-audio"
                controls
                preload="metadata"
                src={text(item.recording_url)}
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
          {checked ? "Next scenario" : "Skip"} <ArrowRight size={17} />
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
              <X size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="outline-button compact"
          onClick={() => onChange({ ...draft, [field.name]: [...list, ""] })}
        >
          <Plus size={14} /> Add
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
              <Headphones size={38} />
              <h2>Call recordings</h2>
              <p>Upload and manage audio from the panel on the right.</p>
            </div>
          ) : (
            <>
              <div className="record-toolbar">
                <div>
                  <h2>{meta.label}</h2>
                </div>
                {!meta.singleton && (
                  <button className="primary-button compact" onClick={newRecord}>
                    <Plus size={17} /> New record
                  </button>
                )}
              </div>
              {meta.singleton ? (
                <button
                  className={`record-row ${editingSettings ? "active" : ""}`}
                  onClick={editSettings}
                >
                  <span className="record-avatar">
                    <Settings size={18} />
                  </span>
                  <span>
                    <strong>Global portal settings</strong>
                    <small>SOP text and script PDF</small>
                  </span>
                  <Pencil size={16} />
                </button>
              ) : (
                <>
                  <label className="search-box">
                    <Search size={17} />
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
                        <Pencil size={16} />
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
                {!meta.singleton && selectedId && (
                  <button
                    className="danger-icon"
                    onClick={() => setDeleteId(selectedId)}
                    aria-label="Delete record"
                  >
                    <Trash2 size={18} />
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
                  <Save size={17} /> {saving ? "Saving…" : "Save record"}
                </button>
              </div>
            </>
          ) : (
            !showingCallRecordings && (
              <div className="editor-empty">
                <BookOpen size={38} />
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
              <Trash2 size={24} />
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

function AudioUploadPanel({
  recordings,
  onChanged,
}: {
  recordings: ContentRecord[];
  onChanged: () => Promise<void>;
}) {
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
      setStatus("Audio uploaded. It is now available in the Call Library.");
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
          <Upload size={22} />
        </span>
        <div>
          <span className="eyebrow">UPLOAD AUDIO</span>
          <h2>Add a coached call</h2>
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
        <Upload size={25} />
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
            placeholder="Example: Warm lead — inspection set"
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
        Coaching notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What should the rep listen for in this call?"
          maxLength={1500}
        />
      </label>
      <div className="upload-actions">
        <span>{status}</span>
        <button className="primary-button compact" onClick={upload} disabled={busy || !file}>
          <Upload size={16} /> {busy ? "Uploading…" : "Upload call"}
        </button>
      </div>
      {recordings.length > 0 && (
        <div className="uploaded-call-list">
          <span className="eyebrow">UPLOADED CALLS</span>
          {recordings.map((recording) => (
            <div className="uploaded-call-row" key={text(recording.id)}>
              <Headphones size={18} />
              <span>
                <strong>{text(recording.title)}</strong>
                <small>
                  {text(recording.file_name)}
                  {text(recording.duration) ? ` · ${text(recording.duration)}` : ""}
                </small>
              </span>
              <button
                className="danger-icon"
                onClick={() => remove(text(recording.id))}
                aria-label={`Remove ${text(recording.title)}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
