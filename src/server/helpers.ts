import type { Sql } from "@/lib/db";
import type {
  CourseCard,
  CourseDetail,
  CourseStatus,
  Lang,
  LessonOutline,
  Level,
  ModuleOutline,
  PostItem,
  ProjectStatus,
  ReasonCode,
  RubricItem,
  VideoItem,
} from "@/lib/learning-types";
import { redactLockedVideoIds } from "@/server/video-access";

export type Role = "student" | "admin" | "reviewer";
export type Fail = { ok: false; error: string };

export function bag(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as Record<string, unknown>;
}

export function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function flag(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}

export function asRubric(value: unknown): RubricItem[] {
  if (!Array.isArray(value)) return [];
  const items: RubricItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.criterion !== "string") continue;
    const points = typeof rec.points === "number" ? rec.points : Number(rec.points);
    if (!Number.isFinite(points)) continue;
    items.push({ criterion: rec.criterion, points });
  }
  return items;
}

export function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
}

export function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function cleanHttpUrl(input: string, optional: boolean): string | null {
  const value = input.trim();
  if (!value) return optional ? "" : null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export function linesOf(text: string, maxItems = 40): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .map((line) => line.slice(0, 400));
}

export function parseTime(value: unknown): string | null | "invalid" {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "invalid";
  return date.toISOString();
}

export async function ensureProfile(sql: Sql, userId: string) {
  const users = await sql<{ name: string }>`select name from "user" where id = ${userId}`;
  const name = users[0]?.name ?? "";
  await sql`
    insert into profiles (user_id, full_name)
    values (${userId}, ${name})
    on conflict (user_id) do update
      set full_name = case when profiles.full_name = '' then excluded.full_name else profiles.full_name end,
          updated_at = now()
  `;
}

export async function roleOf(sql: Sql, userId: string): Promise<Role> {
  const rows = await sql<{ role: string }>`select role from profiles where user_id = ${userId}`;
  const role = rows[0]?.role;
  if (role === "admin" || role === "reviewer" || role === "student") return role;
  return "student";
}

export async function audit(
  sql: Sql,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, string>,
) {
  await sql`
    insert into audit_logs (id, actor_id, action, target_type, target_id, metadata)
    values (
      ${nid("aud")}, ${actorId}, ${action}, ${targetType}, ${targetId},
      ${metadata ? JSON.stringify(metadata) : null}::jsonb
    )
  `;
}

type CourseRow = {
  id: string;
  slug: string;
  status: string;
  language: string;
  level: string;
  category: string;
  duration_hours: number;
  thumbnail_url: string | null;
  prerequisites: string;
  prerequisites_am: string;
  min_quiz_score: number;
  require_project: boolean | string;
  project_title: string;
  project_title_am: string;
  project_brief: string;
  project_brief_am: string;
  project_requirements: unknown;
  project_requirements_am: unknown;
  project_rubric: unknown;
  sort_order: number;
  title: string | null;
  description: string | null;
  objectives: unknown;
  title_am: string | null;
  description_am: string | null;
  objectives_am: unknown;
  module_count: number;
  lesson_count: number;
};

const COURSE_SQL = `
  select c.id, c.slug, c.status, c.language, c.level, c.category, c.duration_hours,
    c.thumbnail_url, c.prerequisites, c.prerequisites_am, c.min_quiz_score, c.require_project,
    c.project_title, c.project_title_am, c.project_brief, c.project_brief_am,
    c.project_requirements, c.project_requirements_am, c.project_rubric, c.sort_order,
    en.title, en.description, en.objectives,
    am.title as title_am, am.description as description_am, am.objectives as objectives_am,
    (select count(*)::int from modules m where m.course_id = c.id) as module_count,
    (select count(*)::int from lessons l join modules m on m.id = l.module_id where m.course_id = c.id) as lesson_count
  from courses c
  left join course_translations en on en.course_id = c.id and en.locale = 'en'
  left join course_translations am on am.course_id = c.id and am.locale = 'am'
`;

function asStatus(value: string): CourseStatus {
  if (value === "published" || value === "archived" || value === "draft") return value;
  return "draft";
}

