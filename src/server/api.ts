import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { getSql, type Sql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  DashboardData,
  LessonPayload,
  Me,
  PostItem,
  ProjectStatus,
  VideoItem,
} from "@/lib/learning-types";
import {
  allCourses,
  allPosts,
  allVideos,
  asBool,
  asStringArray,
  audit,
  bag,
  cleanHttpUrl,
  clip,
  courseById,
  courseBySlug,
  detailFor,
  ensureProfile,
  flatLessons,
  iso,
  nid,
  outlines,
  postVisible,
  refreshEnrollment,
  roleOf,
  settingsMap,
  toCard,
  toPost,
  type Fail,
  type Role,
} from "@/server/helpers";

async function ready() {
  const { ensureCatalog } = await import("@/server/seed");
  await ensureCatalog();
}

export const optionalAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("@/lib/auth/client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const bearer = (context as { bearerToken?: string }).bearerToken;
    const user = await getSessionUser(bearer);
    return next({ context: { userId: user?.id ?? null, email: user?.email ?? null } });
  });

const input = (value: unknown) => bag(value);

async function staff(sql: Sql, userId: string | null): Promise<boolean> {
  if (!userId) return false;
  await ensureProfile(sql, userId);
  return (await roleOf(sql, userId)) === "admin";
}

export const getPublicSettings = createServerFn({ method: "GET" }).handler(async () => {
  await ready();
  const sql = await getSql();
  const map = await settingsMap(sql);
  return { orgName: map.org_name || "NextStep Coding", contactEmail: map.contact_email || "" };
});

export const getHomeFeed = createServerFn({ method: "GET" }).handler(async () => {
  await ready();
  const sql = await getSql();
  const courses = (await allCourses(sql)).map(toCard).filter((course) => course.status === "published");
  const videos = (await allVideos(sql)).filter((video) => video.status === "published");
  const posts = (await allPosts(sql)).filter(postVisible);
  const map = await settingsMap(sql);
  return {
    courses,
    videos: videos.slice(0, 3),
    posts: posts.slice(0, 3),
    contactEmail: map.contact_email || "",
  };
});

export const listCourses = createServerFn({ method: "GET" })
  .validator(input)
  .handler(async ({ data }) => {
    await ready();
    const sql = await getSql();
    const q = clip(data.q, 80).toLowerCase();
    const level = clip(data.level, 20);
    const language = clip(data.language, 8);
    const courses = (await allCourses(sql))
      .map(toCard)
      .filter((course) => course.status === "published")
      .filter((course) => (level && level !== "all" ? course.level === level : true))
      .filter((course) => (language && language !== "all" ? course.language === language : true))
      .filter((course) =>
        q
          ? `${course.title} ${course.titleAm} ${course.description} ${course.category}`.toLowerCase().includes(q)
          : true,
      );
    return courses;
  });

export const getCourse = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    const row = await courseBySlug(sql, clip(data.slug, 80));
    if (!row) return { ok: false as const, error: "not_found" };
    const userId = (context as { userId: string | null }).userId;
    return detailFor(sql, row, userId, await staff(sql, userId));
  });

