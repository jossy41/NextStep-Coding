-- NextStep Coding content, progress, and certificates.
-- Applied automatically on preview and on deploy. Do not drop these tables.

create table if not exists profiles (
  user_id text primary key,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'admin', 'reviewer')),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'am')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists courses (
  id text primary key,
  slug text not null unique,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  language text not null default 'en' check (language in ('en', 'am')),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  category text not null default 'Web development',
  duration_hours int not null default 0,
  thumbnail_url text,
  prerequisites text not null default '',
  prerequisites_am text not null default '',
  min_quiz_score int not null default 70 check (min_quiz_score between 0 and 100),
  require_project boolean not null default true,
  project_title text not null default '',
  project_title_am text not null default '',
  project_brief text not null default '',
  project_brief_am text not null default '',
  project_requirements jsonb not null default '[]'::jsonb,
  project_requirements_am jsonb not null default '[]'::jsonb,
  project_rubric jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists course_translations (
  course_id text not null references courses(id) on delete cascade,
  locale text not null check (locale in ('en', 'am')),
  title text not null,
  description text not null,
  objectives jsonb not null default '[]'::jsonb,
  primary key (course_id, locale)
);

create table if not exists video_resources (
  id text primary key,
  title text not null,
  description text not null default '',
  youtube_id text not null,
  youtube_url text not null default '',
  thumbnail_url text not null default '',
  category text not null default 'General',
  language text not null default 'en' check (language in ('en', 'am')),
  course_id text references courses(id) on delete set null,
  lesson_id text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists modules (
  id text primary key,
  course_id text not null references courses(id) on delete cascade,
  title text not null,
  title_am text not null default '',
  description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists lessons (
  id text primary key,
  module_id text not null references modules(id) on delete cascade,
  title text not null,
  title_am text not null default '',
  content text not null default '',
  content_am text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  exercises_am jsonb not null default '[]'::jsonb,
  resources text not null default '',
  video_resource_id text references video_resources(id) on delete set null,
  sort_order int not null default 0,
  duration_minutes int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quiz_questions (
  id text primary key,
  lesson_id text not null references lessons(id) on delete cascade,
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text not null default '',
  sort_order int not null default 0
);

create table if not exists enrollments (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  course_id text not null references courses(id) on delete cascade,
  status text not null default 'enrolled' check (status in ('enrolled', 'in_progress', 'completed')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

create table if not exists lesson_progress (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  lesson_id text not null references lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table if not exists quiz_attempts (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  lesson_id text not null references lessons(id) on delete cascade,
  score int not null,
  passed boolean not null,
  answers jsonb not null default '[]'::jsonb,
  attempted_at timestamptz not null default now()
);

create table if not exists project_submissions (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  course_id text not null references courses(id) on delete cascade,
  project_url text not null,
  description text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'revision_requested')),
  feedback text not null default '',
  reviewer_id text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists project_reviews (
  id text primary key,
  submission_id text not null references project_submissions(id) on delete cascade,
  reviewer_id text not null,
  status text not null,
  feedback text not null default '',
  reviewed_at timestamptz not null default now()
);

create table if not exists certificates (
  id text primary key,
  certificate_code text not null unique,
  user_id text not null references profiles(user_id) on delete cascade,
  course_id text not null references courses(id) on delete restrict,
  student_name text not null,
  achievement_title text not null,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  issuer_name text not null default '',
  issuer_role text not null default ''
);

create unique index if not exists certificates_one_active
  on certificates (user_id, course_id)
  where revoked_at is null;

create table if not exists posts (
  id text primary key,
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body text not null default '',
  cover_url text,
  category text not null default 'Announcement',
  language text not null default 'en' check (language in ('en', 'am')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  pinned boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value text not null
);

create table if not exists audit_logs (
  id text primary key,
  actor_id text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_modules_course on modules (course_id, sort_order);
create index if not exists idx_lessons_module on lessons (module_id, sort_order);
create index if not exists idx_enrollments_user on enrollments (user_id);
create index if not exists idx_progress_user on lesson_progress (user_id);
create index if not exists idx_quiz_user on quiz_attempts (user_id, lesson_id);
create index if not exists idx_projects_status on project_submissions (status);
create index if not exists idx_posts_public on posts (status, pinned, published_at);
create index if not exists idx_videos_public on video_resources (status, sort_order);
create index if not exists idx_certificates_code on certificates (certificate_code);

insert into app_settings (key, value) values
  ('org_name', 'NextStep Coding'),
  ('issuer_name', ''),
  ('issuer_role', ''),
  ('contact_email', '')
on conflict (key) do nothing;