function asLevel(value: string): Level {
  if (value === "intermediate" || value === "advanced" || value === "beginner") return value;
  return "beginner";
}

function asLang(value: string): Lang {
  return value === "am" ? "am" : "en";
}

export function toCard(row: CourseRow): CourseCard {
  return {
    id: row.id,
    slug: row.slug,
    status: asStatus(row.status),
    language: asLang(row.language),
    level: asLevel(row.level),
    category: row.category,
    durationHours: Number(row.duration_hours) || 0,
    thumbnailUrl: row.thumbnail_url,
    title: row.title ?? row.slug,
    titleAm: row.title_am ?? "",
    description: row.description ?? "",
    descriptionAm: row.description_am ?? "",
    moduleCount: Number(row.module_count) || 0,
    lessonCount: Number(row.lesson_count) || 0,
    sortOrder: Number(row.sort_order) || 0,
    projectTitle: row.project_title ?? "",
    projectTitleAm: row.project_title_am ?? "",
  };
}

export async function allCourses(sql: Sql): Promise<CourseRow[]> {
  return sql.query<CourseRow>(`${COURSE_SQL} order by c.sort_order, c.created_at`);
}

export async function courseBySlug(sql: Sql, slug: string): Promise<CourseRow | null> {
  const rows = await sql.query<CourseRow>(`${COURSE_SQL} where c.slug = $1`, [slug]);
  return rows[0] ?? null;
}

export async function courseById(sql: Sql, id: string): Promise<CourseRow | null> {
  const rows = await sql.query<CourseRow>(`${COURSE_SQL} where c.id = $1`, [id]);
  return rows[0] ?? null;
}

type LessonRow = {
  id: string;
  module_id: string;
  title: string;
  title_am: string;
  duration_minutes: number;
  sort_order: number;
  video_resource_id: string | null;
  has_quiz: boolean | string;
};

export async function outlines(sql: Sql, courseId: string): Promise<ModuleOutline[]> {
  const modules = await sql<{
    id: string;
    title: string;
    title_am: string;
    description: string;
    sort_order: number;
  }>`
    select id, title, title_am, description, sort_order
    from modules where course_id = ${courseId}
    order by sort_order, id
  `;
  const lessons = await sql<LessonRow>`
    select l.id, l.module_id, l.title, l.title_am, l.duration_minutes, l.sort_order,
      l.video_resource_id,
      exists(select 1 from quiz_questions q where q.lesson_id = l.id) as has_quiz
    from lessons l
    join modules m on m.id = l.module_id
    where m.course_id = ${courseId}
    order by l.sort_order, l.id
  `;
  return modules.map((mod) => ({
    id: mod.id,
    title: mod.title,
    titleAm: mod.title_am,
    description: mod.description,
    sortOrder: Number(mod.sort_order) || 0,
    lessons: lessons
      .filter((lesson) => lesson.module_id === mod.id)
      .map(
        (lesson): LessonOutline => ({
          id: lesson.id,
          title: lesson.title,
          titleAm: lesson.title_am,
          durationMinutes: Number(lesson.duration_minutes) || 0,
          sortOrder: Number(lesson.sort_order) || 0,
          hasQuiz: asBool(lesson.has_quiz),
          videoId: lesson.video_resource_id,
        }),
      ),
  }));
}

export function flatLessons(modules: ModuleOutline[]): LessonOutline[] {
  return modules.flatMap((mod) => mod.lessons);
}