export const getLesson = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true; lesson: LessonPayload } | Fail> => {
    await ready();
    const sql = await getSql();
    const row = await courseBySlug(sql, clip(data.slug, 80));
    if (!row) return { ok: false, error: "not_found" };
    const userId = (context as { userId: string | null }).userId;
    const isAdmin = await staff(sql, userId);
    const enrolled = userId
      ? (
          await sql`select id from enrollments where user_id = ${userId} and course_id = ${row.id}`
        ).length > 0
      : false;
    if (row.status === "draft" && !isAdmin) return { ok: false, error: "not_found" };
    if (row.status === "archived" && !isAdmin && !enrolled) return { ok: false, error: "not_found" };
    if (!isAdmin && !enrolled && row.status === "published") {
      // Lessons are readable after enroll. Catalog visitors can still open the course page.
      return { ok: false, error: "enroll" };
    }

    const modules = await outlines(sql, row.id);
    const flat = flatLessons(modules);
    const lessonId = clip(data.lessonId, 80);
    const index = flat.findIndex((lesson) => lesson.id === lessonId);
    if (index < 0) return { ok: false, error: "not_found" };
    const lessons = await sql<{
      id: string;
      title: string;
      title_am: string;
      content: string;
      content_am: string;
      exercises: unknown;
      exercises_am: unknown;
      resources: string;
      duration_minutes: number;
      video_resource_id: string | null;
    }>`
      select id, title, title_am, content, content_am, exercises, exercises_am, resources,
        duration_minutes, video_resource_id
      from lessons where id = ${lessonId}
    `;
    const lesson = lessons[0];
    if (!lesson) return { ok: false, error: "not_found" };

    let video: LessonPayload["video"] = null;
    if (lesson.video_resource_id) {
      const videos = await sql<{ id: string; title: string; youtube_id: string; status: string }>`
        select id, title, youtube_id, status from video_resources where id = ${lesson.video_resource_id}
      `;
      const found = videos[0];
      if (found && (found.status === "published" || isAdmin)) {
        video = {
          id: found.id,
          title: found.title,
          youtubeId: found.youtube_id,
          status: found.status === "published" ? "published" : "draft",
        };
      }
    }

    const questions = await sql<{ id: string; question: string; options: unknown }>`
      select id, question, options from quiz_questions
      where lesson_id = ${lessonId} order by sort_order, id
    `;
    const done = userId
      ? await sql`select id from lesson_progress where user_id = ${userId} and lesson_id = ${lessonId}`
      : [];
    const attempts = userId
      ? await sql<{ score: number; passed: boolean | string }>`
          select score, passed from quiz_attempts
          where user_id = ${userId} and lesson_id = ${lessonId}
          order by attempted_at desc limit 1
        `
      : [];
    const subs = userId
      ? await sql<{ project_url: string; description: string; status: string; feedback: string }>`
          select project_url, description, status, feedback from project_submissions
          where user_id = ${userId} and course_id = ${row.id}
        `
      : [];
    const sub = subs[0];
    const projectStatus = sub?.status;
    const safeStatus: ProjectStatus | null =
      projectStatus === "pending" ||
      projectStatus === "approved" ||
      projectStatus === "rejected" ||
      projectStatus === "revision_requested"
        ? projectStatus
        : null;

    return {
      ok: true,
      lesson: {
        courseId: row.id,
        courseSlug: row.slug,
        courseTitle: row.title ?? row.slug,
        courseTitleAm: row.title_am ?? "",
        minQuizScore: Number(row.min_quiz_score) || 70,
        lesson: {
          id: lesson.id,
          title: lesson.title,
          titleAm: lesson.title_am,
          content: lesson.content,
          contentAm: lesson.content_am,
          exercises: asStringArray(lesson.exercises),
          exercisesAm: asStringArray(lesson.exercises_am),
          resources: lesson.resources ?? "",
          durationMinutes: Number(lesson.duration_minutes) || 0,
        },
        video,
        questions: questions.map((question) => ({
          id: question.id,
          question: question.question,
          options: asStringArray(question.options),
        })),
        modules,
        completed: done.length > 0,
        latestQuiz: attempts[0]
          ? { score: Number(attempts[0].score) || 0, passed: asBool(attempts[0].passed) }
          : null,
        prevId: flat[index - 1]?.id ?? null,
        nextId: flat[index + 1]?.id ?? null,
        project: {
          title: row.project_title ?? "",
          titleAm: row.project_title_am ?? "",
          brief: row.project_brief ?? "",
          briefAm: row.project_brief_am ?? "",
          requirements: asStringArray(row.project_requirements),
          requirementsAm: asStringArray(row.project_requirements_am),
          status: safeStatus,
          url: sub?.project_url ?? "",
          description: sub?.description ?? "",
          feedback: sub?.feedback ?? "",
        },
      },
    };
  });

export const listVideos = createServerFn({ method: "GET" })
  .validator(input)
  .handler(async ({ data }) => {
    await ready();
    const sql = await getSql();
    const q = clip(data.q, 80).toLowerCase();
    const category = clip(data.category, 80);
    const language = clip(data.language, 8);
    const videos = (await allVideos(sql))
      .filter((video) => video.status === "published")
      .filter((video) => (category && category !== "all" ? video.category === category : true))
      .filter((video) => (language && language !== "all" ? video.language === language : true))
      .filter((video) => (q ? `${video.title} ${video.description} ${video.category}`.toLowerCase().includes(q) : true));
    const categories = [...new Set(videos.map((video) => video.category))].sort();
    return { videos, categories };
  });

