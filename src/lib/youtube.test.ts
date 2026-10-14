import assert from "node:assert/strict";
import test from "node:test";
import { parseYouTubeId } from "./youtube.ts";

test("parses common YouTube URL shapes", () => {
  assert.equal(parseYouTubeId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(
    parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=12"),
    "dQw4w9WgXcQ",
  );
  assert.equal(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(
    parseYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(parseYouTubeId("<iframe src='https://evil.test'></iframe>"), null);
  assert.equal(parseYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(parseYouTubeId("javascript:alert(1)"), null);
  assert.equal(parseYouTubeId("not a video"), null);
});