export async function detailFor(
  sql: Sql,
  row: CourseRow,
  userId: string | null,
  isStaff: boolean,
): Promise<CourseDetail | Fail> {
  const enrolledRows = userId
    ? await sql<{ id: string }>`
        select id from enrollments where user_id = ${userId} and course_id = ${row.id}
      `
    : [];
  const enrolled = enrolledRows.length > 0;
  if (row.status === "draft" && !isStaff) return { ok: false, error: "not_found" };
  if (row.status === "archived" && !isStaff && !enrolled) return { ok: false, error: "not_found" };

  const modules = redactLockedVideoIds(await outlines(sql, row.id), enrolled || isStaff);
  const done = userId
    ? await sql<{ lesson_id: string }>`
        select lp.lesson_id from lesson_progress lp
        join lessons l on l.id = lp.lesson_id
        join modules m on m.id = l.module_id
        where lp.user_id = ${userId} and m.course_id = ${row.id}
      `
    : [];
  const submission = userId
    ? await sql<{ status: string }>`
        select status from project_submissions where user_id = ${userId} and course_id = ${row.id}
      `
    : [];
  const status = submission[0]?.status;
  const projectStatus: ProjectStatus | null =
    status === "pending" || status === "approved" || status === "rejected" || status === "revision_requested"
      ? status
      : null;

  return {
    ...toCard(row),
    prerequisites: row.prerequisites ?? "",
    prerequisitesAm: row.prerequisites_am ?? "",
    objectives: asStringArray(row.objectives),
    objectivesAm: asStringArray(row.objectives_am),
    projectBrief: row.project_brief ?? "",
    projectBriefAm: row.project_brief_am ?? "",
    projectRequirements: asStringArray(row.project_requirements),
    projectRequirementsAm: asStringArray(row.project_requirements_am),
    projectRubric: asRubric(row.project_rubric),
    minQuizScore: Number(row.min_quiz_score) || 70,
    requireProject: asBool(row.require_project),
    modules,
    enrolled,
    completedLessons: done.length,
    projectStatus,
    canPreview: isStaff,
  };
}

export type Progress = {
  enrolled: boolean;
  total: number;
  completed: number;
  quizzesOk: boolean;
  projectOk: boolean;
  requireProject: boolean;
  title: string;
  lessonsDone: boolean;
};

export async function courseProgress(sql: Sql, userId: string, courseId: string): Promise<Progress | null> {
  const courses = await sql<{ title: string | null; min_quiz_score: number; require_project: boolean | string }>`
    select t.title, c.min_quiz_score, c.require_project
    from courses c
    left join course_translations t on t.course_id = c.id and t.locale = 'en'
    where c.id = ${courseId}
  `;
  const course = courses[0];
  if (!course) return null;
  const lessons = await sql<{ id: string }>`
    select l.id from lessons l join modules m on m.id = l.module_id where m.course_id = ${courseId}
  `;
  const total = lessons.length;
  const done = await sql<{ lesson_id: string }>`
    select lp.lesson_id from lesson_progress lp
    join lessons l on l.id = lp.lesson_id
    join modules m on m.id = l.module_id
    where lp.user_id = ${userId} and m.course_id = ${courseId}
  `;
  const quizLessons = await sql<{ lesson_id: string }>`
    select distinct q.lesson_id from quiz_questions q
    join lessons l on l.id = q.lesson_id
    join modules m on m.id = l.module_id
    where m.course_id = ${courseId}
  `;
  const attempts = await sql<{ lesson_id: string; passed: boolean | string }>`
    select qa.lesson_id, qa.passed from quiz_attempts qa
    join lessons l on l.id = qa.lesson_id
    join modules m on m.id = l.module_id
    where qa.user_id = ${userId} and m.course_id = ${courseId}
    order by qa.attempted_at desc
  `;
  const latest = new Map<string, boolean>();
  for (const attempt of attempts) {
    if (!latest.has(attempt.lesson_id)) latest.set(attempt.lesson_id, asBool(attempt.passed));
  }
  const quizzesOk = quizLessons.every((row) => latest.get(row.lesson_id) === true);
  const enrollment = await sql`select id from enrollments where user_id = ${userId} and course_id = ${courseId}`;
  const subs = await sql<{ status: string }>`
    select status from project_submissions where user_id = ${userId} and course_id = ${courseId}
  `;
  const requireProject = asBool(course.require_project);
  const projectOk = !requireProject || subs[0]?.status === "approved";
  const completed = done.length;
  return {
    enrolled: enrollment.length > 0,
    total,
    completed,
    quizzesOk,
    projectOk,
    requireProject,
    title: course.title ?? "Course",
    lessonsDone: total > 0 && completed >= total,
  };
}

