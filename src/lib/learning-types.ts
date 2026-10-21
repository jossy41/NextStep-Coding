export type Lang = "en" | "am";
export type CourseStatus = "draft" | "published" | "archived";
export type Level = "beginner" | "intermediate" | "advanced";
export type ProjectStatus = "pending" | "approved" | "rejected" | "revision_requested";
export type ReasonCode = "not_enrolled" | "lessons" | "quizzes" | "project" | "name" | "duplicate";

export type RubricItem = { criterion: string; points: number };

export type CourseCard = {
  id: string;
  slug: string;
  status: CourseStatus;
  language: Lang;
  level: Level;
  category: string;
  durationHours: number;
  thumbnailUrl: string | null;
  title: string;
  titleAm: string;
  description: string;
  descriptionAm: string;
  moduleCount: number;
  lessonCount: number;
  sortOrder: number;
  projectTitle: string;
  projectTitleAm: string;
};

export type LessonOutline = {
  id: string;
  title: string;
  titleAm: string;
  durationMinutes: number;
  sortOrder: number;
  hasQuiz: boolean;
  videoId: string | null;
};

export type ModuleOutline = {
  id: string;
  title: string;
  titleAm: string;
  description: string;
  sortOrder: number;
  lessons: LessonOutline[];
};

export type CourseDetail = CourseCard & {
  prerequisites: string;
  prerequisitesAm: string;
  objectives: string[];
  objectivesAm: string[];
  projectBrief: string;
  projectBriefAm: string;
  projectRequirements: string[];
  projectRequirementsAm: string[];
  projectRubric: RubricItem[];
  minQuizScore: number;
  requireProject: boolean;
  modules: ModuleOutline[];
  enrolled: boolean;
  completedLessons: number;
  projectStatus: ProjectStatus | null;
  canPreview: boolean;
};

export type VideoItem = {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  category: string;
  language: Lang;
  courseId: string | null;
  lessonId: string | null;
  courseTitle: string | null;
  status: "draft" | "published";
  sortOrder: number;
  /** True when playback fields were withheld because the viewer is not enrolled. */
  locked?: boolean;
};

export type PostItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverUrl: string | null;
  category: string;
  language: Lang;
  status: "draft" | "published";
  pinned: boolean;
  publishedAt: string | null;
  scheduled: boolean;
};

export type QuizQuestionPublic = { id: string; question: string; options: string[] };

export type LessonPayload = {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  courseTitleAm: string;
  minQuizScore: number;
  lesson: {
    id: string;
    title: string;
    titleAm: string;
    content: string;
    contentAm: string;
    exercises: string[];
    exercisesAm: string[];
    resources: string;
    durationMinutes: number;
  };
  video: { id: string; title: string; youtubeId: string; status: "draft" | "published" } | null;
  questions: QuizQuestionPublic[];
  modules: ModuleOutline[];
  completed: boolean;
  latestQuiz: { score: number; passed: boolean } | null;
  prevId: string | null;
  nextId: string | null;
  project: {
    title: string;
    titleAm: string;
    brief: string;
    briefAm: string;
    requirements: string[];
    requirementsAm: string[];
    status: ProjectStatus | null;
    url: string;
    description: string;
    feedback: string;
  };
};

export type CertificatePublic = {
  code: string;
  studentName: string;
  achievement: string;
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  issuerName: string;
  issuerRole: string;
  orgName: string;
};

export type Me = {
  id: string;
  email: string | null;
  name: string;
  role: "student" | "admin" | "reviewer";
  preferredLanguage: Lang;
};

export type DashboardData = {
  me: Me;
  enrollments: Array<{
    courseId: string;
    slug: string;
    title: string;
    titleAm: string;
    status: string;
    completed: number;
    total: number;
    nextLessonId: string | null;
  }>;
  certificates: Array<{
    code: string;
    achievement: string;
    issuedAt: string;
    revokedAt: string | null;
  }>;
  projects: Array<{
    courseTitle: string;
    courseTitleAm: string;
    status: ProjectStatus;
    feedback: string;
    url: string;
  }>;
};