export const getVideo = createServerFn({ method: "GET" })
  .middleware([optionalAuth])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true; video: VideoItem } | Fail> => {
    await ready();
    const sql = await getSql();
    const videos = (await allVideos(sql)).filter((video) => video.id === clip(data.id, 80));
    const video = videos[0];
    if (!video) return { ok: false, error: "not_found" };
    const userId = (context as { userId: string | null }).userId;
    if (video.status !== "published" && !(await staff(sql, userId))) return { ok: false, error: "not_found" };
    return { ok: true, video };
  });

export const listPosts = createServerFn({ method: "GET" })
  .validator(input)
  .handler(async ({ data }) => {
    await ready();
    const sql = await getSql();
    const q = clip(data.q, 80).toLowerCase();
    const language = clip(data.language, 8);
    const posts = (await allPosts(sql))
      .filter(postVisible)
      .filter((post) => (language && language !== "all" ? post.language === language : true))
      .filter((post) => (q ? `${post.title} ${post.summary}`.toLowerCase().includes(q) : true))
      .map((post) => ({ ...post, body: "" }));
    return posts;
  });

export const getPost = createServerFn({ method: "GET" })
  .validator(input)
  .handler(async ({ data }): Promise<{ ok: true; post: PostItem } | Fail> => {
    await ready();
    const sql = await getSql();
    const posts = await allPosts(sql);
    const post = posts.find((item) => item.slug === clip(data.slug, 80));
    if (!post || !postVisible(post)) return { ok: false, error: "not_found" };
    return { ok: true, post };
  });

export const verifyCertificate = createServerFn({ method: "GET" })
  .validator(input)
  .handler(async ({ data }) => {
    await ready();
    const code = clip(data.code, 40).toUpperCase();
    if (!/^NSC-\d{4}-[A-Z2-9]{8}$/.test(code)) return { status: "not_found" as const };
    const sql = await getSql();
    const rows = await sql<{
      certificate_code: string;
      student_name: string;
      achievement_title: string;
      issued_at: unknown;
      revoked_at: unknown;
      revoked_reason: string | null;
      issuer_name: string;
      issuer_role: string;
    }>`
      select certificate_code, student_name, achievement_title, issued_at, revoked_at,
        revoked_reason, issuer_name, issuer_role
      from certificates where certificate_code = ${code}
    `;
    const row = rows[0];
    if (!row) return { status: "not_found" as const };
    const map = await settingsMap(sql);
    const revokedAt = iso(row.revoked_at);
    return {
      status: revokedAt ? ("revoked" as const) : ("verified" as const),
      certificate: {
        code: row.certificate_code,
        studentName: row.student_name,
        achievement: row.achievement_title,
        issuedAt: iso(row.issued_at) ?? "",
        revokedAt,
        revokedReason: row.revoked_reason,
        issuerName: row.issuer_name,
        issuerRole: row.issuer_role,
        orgName: map.org_name || "NextStep Coding",
      },
    };
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Me> => {
    await ready();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const rows = await sql<{ full_name: string; role: Role; preferred_language: string; email: string | null }>`
      select p.full_name, p.role, p.preferred_language, u.email
      from profiles p join "user" u on u.id = p.user_id
      where p.user_id = ${context.userId}
    `;
    const row = rows[0];
    const role: Role = row?.role === "admin" || row?.role === "reviewer" ? row.role : "student";
    return {
      id: context.userId,
      email: row?.email ?? null,
      name: row?.full_name ?? "",
      role,
      preferredLanguage: row?.preferred_language === "am" ? "am" : "en",
    };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const name = clip(data.name, 120);
    if (name.length < 2) return { ok: false, error: "Enter your full name." };
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    await sql`
      update profiles set full_name = ${name}, updated_at = now() where user_id = ${context.userId}
    `;
    return { ok: true };
  });

export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const updated = await sql<{ user_id: string }>`
      update profiles set role = 'admin', updated_at = now()
      where user_id = ${context.userId}
        and not exists (select 1 from profiles where role = 'admin')
      returning user_id
    `;
    if (!updated.length) return { ok: false, error: "An administrator already exists." };
    await audit(sql, context.userId, "claim_admin", "profile", context.userId);
    return { ok: true };
  });

