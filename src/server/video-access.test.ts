import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideCourseVideoAccess,
  decideLessonVideoAccess,
  planEnrollment,
  presentCatalogVideos,
  protectedPlaybackLeaks,
  redactLockedVideoIds,
  type CourseGate,
  type GateVideo,
} from "./video-access.ts";

const HTML_YT = "WA3Y8dgrgwI";
const CSS_YT = "cssVideo11x";

const htmlCourse: CourseGate = {
  id: "course-html",
  slug: "html-fundamentals",
  title: "HTML Fundamentals",
  status: "published",
};
const cssCourse: CourseGate = {
  id: "course-css",
  slug: "css-responsive",
  title: "CSS",
  status: "published",
};

function video(partial: Partial<GateVideo> & Pick<GateVideo, "id" | "courseId" | "youtubeId">): GateVideo {
  return {
    status: "published",
    youtubeUrl: partial.youtubeId ? `https://youtu.be/${partial.youtubeId}` : "",
    thumbnailUrl: partial.youtubeId ? `https://i.ytimg.com/vi/${partial.youtubeId}/hqdefault.jpg` : "",
    description: partial.youtubeId ? `Watch ${partial.youtubeId}` : "",
    ...partial,
  };
}

const htmlVideo = video({ id: "vid-html", courseId: "course-html", youtubeId: HTML_YT });
const cssVideo = video({ id: "vid-css", courseId: "course-css", youtubeId: CSS_YT });
const publicVideo = video({ id: "vid-public", courseId: null, youtubeId: "publicVid11" });

const courses = [htmlCourse, cssCourse];

