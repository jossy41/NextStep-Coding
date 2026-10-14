import { createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { parseYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import type { ReasonCode } from "@/lib/learning-types";
import {
  allCourses,
  allPosts,
  allVideos,
  asStringArray,
  audit,
  bag,
  cleanHttpUrl,
  clip,
  courseById,
  courseProgress,
  ensureProfile,
  flag,
  iso,
  linesOf,
  nid,
  num,
  oneOf,
  outlines,
  parseTime,
  reasonCodes,
  refreshEnrollment,
  roleOf,
  settingsMap,
  slugify,
  syncVideoLesson,
  toCard,
  toPost,
  type Fail,
  type Role,
} from "@/server/helpers";

async function ready() {
  const { ensureCatalog } = await import("@/server/seed");
  await ensureCatalog();
}

const input = (value: unknown) => bag(value);

async function requireAdmin(sql: Sql, userId: string): Promise<Fail | null> {
  await ensureProfile(sql, userId);
  if ((await roleOf(sql, userId)) !== "admin") return { ok: false, error: "You do not have administrator access." };
  return null;
}

async function requireReviewer(sql: Sql, userId: string): Promise<Fail | null> {
  await ensureProfile(sql, userId);
  const role = await roleOf(sql, userId);
  if (role !== "admin" && role !== "reviewer") return { ok: false, error: "You do not have review access." };
  return null;
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const courses = (await allCourses(sql)).map(toCard);
    const videos = await allVideos(sql);
    const posts = await allPosts(sql);
    const students = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'student'`;
    const pending = await sql<{ n: number }>`
      select count(*)::int as n from project_submissions where status = 'pending'
    `;
    const certs = await sql<{ n: number }>`
      select count(*)::int as n from certificates where revoked_at is null
    `;
    const recent = await sql<{
      id: string;
      project_url: string;
      status: string;
      full_name: string;
      title: string | null;
      updated_at: unknown;
    }>`
      select s.id, s.project_url, s.status, p.full_name, t.title, s.updated_at
      from project_submissions s
      join profiles p on p.user_id = s.user_id
      left join course_translations t on t.course_id = s.course_id and t.locale = 'en'
      where s.status = 'pending'
      order by s.updated_at desc
      limit 6
    `;
    const activity = await sql<{ action: string; target_id: string; created_at: unknown }>`
      select action, target_id, created_at from audit_logs order by created_at desc limit 8
    `;
    return {
      ok: true as const,
      stats: {
        publishedCourses: courses.filter((course) => course.status === "published").length,
        draftCourses: courses.filter((course) => course.status === "draft").length,
        students: Number(students[0]?.n) || 0,
        pendingProjects: Number(pending[0]?.n) || 0,
        activeCertificates: Number(certs[0]?.n) || 0,
        publishedPosts: posts.filter((post) => post.status === "published" && !post.scheduled).length,
        publishedVideos: videos.filter((video) => video.status === "published").length,
      },
      pending: recent.map((row) => ({
        id: row.id,
        url: row.project_url,
        status: row.status,
        student: row.full_name,
        course: row.title ?? "Course",
        updatedAt: iso(row.updated_at),
      })),
      activity: activity.map((row) => ({
        action: row.action,
        targetId: row.target_id,
        createdAt: iso(row.created_at),
      })),
    };
  });

export const adminListCourses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const q = clip(data.q, 80).toLowerCase();
    const status = clip(data.status, 20);
    const level = clip(data.level, 20);
    const language = clip(data.language, 8);
    const courses = (await allCourses(sql))
      .map(toCard)
      .filter((course) => (status && status !== "all" ? course.status === status : true))
      .filter((course) => (level && level !== "all" ? course.level === level : true))
      .filter((course) => (language && language !== "all" ? course.language === language : true))
      .filter((course) =>
        q ? `${course.title} ${course.titleAm} ${course.slug} ${course.category}`.toLowerCase().includes(q) : true,
      );
    return { ok: true as const, courses };
  });

export const adminGetCourse = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const row = await courseById(sql, clip(data.id, 80));
    if (!row) return { ok: false as const, error: "Course not found." };
    const modules = await outlines(sql, row.id);
    const lessons = await sql<{
      id: string;
      module_id: string;
      title: string;
      title_am: string;
      content: string;
      content_am: string;
      exercises: unknown;
      exercises_am: unknown;
      resources: string;
      duration_minutes: number;
      video_resource_id: string | null;
      sort_order: number;
    }>`
      select l.id, l.module_id, l.title, l.title_am, l.content, l.content_am, l.exercises, l.exercises_am,
        l.resources, l.duration_minutes, l.video_resource_id, l.sort_order
      from lessons l join modules m on m.id = l.module_id
      where m.course_id = ${row.id}
    `;
    return {
      ok: true as const,
      course: {
        ...toCard(row),
        prerequisites: row.prerequisites ?? "",
        prerequisitesAm: row.prerequisites_am ?? "",
        objectives: asStringArray(row.objectives).join("\n"),
        objectivesAm: asStringArray(row.objectives_am).join("\n"),
        projectBrief: row.project_brief ?? "",
        projectBriefAm: row.project_brief_am ?? "",
        projectRequirements: asStringArray(row.project_requirements).join("\n"),
        projectRequirementsAm: asStringArray(row.project_requirements_am).join("\n"),
        minQuizScore: Number(row.min_quiz_score) || 70,
        requireProject: row.require_project === true || row.require_project === "t" || row.require_project === "true",
        modules: modules.map((mod) => ({
          ...mod,
          lessons: lessons
            .filter((lesson) => lesson.module_id === mod.id)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((lesson) => ({
              id: lesson.id,
              title: lesson.title,
              titleAm: lesson.title_am,
              content: lesson.content,
              contentAm: lesson.content_am,
              exercises: asStringArray(lesson.exercises).join("\n"),
              exercisesAm: asStringArray(lesson.exercises_am).join("\n"),
              resources: lesson.resources ?? "",
              durationMinutes: Number(lesson.duration_minutes) || 0,
              videoId: lesson.video_resource_id,
            })),
        })),
      },
    };
  });

export const adminSaveCourse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const title = clip(data.title, 160);
    if (title.length < 2) return { ok: false as const, error: "English title is required." };
    const titleAm = clip(data.titleAm, 160);
    const description = clip(data.description, 4000);
    if (description.length < 10) return { ok: false as const, error: "Add a short English description." };
    let slug = slugify(clip(data.slug, 80) || title);
    if (!slug) slug = `course-${nid("c").slice(-6)}`;
    const status = oneOf(data.status, ["draft", "published", "archived"] as const, "draft");
    const language = oneOf(data.language, ["en", "am"] as const, "en");
    const level = oneOf(data.level, ["beginner", "intermediate", "advanced"] as const, "beginner");
    const category = clip(data.category, 80) || "Web development";
    const thumbnail = cleanHttpUrl(clip(data.thumbnailUrl, 500), true);
    if (thumbnail === null) return { ok: false as const, error: "Thumbnail must be an http(s) URL." };
    const id = clip(data.id, 80);
    const taken = await sql<{ id: string }>`select id from courses where slug = ${slug}`;
    if (taken[0] && taken[0].id !== id) return { ok: false as const, error: "That slug is already used." };
    const courseId = id || nid("crs");
    const payload = {
      duration: num(data.durationHours, 1, 0, 500),
      score: num(data.minQuizScore, 70, 0, 100),
      sort: num(data.sortOrder, 0, 0, 999),
      requireProject: flag(data.requireProject, true),
    };
    if (!id) {
      await sql`
        insert into courses (
          id, slug, status, language, level, category, duration_hours, thumbnail_url,
          prerequisites, prerequisites_am, min_quiz_score, require_project,
          project_title, project_title_am, project_brief, project_brief_am,
          project_requirements, project_requirements_am, sort_order
        ) values (
          ${courseId}, ${slug}, ${status}, ${language}, ${level}, ${category}, ${payload.duration},
          ${thumbnail || null}, ${clip(data.prerequisites, 1000)}, ${clip(data.prerequisitesAm, 1000)},
          ${payload.score}, ${payload.requireProject}, ${clip(data.projectTitle, 160)},
          ${clip(data.projectTitleAm, 160)}, ${clip(data.projectBrief, 4000)}, ${clip(data.projectBriefAm, 4000)},
          ${JSON.stringify(linesOf(clip(data.projectRequirements, 4000)))}::jsonb,
          ${JSON.stringify(linesOf(clip(data.projectRequirementsAm, 4000)))}::jsonb,
          ${payload.sort}
        )
      `;
    } else {
      const updated = await sql`
        update courses set
          slug = ${slug}, status = ${status}, language = ${language}, level = ${level},
          category = ${category}, duration_hours = ${payload.duration}, thumbnail_url = ${thumbnail || null},
          prerequisites = ${clip(data.prerequisites, 1000)}, prerequisites_am = ${clip(data.prerequisitesAm, 1000)},
          min_quiz_score = ${payload.score}, require_project = ${payload.requireProject},
          project_title = ${clip(data.projectTitle, 160)}, project_title_am = ${clip(data.projectTitleAm, 160)},
          project_brief = ${clip(data.projectBrief, 4000)}, project_brief_am = ${clip(data.projectBriefAm, 4000)},
          project_requirements = ${JSON.stringify(linesOf(clip(data.projectRequirements, 4000)))}::jsonb,
          project_requirements_am = ${JSON.stringify(linesOf(clip(data.projectRequirementsAm, 4000)))}::jsonb,
          sort_order = ${payload.sort}, updated_at = now()
        where id = ${courseId}
        returning id
      `;
      if (!updated.length) return { ok: false as const, error: "Course not found." };
    }
    await sql`
      insert into course_translations (course_id, locale, title, description, objectives)
      values (
        ${courseId}, 'en', ${title}, ${description},
        ${JSON.stringify(linesOf(clip(data.objectives, 4000)))}::jsonb
      )
      on conflict (course_id, locale) do update
        set title = excluded.title, description = excluded.description, objectives = excluded.objectives
    `;
    await sql`
      insert into course_translations (course_id, locale, title, description, objectives)
      values (
        ${courseId}, 'am', ${titleAm || title}, ${clip(data.descriptionAm, 4000) || description},
        ${JSON.stringify(linesOf(clip(data.objectivesAm, 4000)))}::jsonb
      )
      on conflict (course_id, locale) do update
        set title = excluded.title, description = excluded.description, objectives = excluded.objectives
    `;
    await audit(sql, context.userId, id ? "update_course" : "create_course", "course", courseId);
    return { ok: true as const, id: courseId };
  });

export const adminSetCourseStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const status = oneOf(data.status, ["draft", "published", "archived"] as const, "draft");
    const updated = await sql`
      update courses set status = ${status}, updated_at = now() where id = ${clip(data.id, 80)} returning id
    `;
    if (!updated.length) return { ok: false, error: "Course not found." };
    await audit(sql, context.userId, `course_${status}`, "course", clip(data.id, 80));
    return { ok: true };
  });

export const adminDeleteCourse = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const id = clip(data.id, 80);
    const certs = await sql`select id from certificates where course_id = ${id} limit 1`;
    if (certs.length) return { ok: false, error: "This course has certificates. Archive it instead of deleting it." };
    const removed = await sql`delete from courses where id = ${id} returning id`;
    if (!removed.length) return { ok: false, error: "Course not found." };
    await audit(sql, context.userId, "delete_course", "course", id);
    return { ok: true };
  });

export const adminSaveModule = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const title = clip(data.title, 160);
    if (title.length < 2) return { ok: false, error: "Module title is required." };
    const courseId = clip(data.courseId, 80);
    const course = await courseById(sql, courseId);
    if (!course) return { ok: false, error: "Course not found." };
    const id = clip(data.id, 80) || nid("mod");
    if (!clip(data.id, 80)) {
      const count = await sql<{ n: number }>`select count(*)::int as n from modules where course_id = ${courseId}`;
      await sql`
        insert into modules (id, course_id, title, title_am, description, sort_order)
        values (${id}, ${courseId}, ${title}, ${clip(data.titleAm, 160)}, ${clip(data.description, 1000)}, ${Number(count[0]?.n) || 0})
      `;
    } else {
      const updated = await sql`
        update modules set title = ${title}, title_am = ${clip(data.titleAm, 160)}, description = ${clip(data.description, 1000)}
        where id = ${id} and course_id = ${courseId} returning id
      `;
      if (!updated.length) return { ok: false, error: "Module not found." };
    }
    return { ok: true, id };
  });

export const adminDeleteModule = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const removed = await sql`delete from modules where id = ${clip(data.id, 80)} returning id`;
    if (!removed.length) return { ok: false, error: "Module not found." };
    return { ok: true };
  });

export const adminMoveModule = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const id = clip(data.id, 80);
    const dir = num(data.dir, 0, -1, 1);
    const parent = await sql<{ course_id: string }>`select course_id from modules where id = ${id}`;
    const courseId = parent[0]?.course_id;
    if (!courseId) return { ok: false, error: "Module not found." };
    const rows = await sql<{ id: string }>`select id from modules where course_id = ${courseId} order by sort_order, id`;
    await reorder(sql, rows.map((row) => row.id), id, dir, async (moduleId, order) => {
      await sql`update modules set sort_order = ${order} where id = ${moduleId}`;
    });
    return { ok: true };
  });

export const adminSaveLesson = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const title = clip(data.title, 160);
    if (title.length < 2) return { ok: false, error: "Lesson title is required." };
    const moduleId = clip(data.moduleId, 80);
    const parent = await sql<{ course_id: string }>`select course_id from modules where id = ${moduleId}`;
    const courseId = parent[0]?.course_id;
    if (!courseId) return { ok: false, error: "Module not found." };
    const videoId = clip(data.videoId, 80);
    if (videoId) {
      const video = await sql`select id from video_resources where id = ${videoId}`;
      if (!video.length) return { ok: false, error: "Choose a video from the library, or leave it empty." };
    }
    const id = clip(data.id, 80) || nid("les");
    const exercises = JSON.stringify(linesOf(clip(data.exercises, 4000)));
    const exercisesAm = JSON.stringify(linesOf(clip(data.exercisesAm, 4000)));
    if (!clip(data.id, 80)) {
      const count = await sql<{ n: number }>`select count(*)::int as n from lessons where module_id = ${moduleId}`;
      await sql`
        insert into lessons (
          id, module_id, title, title_am, content, content_am, exercises, exercises_am,
          resources, duration_minutes, sort_order, video_resource_id
        ) values (
          ${id}, ${moduleId}, ${title}, ${clip(data.titleAm, 160)}, ${clip(data.content, 20000)},
          ${clip(data.contentAm, 20000)}, ${exercises}::jsonb, ${exercisesAm}::jsonb,
          ${clip(data.resources, 4000)}, ${num(data.durationMinutes, 10, 1, 600)},
          ${Number(count[0]?.n) || 0}, ${videoId || null}
        )
      `;
    } else {
      const updated = await sql`
        update lessons set
          title = ${title}, title_am = ${clip(data.titleAm, 160)},
          content = ${clip(data.content, 20000)}, content_am = ${clip(data.contentAm, 20000)},
          exercises = ${exercises}::jsonb, exercises_am = ${exercisesAm}::jsonb,
          resources = ${clip(data.resources, 4000)}, duration_minutes = ${num(data.durationMinutes, 10, 1, 600)},
          video_resource_id = ${videoId || null}, updated_at = now()
        where id = ${id} and module_id = ${moduleId}
        returning id
      `;
      if (!updated.length) return { ok: false, error: "Lesson not found." };
    }
    if (videoId) await syncVideoLesson(sql, videoId, id, courseId);
    else await sql`update video_resources set lesson_id = null, updated_at = now() where lesson_id = ${id}`;
    return { ok: true, id };
  });

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const removed = await sql`delete from lessons where id = ${clip(data.id, 80)} returning id`;
    if (!removed.length) return { ok: false, error: "Lesson not found." };
    return { ok: true };
  });

export const adminMoveLesson = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const id = clip(data.id, 80);
    const dir = num(data.dir, 0, -1, 1);
    const parent = await sql<{ module_id: string }>`select module_id from lessons where id = ${id}`;
    const moduleId = parent[0]?.module_id;
    if (!moduleId) return { ok: false, error: "Lesson not found." };
    const rows = await sql<{ id: string }>`select id from lessons where module_id = ${moduleId} order by sort_order, id`;
    await reorder(sql, rows.map((row) => row.id), id, dir, async (lessonId, order) => {
      await sql`update lessons set sort_order = ${order} where id = ${lessonId}`;
    });
    return { ok: true };
  });

async function reorder(sql: Sql, ids: string[], id: string, dir: number, apply: (id: string, order: number) => Promise<void>) {
  const index = ids.indexOf(id);
  const next = index + dir;
  if (index < 0 || next < 0 || next >= ids.length) return;
  const copy = ids.slice();
  const [item] = copy.splice(index, 1);
  if (!item) return;
  copy.splice(next, 0, item);
  for (let i = 0; i < copy.length; i += 1) await apply(copy[i] ?? "", i);
}

export const adminListVideos = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const courses = (await allCourses(sql)).map(toCard);
    return { ok: true as const, videos: await allVideos(sql), courses };
  });

export const adminSaveVideo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const youtubeId = parseYouTubeId(clip(data.source, 400));
    if (!youtubeId) return { ok: false, error: "Enter a valid YouTube URL or video ID." };
    const title = clip(data.title, 160);
    if (title.length < 2) return { ok: false, error: "Video title is required." };
    const language = oneOf(data.language, ["en", "am"] as const, "en");
    const status = oneOf(data.status, ["draft", "published"] as const, "draft");
    const courseId = clip(data.courseId, 80) || null;
    const lessonId = clip(data.lessonId, 80) || null;
    if (courseId && !(await courseById(sql, courseId))) return { ok: false, error: "Course not found." };
    if (lessonId) {
      const lesson = await sql<{ course_id: string }>`
        select m.course_id from lessons l join modules m on m.id = l.module_id where l.id = ${lessonId}
      `;
      if (!lesson[0]) return { ok: false, error: "Lesson not found." };
      if (courseId && lesson[0].course_id !== courseId) return { ok: false, error: "That lesson is not in the selected course." };
    }
    const id = clip(data.id, 80) || nid("vid");
    const source = clip(data.source, 400);
    const thumb = youtubeThumbnail(youtubeId);
    if (!clip(data.id, 80)) {
      const count = await sql<{ n: number }>`select count(*)::int as n from video_resources`;
      await sql`
        insert into video_resources (
          id, title, description, youtube_id, youtube_url, thumbnail_url, category, language,
          course_id, lesson_id, status, sort_order
        ) values (
          ${id}, ${title}, ${clip(data.description, 4000)}, ${youtubeId}, ${source}, ${thumb},
          ${clip(data.category, 80) || "General"}, ${language}, ${courseId}, ${lessonId}, ${status},
          ${Number(count[0]?.n) || 0}
        )
      `;
    } else {
      const updated = await sql`
        update video_resources set
          title = ${title}, description = ${clip(data.description, 4000)}, youtube_id = ${youtubeId},
          youtube_url = ${source}, thumbnail_url = ${thumb}, category = ${clip(data.category, 80) || "General"},
          language = ${language}, status = ${status}, updated_at = now()
        where id = ${id} returning id
      `;
      if (!updated.length) return { ok: false, error: "Video not found." };
    }
    await syncVideoLesson(sql, id, lessonId, courseId);
    return { ok: true, id };
  });

export const adminDeleteVideo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const removed = await sql`delete from video_resources where id = ${clip(data.id, 80)} returning id`;
    if (!removed.length) return { ok: false, error: "Video not found." };
    return { ok: true };
  });

export const adminMoveVideo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const rows = await sql<{ id: string }>`select id from video_resources order by sort_order, created_at`;
    await reorder(sql, rows.map((row) => row.id), clip(data.id, 80), num(data.dir, 0, -1, 1), async (id, order) => {
      await sql`update video_resources set sort_order = ${order} where id = ${id}`;
    });
    return { ok: true };
  });

export const adminListPosts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const q = clip(data.q, 80).toLowerCase();
    const status = clip(data.status, 20);
    const posts = (await allPosts(sql))
      .filter((post) => (status && status !== "all" ? post.status === status : true))
      .filter((post) => (q ? `${post.title} ${post.summary} ${post.category}`.toLowerCase().includes(q) : true));
    return { ok: true as const, posts };
  });

export const adminSavePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true; id: string } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const title = clip(data.title, 180);
    if (title.length < 2) return { ok: false, error: "Title is required." };
    const body = clip(data.body, 30000);
    if (body.length < 10) return { ok: false, error: "Write the post before saving." };
    let slug = slugify(clip(data.slug, 80) || title);
    if (!slug) slug = `post-${nid("p").slice(-6)}`;
    const id = clip(data.id, 80);
    const taken = await sql<{ id: string }>`select id from posts where slug = ${slug}`;
    if (taken[0] && taken[0].id !== id) return { ok: false, error: "That slug is already used." };
    const cover = cleanHttpUrl(clip(data.coverUrl, 500), true);
    if (cover === null) return { ok: false, error: "Cover image must be an http(s) URL." };
    const status = oneOf(data.status, ["draft", "published"] as const, "draft");
    const when = parseTime(data.publishedAt);
    if (when === "invalid") return { ok: false, error: "Publication date is not valid." };
    const publishedAt = status === "published" ? when ?? new Date().toISOString() : when;
    const postId = id || nid("post");
    const language = oneOf(data.language, ["en", "am"] as const, "en");
    if (!id) {
      await sql`
        insert into posts (id, slug, title, summary, body, cover_url, category, language, status, pinned, published_at)
        values (
          ${postId}, ${slug}, ${title}, ${clip(data.summary, 400)}, ${body}, ${cover || null},
          ${clip(data.category, 80) || "Announcement"}, ${language}, ${status}, ${flag(data.pinned, false)},
          ${publishedAt}
        )
      `;
    } else {
      const updated = await sql`
        update posts set
          slug = ${slug}, title = ${title}, summary = ${clip(data.summary, 400)}, body = ${body},
          cover_url = ${cover || null}, category = ${clip(data.category, 80) || "Announcement"},
          language = ${language}, status = ${status}, pinned = ${flag(data.pinned, false)},
          published_at = ${publishedAt}, updated_at = now()
        where id = ${postId} returning id
      `;
      if (!updated.length) return { ok: false, error: "Post not found." };
    }
    await audit(sql, context.userId, status === "published" ? "publish_post" : "save_post", "post", postId);
    return { ok: true, id: postId };
  });

export const adminDeletePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const removed = await sql`delete from posts where id = ${clip(data.id, 80)} returning id`;
    if (!removed.length) return { ok: false, error: "Post not found." };
    return { ok: true };
  });

export const adminListSubmissions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireReviewer(sql, context.userId);
    if (denied) return denied;
    const status = clip(data.status, 40);
    const q = clip(data.q, 80).toLowerCase();
    const rows = await sql<{
      id: string;
      user_id: string;
      project_url: string;
      description: string;
      status: string;
      feedback: string;
      full_name: string;
      email: string;
      title: string | null;
      updated_at: unknown;
    }>`
      select s.id, s.user_id, s.project_url, s.description, s.status, s.feedback, p.full_name, u.email,
        t.title, s.updated_at
      from project_submissions s
      join profiles p on p.user_id = s.user_id
      join "user" u on u.id = s.user_id
      left join course_translations t on t.course_id = s.course_id and t.locale = 'en'
      order by s.updated_at desc
    `;
    const submissions = rows
      .filter((row) => (status && status !== "all" ? row.status === status : true))
      .filter((row) =>
        q ? `${row.full_name} ${row.email} ${row.title ?? ""} ${row.project_url}`.toLowerCase().includes(q) : true,
      )
      .map((row) => ({
        id: row.id,
        student: row.full_name || row.email,
        email: row.email,
        course: row.title ?? "Course",
        url: row.project_url,
        description: row.description,
        status: row.status,
        feedback: row.feedback,
        updatedAt: iso(row.updated_at),
      }));
    return { ok: true as const, submissions };
  });

export const adminReviewSubmission = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireReviewer(sql, context.userId);
    if (denied) return denied;
    const status = oneOf(data.status, ["approved", "rejected", "revision_requested"] as const, "revision_requested");
    const feedback = clip(data.feedback, 4000);
    if (feedback.length < 2) return { ok: false, error: "Write feedback for the student." };
    const id = clip(data.id, 80);
    const rows = await sql<{ user_id: string; course_id: string }>`
      select user_id, course_id from project_submissions where id = ${id}
    `;
    const row = rows[0];
    if (!row) return { ok: false, error: "Submission not found." };
    await sql`
      update project_submissions
      set status = ${status}, feedback = ${feedback}, reviewer_id = ${context.userId}, updated_at = now()
      where id = ${id}
    `;
    await sql`
      insert into project_reviews (id, submission_id, reviewer_id, status, feedback)
      values (${nid("rev")}, ${id}, ${context.userId}, ${status}, ${feedback})
    `;
    await refreshEnrollment(sql, row.user_id, row.course_id);
    await audit(sql, context.userId, `project_${status}`, "submission", id);
    return { ok: true };
  });

export const adminCertificateQueue = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const q = clip(data.q, 80).toLowerCase();
    const certs = await sql<{
      id: string;
      certificate_code: string;
      student_name: string;
      achievement_title: string;
      issued_at: unknown;
      revoked_at: unknown;
      revoked_reason: string | null;
    }>`
      select id, certificate_code, student_name, achievement_title, issued_at, revoked_at, revoked_reason
      from certificates order by issued_at desc
    `;
    const courses = (await allCourses(sql)).map(toCard);
    const filtered = certs
      .filter((row) =>
        q
          ? `${row.student_name} ${row.achievement_title} ${row.certificate_code}`.toLowerCase().includes(q)
          : true,
      )
      .map((row) => ({
        id: row.id,
        code: row.certificate_code,
        studentName: row.student_name,
        achievement: row.achievement_title,
        issuedAt: iso(row.issued_at) ?? "",
        revokedAt: iso(row.revoked_at),
        revokedReason: row.revoked_reason,
      }));
    return { ok: true as const, certificates: filtered, courses };
  });

export const adminEligibility = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const courseId = clip(data.courseId, 80);
    const course = await courseById(sql, courseId);
    if (!course) return { ok: false as const, error: "Course not found." };
    const students = await sql<{ user_id: string; full_name: string; email: string }>`
      select e.user_id, p.full_name, u.email
      from enrollments e
      join profiles p on p.user_id = e.user_id
      join "user" u on u.id = e.user_id
      where e.course_id = ${courseId}
      order by p.full_name
    `;
    const people = [];
    for (const student of students) {
      const progress = await courseProgress(sql, student.user_id, courseId);
      if (!progress) continue;
      const existing = await sql`
        select id from certificates
        where user_id = ${student.user_id} and course_id = ${courseId} and revoked_at is null
      `;
      const reasons: ReasonCode[] = reasonCodes(progress, student.full_name, existing.length > 0);
      people.push({
        userId: student.user_id,
        name: student.full_name || student.email,
        email: student.email,
        eligible: reasons.length === 0,
        reasons,
        completed: progress.completed,
        total: progress.total,
      });
    }
    return { ok: true as const, people };
  });

function makeCertificateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let body = "";
  for (const byte of bytes) body += alphabet[byte % alphabet.length];
  return `NSC-${new Date().getUTCFullYear()}-${body}`;
}

export const adminIssueCertificate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const courseId = clip(data.courseId, 80);
    const userId = clip(data.userId, 80);
    const course = await courseById(sql, courseId);
    if (!course) return { ok: false as const, error: "Course not found." };
    const profile = await sql<{ full_name: string }>`select full_name from profiles where user_id = ${userId}`;
    const name = profile[0]?.full_name?.trim() ?? "";
    const progress = await courseProgress(sql, userId, courseId);
    if (!progress) return { ok: false as const, error: "Course not found." };
    const existing = await sql`
      select id from certificates where user_id = ${userId} and course_id = ${courseId} and revoked_at is null
    `;
    const reasons = reasonCodes(progress, name, existing.length > 0);
    if (reasons.length) {
      return { ok: false as const, error: "This student is not eligible for a certificate yet.", reasons };
    }
    const map = await settingsMap(sql);
    const code = makeCertificateCode();
    const achievement = course.language === "am" && course.title_am ? course.title_am : course.title ?? course.slug;
    await sql`
      insert into certificates (
        id, certificate_code, user_id, course_id, student_name, achievement_title, issuer_name, issuer_role
      ) values (
        ${nid("cert")}, ${code}, ${userId}, ${courseId}, ${name}, ${achievement},
        ${map.issuer_name || ""}, ${map.issuer_role || ""}
      )
    `;
    await audit(sql, context.userId, "issue_certificate", "certificate", code, { userId, courseId });
    return { ok: true as const, code };
  });

export const adminRevokeCertificate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const reason = clip(data.reason, 500);
    if (reason.length < 3) return { ok: false, error: "Record a reason for revocation." };
    const id = clip(data.id, 80);
    const updated = await sql<{ certificate_code: string }>`
      update certificates
      set revoked_at = now(), revoked_reason = ${reason}
      where id = ${id} and revoked_at is null
      returning certificate_code
    `;
    if (!updated.length) return { ok: false, error: "Certificate not found or already revoked." };
    await audit(sql, context.userId, "revoke_certificate", "certificate", updated[0]?.certificate_code ?? id);
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const q = clip(data.q, 80).toLowerCase();
    const rows = await sql<{
      id: string;
      email: string;
      name: string;
      full_name: string | null;
      role: string | null;
      created_at: unknown;
    }>`
      select u.id, u.email, u.name, p.full_name, p.role, u."createdAt" as created_at
      from "user" u
      left join profiles p on p.user_id = u.id
      order by u."createdAt" desc
    `;
    const users = rows
      .filter((row) => (q ? `${row.email} ${row.name} ${row.full_name ?? ""}`.toLowerCase().includes(q) : true))
      .map((row) => ({
        id: row.id,
        email: row.email,
        name: row.full_name || row.name,
        role: row.role === "admin" || row.role === "reviewer" ? row.role : "student",
        createdAt: iso(row.created_at),
      }));
    return { ok: true as const, users };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const role = oneOf(data.role, ["student", "reviewer", "admin"] as const, "student");
    const userId = clip(data.userId, 80);
    if (userId === context.userId && role !== "admin") {
      const count = await sql<{ n: number }>`select count(*)::int as n from profiles where role = 'admin'`;
      if ((Number(count[0]?.n) || 0) <= 1) return { ok: false, error: "You are the only administrator." };
    }
    await ensureProfile(sql, userId);
    const updated = await sql`update profiles set role = ${role}, updated_at = now() where user_id = ${userId} returning user_id`;
    if (!updated.length) return { ok: false, error: "User not found." };
    await audit(sql, context.userId, "set_role", "profile", userId, { role });
    return { ok: true };
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const map = await settingsMap(sql);
    return {
      ok: true as const,
      orgName: map.org_name || "NextStep Coding",
      issuerName: map.issuer_name || "",
      issuerRole: map.issuer_role || "",
      contactEmail: map.contact_email || "",
    };
  });

export const adminSaveSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    const denied = await requireAdmin(sql, context.userId);
    if (denied) return denied;
    const contact = clip(data.contactEmail, 160);
    if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return { ok: false, error: "Contact email looks invalid." };
    const org = clip(data.orgName, 120) || "NextStep Coding";
    const pairs: Array<[string, string]> = [
      ["org_name", org],
      ["issuer_name", clip(data.issuerName, 120)],
      ["issuer_role", clip(data.issuerRole, 120)],
      ["contact_email", contact],
    ];
    for (const [key, value] of pairs) {
      await sql`
        insert into app_settings (key, value) values (${key}, ${value})
        on conflict (key) do update set value = excluded.value
      `;
    }
    return { ok: true };
  });