export const enroll = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const row = await courseById(sql, clip(data.courseId, 80));
    if (!row || row.status !== "published") return { ok: false, error: "That course is not open for enrollment." };
    await sql`
      insert into enrollments (id, user_id, course_id)
      values (${nid("enr")}, ${context.userId}, ${row.id})
      on conflict (user_id, course_id) do nothing
    `;
    return { ok: true };
  });

export const completeLesson = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const lessonId = clip(data.lessonId, 80);
    const found = await sql<{ course_id: string }>`
      select m.course_id from lessons l join modules m on m.id = l.module_id where l.id = ${lessonId}
    `;
    const courseId = found[0]?.course_id;
    if (!courseId) return { ok: false, error: "Lesson not found." };
    const enrolled = await sql`
      select id from enrollments where user_id = ${context.userId} and course_id = ${courseId}
    `;
    if (!enrolled.length) return { ok: false, error: "Enroll in the course first." };
    await sql`
      insert into lesson_progress (id, user_id, lesson_id)
      values (${nid("prg")}, ${context.userId}, ${lessonId})
      on conflict (user_id, lesson_id) do nothing
    `;
    await refreshEnrollment(sql, context.userId, courseId);
    return { ok: true };
  });

export const submitQuiz = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }) => {
    await ready();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const lessonId = clip(data.lessonId, 80);
    if (!Array.isArray(data.answers) || !data.answers.every((n) => typeof n === "number" && Number.isInteger(n))) {
      return { ok: false as const, error: "Choose an answer for every question." };
    }
    const answers = data.answers as number[];
    const found = await sql<{ course_id: string; min_quiz_score: number }>`
      select m.course_id, c.min_quiz_score
      from lessons l
      join modules m on m.id = l.module_id
      join courses c on c.id = m.course_id
      where l.id = ${lessonId}
    `;
    const course = found[0];
    if (!course) return { ok: false as const, error: "Lesson not found." };
    const enrolled = await sql`
      select id from enrollments where user_id = ${context.userId} and course_id = ${course.course_id}
    `;
    if (!enrolled.length) return { ok: false as const, error: "Enroll in the course first." };
    const questions = await sql<{ id: string; correct_index: number; explanation: string }>`
      select id, correct_index, explanation from quiz_questions
      where lesson_id = ${lessonId} order by sort_order, id
    `;
    if (!questions.length) return { ok: false as const, error: "This lesson has no quiz." };
    if (answers.length !== questions.length) return { ok: false as const, error: "Answer every question." };
    let correct = 0;
    const review = questions.map((question, index) => {
      const selected = answers[index] ?? -1;
      const isCorrect = selected === Number(question.correct_index);
      if (isCorrect) correct += 1;
      return {
        id: question.id,
        selected,
        correct: isCorrect,
        correctIndex: Number(question.correct_index),
        explanation: question.explanation,
      };
    });
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (Number(course.min_quiz_score) || 70);
    await sql`
      insert into quiz_attempts (id, user_id, lesson_id, score, passed, answers)
      values (
        ${nid("quiz")}, ${context.userId}, ${lessonId}, ${score}, ${passed},
        ${JSON.stringify(answers)}::jsonb
      )
    `;
    if (passed) {
      await sql`
        insert into lesson_progress (id, user_id, lesson_id)
        values (${nid("prg")}, ${context.userId}, ${lessonId})
        on conflict (user_id, lesson_id) do nothing
      `;
    }
    await refreshEnrollment(sql, context.userId, course.course_id);
    return { ok: true as const, score, passed, review };
  });

