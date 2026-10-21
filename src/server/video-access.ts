/**
 * Course-video authorization. Pure on purpose: server functions load the
 * verified user and rows, then call these helpers. Client-supplied user ids,
 * course ids, and enrollment flags are never inputs to an allow decision.
 */

export type CourseGate = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

export type GateVideo = {
  id: string;
  status: "draft" | "published";
  courseId: string | null;
  youtubeId: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  description: string;
};

export type ViewerGate = {
  /** Server-verified user id, or null when signed out. */
  viewerId: string | null;
  isAdmin: boolean;
  /** Course ids this verified user is enrolled in. */
  enrolledCourseIds: readonly string[];
};

export type VideoDecision =
  | { outcome: "allow" }
  | { outcome: "hide" }
  | { outcome: "auth"; courseId: string; courseSlug: string; courseTitle: string }
  | { outcome: "enroll"; courseId: string; courseSlug: string; courseTitle: string };

export type LessonDecision =
  | { outcome: "allow"; youtubeId: string | null }
  | { outcome: "hide" }
  | { outcome: "auth" }
  | { outcome: "enroll" };

export function courseGateForVideo(
  video: { id: string; courseId: string | null },
  courses: readonly CourseGate[],
  lessonCourseByVideoId: ReadonlyMap<string, string>,
): CourseGate | null {
  const ownerId = video.courseId || lessonCourseByVideoId.get(video.id) || null;
  if (!ownerId) return null;
  return courses.find((course) => course.id === ownerId) ?? null;
}

/**
 * Whether this viewer may receive playback data for a video.
 * `claimedCourseId` is accepted and ignored so a forged course id cannot move
 * the video into a course the viewer already joined.
 */
export function decideCourseVideoAccess(input: {
  video: GateVideo;
  course: CourseGate | null;
  viewerId: string | null;
  isAdmin: boolean;
  enrolledCourseIds: readonly string[];
  claimedCourseId?: string | null;
}): VideoDecision {
  void input.claimedCourseId;

  if (input.video.status !== "published" && !input.isAdmin) return { outcome: "hide" };

  const protectedCourse = Boolean(input.video.courseId) || Boolean(input.course);
  if (!protectedCourse) return { outcome: "allow" };

  // Course id with no matching course row stays hidden, including for admins.
  // Admins still manage those rows from the admin library.
  if (!input.course) return { outcome: "hide" };

  if (input.course.status === "draft" && !input.isAdmin) return { outcome: "hide" };
  if (input.isAdmin) return { outcome: "allow" };

  const enrolled = input.enrolledCourseIds.includes(input.course.id);
  if (input.course.status === "archived" && !enrolled) return { outcome: "hide" };
  if (enrolled) return { outcome: "allow" };

  if (input.course.status !== "published") return { outcome: "hide" };
  if (!input.viewerId) {
    return {
      outcome: "auth",
      courseId: input.course.id,
      courseSlug: input.course.slug,
      courseTitle: input.course.title,
    };
  }
  return {
    outcome: "enroll",
    courseId: input.course.id,
    courseSlug: input.course.slug,
    courseTitle: input.course.title,
  };
}

/**
 * Lesson playback. The lesson must belong to the requested course, and a video
 * row tagged to a different course is not revealed through this lesson.
 * Denied outcomes deliberately omit `youtubeId`.
 */
export function decideLessonVideoAccess(input: {
  requestedCourseId: string;
  lessonCourseId: string | null;
  videoCourseId?: string | null;
  viewerId: string | null;
  isAdmin: boolean;
  enrolledCourseIds: readonly string[];
  youtubeId: string | null;
  claimedCourseId?: string | null;
  claimedUserId?: string | null;
}): LessonDecision {
  void input.claimedCourseId;
  void input.claimedUserId;

  if (!input.lessonCourseId || input.lessonCourseId !== input.requestedCourseId) {
    return { outcome: "hide" };
  }
  if (input.videoCourseId && input.videoCourseId !== input.requestedCourseId) {
    return { outcome: "hide" };
  }
  if (input.isAdmin || input.enrolledCourseIds.includes(input.requestedCourseId)) {
    return { outcome: "allow", youtubeId: input.youtubeId };
  }
  if (!input.viewerId) return { outcome: "auth" };
  return { outcome: "enroll" };
}

export function presentCatalogVideos<T extends GateVideo>(
  videos: readonly T[],
  courses: readonly CourseGate[],
  lessonCourseByVideoId: ReadonlyMap<string, string>,
  viewer: ViewerGate,
): Array<T & { locked: boolean }> {
  const presented: Array<T & { locked: boolean }> = [];
  for (const video of videos) {
    if (video.status !== "published") continue;
    const course = courseGateForVideo(video, courses, lessonCourseByVideoId);
    const decision = decideCourseVideoAccess({
      video,
      course,
      viewerId: viewer.viewerId,
      isAdmin: viewer.isAdmin,
      enrolledCourseIds: viewer.enrolledCourseIds,
    });
    if (decision.outcome === "hide") continue;
    if (decision.outcome === "allow") {
      presented.push({ ...video, locked: false });
      continue;
    }
    presented.push({
      ...video,
      locked: true,
      youtubeId: "",
      youtubeUrl: "",
      thumbnailUrl: "",
      description: "",
      courseId: decision.courseId,
    });
  }
  return presented;
}

/** Drop internal video-resource ids from outlines shown to someone who cannot watch. */
export function redactLockedVideoIds<T extends { lessons: Array<{ videoId: string | null }> }>(
  modules: readonly T[],
  reveal: boolean,
): T[] {
  if (reveal) return modules.map((mod) => ({ ...mod, lessons: mod.lessons.map((lesson) => ({ ...lesson })) }));
  return modules.map((mod) => ({
    ...mod,
    lessons: mod.lessons.map((lesson) => ({ ...lesson, videoId: null })),
  }));
}

/**
 * Enrollment is always for the verified session user. A second attempt is a no-op.
 * A published course is required. Forged user ids do not change the target.
 */
export function planEnrollment(input: {
  sessionUserId: string;
  claimedUserId?: string | null;
  courseExists: boolean;
  courseStatus: string | null;
  alreadyEnrolled: boolean;
}): { action: "insert" | "already"; userId: string } | { action: "reject"; userId: string; error: string } {
  const userId = input.sessionUserId;
  void input.claimedUserId;
  if (!input.sessionUserId) {
    return { action: "reject", userId, error: "Sign in before enrolling." };
  }
  if (!input.courseExists || input.courseStatus !== "published") {
    return { action: "reject", userId, error: "That course is not open for enrollment." };
  }
  if (input.alreadyEnrolled) return { action: "already", userId };
  return { action: "insert", userId };
}

/** Strings that would let a client embed or hotlink the YouTube video. */
export function protectedPlaybackLeaks(value: unknown, secrets: readonly string[]): string[] {
  const blob = JSON.stringify(value) ?? "";
  const found = secrets.filter((secret) => secret.length > 0 && blob.includes(secret));
  if (
    blob.includes("i.ytimg.com/vi/") ||
    blob.includes("youtube.com") ||
    blob.includes("youtu.be") ||
    blob.includes("youtube-nocookie.com")
  ) {
    found.push("youtube-host");
  }
  return found;
}