describe("course video access", () => {
  it("does not give a signed-out visitor protected playback data", () => {
    const listed = presentCatalogVideos([htmlVideo, cssVideo, publicVideo], courses, new Map(), {
      viewerId: null,
      isAdmin: false,
      enrolledCourseIds: [],
    });
    const html = listed.find((item) => item.id === "vid-html");
    assert.ok(html);
    assert.equal(html.locked, true);
    assert.equal(html.youtubeId, "");
    assert.deepEqual(protectedPlaybackLeaks(html, [HTML_YT, CSS_YT]), []);

    const decision = decideCourseVideoAccess({
      video: htmlVideo,
      course: htmlCourse,
      viewerId: null,
      isAdmin: false,
      enrolledCourseIds: [],
    });
    assert.equal(decision.outcome, "auth");
    assert.equal("youtubeId" in decision, false);
    assert.deepEqual(protectedPlaybackLeaks(decision, [HTML_YT]), []);
  });

  it("does not give a signed-in student playback data before they enroll", () => {
    const decision = decideCourseVideoAccess({
      video: htmlVideo,
      course: htmlCourse,
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: [],
    });
    assert.equal(decision.outcome, "enroll");
    assert.equal(decision.courseId, "course-html");
    assert.deepEqual(protectedPlaybackLeaks(decision, [HTML_YT]), []);

    const listed = presentCatalogVideos([htmlVideo], courses, new Map(), {
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: [],
    });
    assert.equal(listed[0]?.locked, true);
    assert.equal(listed[0]?.youtubeId, "");
  });

  it("returns HTML playback only after that student enrolls in HTML", () => {
    const listed = presentCatalogVideos([htmlVideo, cssVideo], courses, new Map(), {
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: ["course-html"],
    });
    const html = listed.find((item) => item.id === "vid-html");
    const css = listed.find((item) => item.id === "vid-css");
    assert.equal(html?.locked, false);
    assert.equal(html?.youtubeId, HTML_YT);
    assert.equal(css?.locked, true);
    assert.equal(css?.youtubeId, "");
    assert.deepEqual(protectedPlaybackLeaks(css, [CSS_YT]), []);

    const lesson = decideLessonVideoAccess({
      requestedCourseId: "course-html",
      lessonCourseId: "course-html",
      videoCourseId: "course-html",
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: ["course-html"],
      youtubeId: HTML_YT,
    });
    assert.equal(lesson.outcome, "allow");
    if (lesson.outcome === "allow") assert.equal(lesson.youtubeId, HTML_YT);
  });

  it("does not let an HTML enrollment unlock a CSS lesson or video", () => {
    const lesson = decideLessonVideoAccess({
      requestedCourseId: "course-css",
      lessonCourseId: "course-css",
      videoCourseId: "course-css",
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: ["course-html"],
      youtubeId: CSS_YT,
    });
    assert.equal(lesson.outcome, "enroll");
    assert.equal("youtubeId" in lesson, false);
    assert.deepEqual(protectedPlaybackLeaks(lesson, [CSS_YT]), []);
  });

  it("does not let a second student use the first student's enrollment", () => {
    const studentA = presentCatalogVideos([htmlVideo], courses, new Map(), {
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: ["course-html"],
    });
    const studentB = presentCatalogVideos([htmlVideo], courses, new Map(), {
      viewerId: "student-b",
      isAdmin: false,
      enrolledCourseIds: [],
    });
    assert.equal(studentA[0]?.youtubeId, HTML_YT);
    assert.equal(studentB[0]?.locked, true);
    assert.deepEqual(protectedPlaybackLeaks(studentB, [HTML_YT]), []);

    const forged = planEnrollment({
      sessionUserId: "student-b",
      claimedUserId: "student-a",
      courseExists: true,
      courseStatus: "published",
      alreadyEnrolled: false,
    });
    assert.equal(forged.action, "insert");
    assert.equal(forged.userId, "student-b");
  });

  it("ignores tampered course ids and video ids", () => {
    const swapped = decideCourseVideoAccess({
      video: cssVideo,
      course: cssCourse,
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: ["course-html"],
      claimedCourseId: "course-html",
    });
    assert.equal(swapped.outcome, "enroll");
    assert.notEqual(swapped.outcome === "enroll" ? swapped.courseId : "", "course-html");
    assert.deepEqual(protectedPlaybackLeaks(swapped, [CSS_YT]), []);

    const foreignLesson = decideLessonVideoAccess({
      requestedCourseId: "course-html",
      lessonCourseId: "course-css",
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: ["course-html"],
      youtubeId: CSS_YT,
      claimedCourseId: "course-html",
    });
    assert.equal(foreignLesson.outcome, "hide");
    assert.equal("youtubeId" in foreignLesson, false);

    const foreignVideoOnHtmlLesson = decideLessonVideoAccess({
      requestedCourseId: "course-html",
      lessonCourseId: "course-html",
      videoCourseId: "course-css",
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: ["course-html"],
      youtubeId: CSS_YT,
    });
    assert.equal(foreignVideoOnHtmlLesson.outcome, "hide");
    assert.deepEqual(protectedPlaybackLeaks(foreignVideoOnHtmlLesson, [CSS_YT, HTML_YT]), []);
  });

  it("treats a second enrollment in the same course as a no-op", () => {
    const duplicate = planEnrollment({
      sessionUserId: "student-a",
      courseExists: true,
      courseStatus: "published",
      alreadyEnrolled: true,
    });
    assert.deepEqual(duplicate, { action: "already", userId: "student-a" });

    const first = planEnrollment({
      sessionUserId: "student-a",
      courseExists: true,
      courseStatus: "published",
      alreadyEnrolled: false,
    });
    assert.equal(first.action, "insert");

    const closed = planEnrollment({
      sessionUserId: "student-a",
      courseExists: true,
      courseStatus: "draft",
      alreadyEnrolled: false,
    });
    assert.equal(closed.action, "reject");
  });

  it("still allows enrollment planning and lesson access for an enrolled student", () => {
    const plan = planEnrollment({
      sessionUserId: "student-a",
      courseExists: true,
      courseStatus: "published",
      alreadyEnrolled: false,
    });
    assert.equal(plan.action, "insert");
    assert.equal(plan.userId, "student-a");

    const signedOutLesson = decideLessonVideoAccess({
      requestedCourseId: "course-html",
      lessonCourseId: "course-html",
      viewerId: null,
      isAdmin: false,
      enrolledCourseIds: [],
      youtubeId: HTML_YT,
    });
    assert.equal(signedOutLesson.outcome, "auth");
    assert.equal("youtubeId" in signedOutLesson, false);
  });

  it("keeps public course discovery fields and unscoped videos", () => {
    const modules = redactLockedVideoIds(
      [
        {
          id: "mod-1",
          title: "Documents",
          lessons: [{ id: "les-1", title: "Headings", videoId: "vid-html", durationMinutes: 12 }],
        },
      ],
      false,
    );
    assert.equal(modules[0]?.title, "Documents");
    assert.equal(modules[0]?.lessons[0]?.title, "Headings");
    assert.equal(modules[0]?.lessons[0]?.videoId, null);
    assert.equal(modules[0]?.lessons[0]?.durationMinutes, 12);
    assert.deepEqual(protectedPlaybackLeaks(modules, [HTML_YT, "vid-html"]), []);

    const revealed = redactLockedVideoIds(modules, true);
    assert.equal(revealed[0]?.lessons[0]?.videoId, null);

    const enrolledOutline = redactLockedVideoIds(
      [{ id: "mod-1", title: "Documents", lessons: [{ id: "les-1", title: "Headings", videoId: "vid-html" }] }],
      true,
    );
    assert.equal(enrolledOutline[0]?.lessons[0]?.videoId, "vid-html");

    const listed = presentCatalogVideos([publicVideo, htmlVideo], courses, new Map(), {
      viewerId: null,
      isAdmin: false,
      enrolledCourseIds: [],
    });
    const open = listed.find((item) => item.id === "vid-public");
    assert.equal(open?.locked, false);
    assert.equal(open?.youtubeId, "publicVid11");

    const publicCard = {
      slug: "html-fundamentals",
      title: "HTML Fundamentals",
      description: "Learn the structure of a page.",
      lessonCount: 8,
    };
    assert.deepEqual(protectedPlaybackLeaks(publicCard, [HTML_YT, CSS_YT]), []);
  });

  it("still hides a course video that is only linked from a lesson", () => {
    const untagged = video({ id: "vid-linked", courseId: null, youtubeId: HTML_YT });
    const links = new Map([["vid-linked", "course-html"]]);
    const listed = presentCatalogVideos([untagged], courses, links, {
      viewerId: null,
      isAdmin: false,
      enrolledCourseIds: [],
    });
    assert.equal(listed[0]?.locked, true);
    assert.deepEqual(protectedPlaybackLeaks(listed, [HTML_YT]), []);

    const enrolled = presentCatalogVideos([untagged], courses, links, {
      viewerId: "student-a",
      isAdmin: false,
      enrolledCourseIds: ["course-html"],
    });
    assert.equal(enrolled[0]?.locked, false);
    assert.equal(enrolled[0]?.youtubeId, HTML_YT);
  });

  it("does not put draft or missing-course playback into the public catalog", () => {
    const draft = video({ id: "vid-draft", courseId: null, youtubeId: "draftVideo1", status: "draft" });
    const orphan = video({ id: "vid-orphan", courseId: "course-missing", youtubeId: "orphanVid11" });
    const listed = presentCatalogVideos([draft, orphan, publicVideo], courses, new Map(), {
      viewerId: "student-a",
      isAdmin: true,
      enrolledCourseIds: [],
    });
    assert.deepEqual(
      listed.map((item) => item.id),
      ["vid-public"],
    );
  });
});
