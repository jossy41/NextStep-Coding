import { getSql } from "@/lib/db";
import { COURSES } from "@/server/catalog-data";

/** Insert the original NextStep seed courses once. Later admin edits are kept. */
export async function ensureCatalog() {
  const sql = await getSql();
  const flag = await sql<{ value: string }>`
    select value from app_settings where key = 'catalog_seeded'
  `;
  if (flag.length > 0) return;

  for (const [index, course] of COURSES.entries()) {
    await sql`
      insert into courses (
        id, slug, status, language, level, category, duration_hours,
        prerequisites, prerequisites_am, min_quiz_score, require_project,
        project_title, project_title_am, project_brief, project_brief_am,
        project_requirements, project_requirements_am, project_rubric, sort_order
      ) values (
        ${course.id},
        ${course.slug},
        ${course.status},
        ${course.language},
        'beginner',
        'Web development',
        ${Math.round(course.durationHours)},
        ${course.prerequisites},
        ${course.prerequisitesAm},
        ${course.certificateRequirements.minQuizScore},
        ${course.certificateRequirements.requireProjectApproval},
        ${course.project.title},
        ${course.project.titleAm ?? ""},
        ${course.project.brief},
        ${course.project.briefAm ?? ""},
        ${JSON.stringify(course.project.requirements)}::jsonb,
        ${JSON.stringify(course.project.requirementsAm ?? [])}::jsonb,
        ${JSON.stringify(course.project.rubric)}::jsonb,
        ${index}
      )
      on conflict (slug) do nothing
    `;

    await sql`
      insert into course_translations (course_id, locale, title, description, objectives)
      values (
        ${course.id}, 'en', ${course.title}, ${course.description},
        ${JSON.stringify(course.objectives)}::jsonb
      )
      on conflict (course_id, locale) do nothing
    `;
    await sql`
      insert into course_translations (course_id, locale, title, description, objectives)
      values (
        ${course.id}, 'am', ${course.titleAm}, ${course.descriptionAm},
        ${JSON.stringify(course.objectivesAm)}::jsonb
      )
      on conflict (course_id, locale) do nothing
    `;

    for (const [mi, mod] of course.modules.entries()) {
      await sql`
        insert into modules (id, course_id, title, title_am, description, sort_order)
        values (
          ${mod.id}, ${course.id}, ${mod.title}, ${mod.titleAm ?? ""},
          ${mod.description ?? ""}, ${mi}
        )
        on conflict (id) do nothing
      `;
      for (const [li, lesson] of mod.lessons.entries()) {
        await sql`
          insert into lessons (
            id, module_id, title, title_am, content, content_am,
            exercises, exercises_am, sort_order, duration_minutes
          ) values (
            ${lesson.id},
            ${mod.id},
            ${lesson.title},
            ${lesson.titleAm ?? ""},
            ${lesson.content},
            ${lesson.contentAm ?? ""},
            ${JSON.stringify(lesson.exercises ?? [])}::jsonb,
            ${"[]"}::jsonb,
            ${li},
            ${lesson.durationMinutes}
          )
          on conflict (id) do nothing
        `;
        for (const [qi, question] of (lesson.quiz ?? []).entries()) {
          await sql`
            insert into quiz_questions (
              id, lesson_id, question, options, correct_index, explanation, sort_order
            ) values (
              ${question.id},
              ${lesson.id},
              ${question.question},
              ${JSON.stringify(question.options)}::jsonb,
              ${question.correctIndex},
              ${question.explanation},
              ${qi}
            )
            on conflict (id) do nothing
          `;
        }
      }
    }
  }

  await sql`
    insert into app_settings (key, value) values ('catalog_seeded', '1')
    on conflict (key) do nothing
  `;
}