export function reasonCodes(progress: Progress, name: string, duplicate: boolean): ReasonCode[] {
  const reasons: ReasonCode[] = [];
  if (!progress.enrolled) reasons.push("not_enrolled");
  if (!progress.lessonsDone) reasons.push("lessons");
  if (!progress.quizzesOk) reasons.push("quizzes");
  if (!progress.projectOk) reasons.push("project");
  if (!name.trim()) reasons.push("name");
  if (duplicate) reasons.push("duplicate");
  return reasons;
}

export async function refreshEnrollment(sql: Sql, userId: string, courseId: string) {
  const progress = await courseProgress(sql, userId, courseId);
  if (!progress?.enrolled) return;
  const ready = progress.lessonsDone && progress.quizzesOk && progress.projectOk;
  const status = ready ? "completed" : progress.completed > 0 ? "in_progress" : "enrolled";
  await sql`
    update enrollments
    set status = ${status}, completed_at = ${ready ? new Date().toISOString() : null}
    where user_id = ${userId} and course_id = ${courseId}
  `;
}

export async function settingsMap(sql: Sql): Promise<Record<string, string>> {
  const rows = await sql<{ key: string; value: string }>`select key, value from app_settings`;
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;
  return map;
}

type VideoRow = {
  id: string;
  title: string;
  description: string;
  youtube_id: string;
  youtube_url: string;
  thumbnail_url: string;
  category: string;
  language: string;
  course_id: string | null;
  lesson_id: string | null;
  course_title: string | null;
  status: string;
  sort_order: number;
};

function toVideo(row: VideoRow): VideoItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    youtubeId: row.youtube_id,
    youtubeUrl: row.youtube_url,
    thumbnailUrl: row.thumbnail_url,
    category: row.category,
    language: asLang(row.language),
    courseId: row.course_id,
    lessonId: row.lesson_id,
    courseTitle: row.course_title,
    status: row.status === "published" ? "published" : "draft",
    sortOrder: Number(row.sort_order) || 0,
  };
}

const VIDEO_SQL = `
  select v.id, v.title, v.description, v.youtube_id, v.youtube_url, v.thumbnail_url,
    v.category, v.language, v.course_id, v.lesson_id, v.status, v.sort_order,
    t.title as course_title
  from video_resources v
  left join course_translations t on t.course_id = v.course_id and t.locale = 'en'
`;

export async function allVideos(sql: Sql): Promise<VideoItem[]> {
  const rows = await sql.query<VideoRow>(`${VIDEO_SQL} order by v.sort_order, v.created_at`);
  return rows.map(toVideo);
}

type PostRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  cover_url: string | null;
  category: string;
  language: string;
  status: string;
  pinned: boolean | string;
  published_at: unknown;
};

export function toPost(row: PostRow): PostItem {
  const publishedAt = iso(row.published_at);
  const published = row.status === "published";
  const scheduled = published && !!publishedAt && new Date(publishedAt).getTime() > Date.now();
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    body: row.body,
    coverUrl: row.cover_url,
    category: row.category,
    language: asLang(row.language),
    status: published ? "published" : "draft",
    pinned: asBool(row.pinned),
    publishedAt,
    scheduled,
  };
}

export function postVisible(post: PostItem): boolean {
  return post.status === "published" && !post.scheduled;
}

export async function allPosts(sql: Sql): Promise<PostItem[]> {
  const rows = await sql<PostRow>`
    select id, slug, title, summary, body, cover_url, category, language, status, pinned, published_at
    from posts
    order by pinned desc, published_at desc nulls last, created_at desc
  `;
  return rows.map(toPost);
}

export async function syncVideoLesson(sql: Sql, videoId: string, lessonId: string | null, courseId: string | null) {
  await sql`
    update lessons set video_resource_id = null
    where video_resource_id = ${videoId} and (${lessonId}::text is null or id <> ${lessonId})
  `;
  if (lessonId) {
    await sql`update lessons set video_resource_id = ${videoId} where id = ${lessonId}`;
  }
  await sql`
    update video_resources set lesson_id = ${lessonId}, course_id = ${courseId}, updated_at = now()
    where id = ${videoId}
  `;
}