export const submitProject = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(input)
  .handler(async ({ data, context }): Promise<{ ok: true } | Fail> => {
    await ready();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const courseId = clip(data.courseId, 80);
    const url = cleanHttpUrl(clip(data.url, 500), false);
    if (!url) return { ok: false, error: "Enter a public http(s) link to your project." };
    const description = clip(data.description, 4000);
    const enrolled = await sql`select id from enrollments where user_id = ${context.userId} and course_id = ${courseId}`;
    if (!enrolled.length) return { ok: false, error: "Enroll in the course first." };
    const existing = await sql<{ id: string; status: string }>`
      select id, status from project_submissions where user_id = ${context.userId} and course_id = ${courseId}
    `;
    const current = existing[0];
    if (current?.status === "approved") return { ok: false, error: "This project is already approved." };
    if (current && current.status !== "pending" && current.status !== "rejected" && current.status !== "revision_requested") {
      return { ok: false, error: "This submission cannot be changed." };
    }
    if (!current) {
      await sql`
        insert into project_submissions (id, user_id, course_id, project_url, description)
        values (${nid("sub")}, ${context.userId}, ${courseId}, ${url}, ${description})
      `;
    } else {
      await sql`
        update project_submissions
        set project_url = ${url}, description = ${description}, status = 'pending', feedback = '', updated_at = now()
        where id = ${current.id} and user_id = ${context.userId}
      `;
    }
    return { ok: true };
  });

export const myDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<DashboardData> => {
    await ready();
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const meRows = await sql<{ full_name: string; role: string; preferred_language: string; email: string | null }>`
      select p.full_name, p.role, p.preferred_language, u.email
      from profiles p join "user" u on u.id = p.user_id
      where p.user_id = ${context.userId}
    `;
    const me = meRows[0];
    const role: Role = me?.role === "admin" || me?.role === "reviewer" ? me.role : "student";
    const enrollments = await sql<{ course_id: string; status: string }>`
      select course_id, status from enrollments where user_id = ${context.userId} order by enrolled_at desc
    `;
    const cards = (await allCourses(sql)).map(toCard);
    const enrollmentViews = [];
    for (const enrollment of enrollments) {
      const card = cards.find((item) => item.id === enrollment.course_id);
      if (!card) continue;
      const modules = await outlines(sql, card.id);
      const flat = flatLessons(modules);
      const done = await sql<{ lesson_id: string }>`
        select lesson_id from lesson_progress where user_id = ${context.userId}
      `;
      const doneIds = new Set(done.map((row) => row.lesson_id));
      const next = flat.find((lesson) => !doneIds.has(lesson.id));
      const completed = flat.filter((lesson) => doneIds.has(lesson.id)).length;
      enrollmentViews.push({
        courseId: card.id,
        slug: card.slug,
        title: card.title,
        titleAm: card.titleAm,
        status: enrollment.status,
        completed,
        total: flat.length,
        nextLessonId: next?.id ?? flat[0]?.id ?? null,
      });
    }
    const certificates = await sql<{
      certificate_code: string;
      achievement_title: string;
      issued_at: unknown;
      revoked_at: unknown;
    }>`
      select certificate_code, achievement_title, issued_at, revoked_at
      from certificates where user_id = ${context.userId}
      order by issued_at desc
    `;
    const projects = await sql<{
      status: string;
      feedback: string;
      project_url: string;
      title: string | null;
      title_am: string | null;
    }>`
      select s.status, s.feedback, s.project_url, t.title, am.title as title_am
      from project_submissions s
      left join course_translations t on t.course_id = s.course_id and t.locale = 'en'
      left join course_translations am on am.course_id = s.course_id and am.locale = 'am'
      where s.user_id = ${context.userId}
      order by s.updated_at desc
    `;
    return {
      me: {
        id: context.userId,
        email: me?.email ?? null,
        name: me?.full_name ?? "",
        role,
        preferredLanguage: me?.preferred_language === "am" ? "am" : "en",
      },
      enrollments: enrollmentViews,
      certificates: certificates.map((row) => ({
        code: row.certificate_code,
        achievement: row.achievement_title,
        issuedAt: iso(row.issued_at) ?? "",
        revokedAt: iso(row.revoked_at),
      })),
      projects: projects.flatMap((row) => {
        const status = row.status;
        if (
          status !== "pending" &&
          status !== "approved" &&
          status !== "rejected" &&
          status !== "revision_requested"
        ) {
          return [];
        }
        return [
          {
            courseTitle: row.title ?? "Course",
            courseTitleAm: row.title_am ?? "",
            status,
            feedback: row.feedback,
            url: row.project_url,
          },
        ];
      }),
    };
  });

export const bootCatalog = createServerFn({ method: "GET" }).handler(async () => {
  await ready();
  return { ok: true as const };
});

