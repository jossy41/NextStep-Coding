/**
 * Seed course catalog for NextStep Coding.
 * Structure mirrors the database schema so it can be migrated to Supabase later.
 * Video resources are marked draft unless a real YouTube ID is provided.
 */

export type CourseLanguage = 'en' | 'am'

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  /** Index of correct answer — kept in data; production scoring should validate server-side */
  correctIndex: number
  explanation: string
}

export interface Lesson {
  id: string
  title: string
  titleAm?: string
  content: string
  contentAm?: string
  durationMinutes: number
  youtubeId?: string | null // null/undefined = draft / no video yet
  channelName?: string | null
  exercises?: string[]
  quiz?: QuizQuestion[]
}

export interface Module {
  id: string
  title: string
  titleAm?: string
  description?: string
  lessons: Lesson[]
}

export interface CourseProject {
  title: string
  titleAm?: string
  brief: string
  briefAm?: string
  requirements: string[]
  requirementsAm?: string[]
  rubric: { criterion: string; points: number }[]
}

export interface Course {
  id: string
  slug: string
  language: CourseLanguage // primary content language
  status: 'published' | 'draft'
  title: string
  titleAm: string
  description: string
  descriptionAm: string
  objectives: string[]
  objectivesAm: string[]
  prerequisites: string
  prerequisitesAm: string
  durationHours: number
  modules: Module[]
  project: CourseProject
  certificateRequirements: {
    minQuizScore: number
    requireAllLessons: boolean
    requireProjectApproval: boolean
  }
}

export const COURSES: Course[] = [
  {
    id: 'course-html',
    slug: 'html-fundamentals',
    language: 'en',
    status: 'published',
    title: 'HTML Fundamentals',
    titleAm: 'የHTML መሰረታዊ ነገሮች',
    description:
      'Learn how to structure web pages with HTML. You will cover document structure, elements, links, images, lists, tables, forms, semantic markup, and basic accessibility.',
    descriptionAm:
      'በHTML ድረ-ገጾችን እንዴት እንደሚያዋቅሩ ይማሩ። የሰነድ መዋቅር፣ ኤለመንቶች፣ አገናኞች፣ ምስሎች፣ ዝርዝሮች፣ ሰንጠረዦች፣ ቅጾች፣ ሴማንቲክ ምልክት እና መሰረታዊ ተደራሽነትን ይሸፍናሉ።',
    objectives: [
      'Create a valid HTML5 document',
      'Use headings, paragraphs, links, and images correctly',
      'Build lists, tables, and forms',
      'Apply semantic HTML for better accessibility and SEO',
      'Ship a structured personal or informational website as the final project',
    ],
    objectivesAm: [
      'ትክክለኛ HTML5 ሰነድ ይፍጠሩ',
      'ርዕሶችን፣ አንቀጾችን፣ አገናኞችን እና ምስሎችን በትክክል ይጠቀሙ',
      'ዝርዝሮችን፣ ሰንጠረዦችን እና ቅጾችን ይገንቡ',
      'ለተሻለ ተደራሽነት እና SEO ሴማንቲክ HTML ይተግብሩ',
      'እንደ የመጨረሻ ፕሮጀክት የተዋቀረ የግል ወይም የመረጃ ድረ-ገጽ ያቅርቡ',
    ],
    prerequisites: 'No prior web development experience required.',
    prerequisitesAm: 'ቀደም ያለ የድረ-ገጽ ልማት ልምድ አያስፈልግም።',
    durationHours: 12,
    certificateRequirements: {
      minQuizScore: 70,
      requireAllLessons: true,
      requireProjectApproval: true,
    },
    modules: [
      {
        id: 'html-m1',
        title: 'Getting Started with HTML',
        titleAm: 'ከHTML ጋር መጀመር',
        lessons: [
          {
            id: 'html-l1',
            title: 'What is HTML?',
            titleAm: 'HTML ምንድን ነው?',
            durationMinutes: 15,
            content: `HTML (HyperText Markup Language) is the standard language for creating web pages. It describes the structure of a page using elements (tags).

Browsers read HTML and render content. HTML does not style pages (that is CSS) and does not add interactivity (that is JavaScript).

A minimal HTML5 document looks like this:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello, NextStep!</h1>
  </body>
</html>
\`\`\`

The \`<!DOCTYPE html>\` declaration tells the browser to use HTML5 standards mode.`,
            contentAm: `HTML (HyperText Markup Language) ድረ-ገጾችን ለመፍጠር መደበኛ ቋንቋ ነው። ኤለመንቶችን (ታጎች) በመጠቀም የገጽ መዋቅርን ይገልጻል።

አሳሾች HTMLን ያነባሉ እና ይዘትን ያሳያሉ። HTML ገጾችን አያስውብም (ያ CSS ነው) እና በይነተገናኝነት አያክልም (ያ JavaScript ነው)።`,
            youtubeId: null,
            channelName: null,
            exercises: [
              'Create an index.html file with a valid HTML5 skeleton.',
              'Change the page title and add a heading inside the body.',
            ],
            quiz: [
              {
                id: 'html-q1',
                question: 'What does HTML stand for?',
                options: [
                  'HyperText Markup Language',
                  'High Tech Modern Language',
                  'Hyper Transfer Markup Logic',
                  'Home Tool Markup Language',
                ],
                correctIndex: 0,
                explanation: 'HTML stands for HyperText Markup Language.',
              },
              {
                id: 'html-q2',
                question: 'Which declaration starts an HTML5 document?',
                options: ['<!DOCTYPE html>', '<!HTML5>', '<doctype HTML>', '<?html?>'],
                correctIndex: 0,
                explanation: 'The correct declaration is <!DOCTYPE html>.',
              },
            ],
          },
          {
            id: 'html-l2',
            title: 'Elements, Tags, and Attributes',
            titleAm: 'ኤለመንቶች፣ ታጎች እና ባህሪያት',
            durationMinutes: 20,
            content: `An HTML element usually has an opening tag, content, and a closing tag:

\`\`\`html
<p class="intro">This is a paragraph.</p>
\`\`\`

- \`p\` is the tag name.
- \`class="intro"\` is an attribute (name/value pair).
- Some elements are void (self-closing): \`<img>\`, \`<br>\`, \`<input>\`.

Common attributes: \`id\`, \`class\`, \`href\`, \`src\`, \`alt\`, \`lang\`.`,
            exercises: [
              'Add a paragraph with a class attribute.',
              'Add an image with src and alt attributes (use any public image URL).',
            ],
            quiz: [
              {
                id: 'html-q3',
                question: 'Which of these is a void (self-closing) element?',
                options: ['<p>', '<div>', '<img>', '<h1>'],
                correctIndex: 2,
                explanation: '<img> is a void element and does not need a closing tag.',
              },
            ],
          },
        ],
      },
      {
        id: 'html-m2',
        title: 'Text, Links, and Media',
        titleAm: 'ጽሁፍ፣ አገናኞች እና ሚዲያ',
        lessons: [
          {
            id: 'html-l3',
            title: 'Headings and Paragraphs',
            titleAm: 'ርዕሶች እና አንቀጾች',
            durationMinutes: 15,
            content: `Use \`<h1>\`–\`<h6>\` for headings. Prefer one \`<h1>\` per page for the main title.

\`\`\`html
<h1>Main Title</h1>
<h2>Section</h2>
<p>Body text goes in paragraphs.</p>
\`\`\`

Do not use headings only for visual size — they convey document structure.`,
            exercises: ['Build a short page with one h1, two h2 sections, and paragraphs.'],
            quiz: [
              {
                id: 'html-q4',
                question: 'How many <h1> elements should a typical page have?',
                options: ['As many as you want', 'Usually one main h1', 'Exactly six', 'None'],
                correctIndex: 1,
                explanation: 'Best practice is one primary h1 describing the page topic.',
              },
            ],
          },
          {
            id: 'html-l4',
            title: 'Links and Images',
            titleAm: 'አገናኞች እና ምስሎች',
            durationMinutes: 20,
            content: `Links use the anchor element:

\`\`\`html
<a href="https://example.com">Visit Example</a>
<a href="about.html">About page</a>
\`\`\`

Images:

\`\`\`html
<img src="photo.jpg" alt="Description of the photo" width="400" />
\`\`\`

Always provide meaningful \`alt\` text for accessibility.`,
            exercises: [
              'Add internal and external links.',
              'Add an image with descriptive alt text.',
            ],
            quiz: [
              {
                id: 'html-q5',
                question: 'Which attribute is required for accessibility on images?',
                options: ['title', 'alt', 'width', 'class'],
                correctIndex: 1,
                explanation: 'The alt attribute describes the image for screen readers and when the image fails to load.',
              },
            ],
          },
        ],
      },
      {
        id: 'html-m3',
        title: 'Lists, Tables, and Forms',
        titleAm: 'ዝርዝሮች፣ ሰንጠረዦች እና ቅጾች',
        lessons: [
          {
            id: 'html-l5',
            title: 'Lists and Tables',
            titleAm: 'ዝርዝሮች እና ሰንጠረዦች',
            durationMinutes: 25,
            content: `Unordered list: \`<ul><li>…</li></ul>\`  
Ordered list: \`<ol><li>…</li></ol>\`

Tables:

\`\`\`html
<table>
  <thead>
    <tr><th>Name</th><th>Role</th></tr>
  </thead>
  <tbody>
    <tr><td>Amina</td><td>Student</td></tr>
  </tbody>
</table>
\`\`\``,
            exercises: ['Create a grocery list and a simple two-column table.'],
            quiz: [
              {
                id: 'html-q6',
                question: 'Which element creates an ordered (numbered) list?',
                options: ['<ul>', '<ol>', '<dl>', '<list>'],
                correctIndex: 1,
                explanation: '<ol> creates an ordered list.',
              },
            ],
          },
          {
            id: 'html-l6',
            title: 'Forms and Inputs',
            titleAm: 'ቅጾች እና ግብዓቶች',
            durationMinutes: 30,
            content: `Forms collect user input:

\`\`\`html
<form action="/submit" method="post">
  <label for="name">Name</label>
  <input id="name" name="name" type="text" required />
  <button type="submit">Send</button>
</form>
\`\`\`

Common input types: text, email, password, number, checkbox, radio, file.`,
            exercises: ['Build a contact form with name, email, and message fields.'],
            quiz: [
              {
                id: 'html-q7',
                question: 'Which attribute associates a label with an input?',
                options: ['name', 'for (matching input id)', 'class', 'value'],
                correctIndex: 1,
                explanation: 'The label for attribute should match the input id.',
              },
            ],
          },
        ],
      },
      {
        id: 'html-m4',
        title: 'Semantic HTML and Accessibility',
        titleAm: 'ሴማንቲክ HTML እና ተደራሽነት',
        lessons: [
          {
            id: 'html-l7',
            title: 'Semantic Elements',
            titleAm: 'ሴማንቲክ ኤለመንቶች',
            durationMinutes: 20,
            content: `Prefer semantic elements over generic divs when they convey meaning:

- \`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<aside>\`, \`<footer>\`

These help assistive technologies and improve structure.`,
            exercises: ['Refactor a page to use header, main, and footer.'],
            quiz: [
              {
                id: 'html-q8',
                question: 'Which element is best for the primary navigation?',
                options: ['<div>', '<nav>', '<span>', '<section>'],
                correctIndex: 1,
                explanation: '<nav> is the semantic element for navigation blocks.',
              },
            ],
          },
          {
            id: 'html-l8',
            title: 'Basic Accessibility',
            titleAm: 'መሰረታዊ ተደራሽነት',
            durationMinutes: 20,
            content: `Accessibility basics:
- Provide alt text for images
- Use proper heading order
- Associate labels with form controls
- Ensure keyboard focus is visible
- Do not rely on color alone to convey meaning

Your final project should demonstrate these practices.`,
            exercises: ['Audit your project page for missing alt text and unlabeled inputs.'],
            quiz: [
              {
                id: 'html-q9',
                question: 'Why is semantic HTML important for accessibility?',
                options: [
                  'It makes CSS faster',
                  'It helps assistive technologies understand page structure',
                  'It encrypts the page',
                  'It is required by all browsers to display content',
                ],
                correctIndex: 1,
                explanation: 'Semantic markup communicates structure to screen readers and other tools.',
              },
            ],
          },
        ],
      },
    ],
    project: {
      title: 'Personal or Informational Website',
      titleAm: 'የግል ወይም የመረጃ ድረ-ገጽ',
      brief:
        'Build a multi-page (or single-page with clear sections) website about yourself or a topic you care about. Use semantic HTML, include navigation, images with alt text, a list or table, and a simple form.',
      briefAm:
        'ስለ እራስዎ ወይም ስለሚያስቡት ርዕስ ባለብዙ ገጽ (ወይም ግልጽ ክፍሎች ያለው ነጠላ ገጽ) ድረ-ገጽ ይገንቡ። ሴማንቲክ HTML ይጠቀሙ፣ አሰሳ፣ alt text ያላቸው ምስሎች፣ ዝርዝር ወይም ሰንጠረዥ እና ቀላል ቅጽ ያካትቱ።',
      requirements: [
        'Valid HTML5 document structure',
        'Semantic landmarks (header, nav, main, footer)',
        'At least one image with meaningful alt text',
        'A list or table',
        'A form with labeled inputs',
        'Hosted or viewable via a public URL (GitHub Pages, Netlify, CodePen, etc.)',
      ],
      requirementsAm: [
        'ትክክለኛ HTML5 የሰነድ መዋቅር',
        'ሴማንቲክ ምልክቶች (header, nav, main, footer)',
        'ቢያንስ አንድ ትርጉም ያለው alt text ያለው ምስል',
        'ዝርዝር ወይም ሰንጠረዥ',
        'መለያ ያላቸው ግብዓቶች ያለው ቅጽ',
        'በህዝብ URL የሚታይ (GitHub Pages, Netlify, CodePen, ወዘተ)',
      ],
      rubric: [
        { criterion: 'Valid structure & semantic HTML', points: 30 },
        { criterion: 'Content quality and clarity', points: 20 },
        { criterion: 'Accessibility (alt, labels, headings)', points: 25 },
        { criterion: 'Required elements present', points: 25 },
      ],
    },
  },
  {
    id: 'course-css',
    slug: 'css-responsive',
    language: 'en',
    status: 'published',
    title: 'CSS and Responsive Design',
    titleAm: 'CSS እና ምላሽ ሰጪ ንድፍ',
    description:
      'Style web pages with CSS. Learn selectors, the box model, Flexbox, Grid, typography, colors, and responsive layouts with media queries.',
    descriptionAm:
      'ድረ-ገጾችን በCSS ያስውቡ። መራጮችን፣ የሳጥን ሞዴልን፣ Flexboxን፣ Gridን፣ ታይፖግራፊን፣ ቀለሞችን እና በmedia queries ምላሽ ሰጪ አቀማመጦችን ይማሩ።',
    objectives: [
      'Apply CSS selectors and the cascade',
      'Control layout with Flexbox and Grid',
      'Build responsive pages with media queries',
      'Improve readability with typography and spacing',
      'Deliver a responsive multi-section website',
    ],
    objectivesAm: [
      'የCSS መራጮችን እና cascadeን ይተግብሩ',
      'በFlexbox እና Grid አቀማመጥን ይቆጣጠሩ',
      'በmedia queries ምላሽ ሰጪ ገጾችን ይገንቡ',
      'በታይፖግራፊ እና ክፍተት ተነባቢነትን ያሻሽሉ',
      'ምላሽ ሰጪ ባለብዙ ክፍል ድረ-ገጽ ያቅርቡ',
    ],
    prerequisites: 'HTML Fundamentals or equivalent basic HTML knowledge.',
    prerequisitesAm: 'የHTML መሰረታዊ ነገሮች ወይም ተመሳሳይ መሰረታዊ HTML እውቀት።',
    durationHours: 14,
    certificateRequirements: {
      minQuizScore: 70,
      requireAllLessons: true,
      requireProjectApproval: true,
    },
    modules: [
      {
        id: 'css-m1',
        title: 'CSS Basics',
        titleAm: 'የCSS መሰረታዊ ነገሮች',
        lessons: [
          {
            id: 'css-l1',
            title: 'Selectors and Properties',
            titleAm: 'መራጮች እና ባህሪያት',
            durationMinutes: 25,
            content: `CSS rules look like:

\`\`\`css
selector {
  property: value;
}
\`\`\`

Common selectors: element (\`p\`), class (\`.card\`), id (\`#hero\`), descendant (\`nav a\`).

Link a stylesheet:

\`\`\`html
<link rel="stylesheet" href="styles.css" />
\`\`\``,
            exercises: ['Create styles.css and style headings and paragraphs.'],
            quiz: [
              {
                id: 'css-q1',
                question: 'Which selector targets elements with class="card"?',
                options: ['#card', '.card', 'card', '*card'],
                correctIndex: 1,
                explanation: 'Class selectors start with a dot: .card',
              },
            ],
          },
          {
            id: 'css-l2',
            title: 'The Box Model',
            titleAm: 'የሳጥን ሞዴል',
            durationMinutes: 25,
            content: `Every element is a box: content → padding → border → margin.

\`\`\`css
.box {
  width: 300px;
  padding: 16px;
  border: 1px solid #ccc;
  margin: 8px;
  box-sizing: border-box;
}
\`\`\`

Prefer \`box-sizing: border-box\` so width includes padding and border.`,
            exercises: ['Build three cards with consistent padding and margin.'],
            quiz: [
              {
                id: 'css-q2',
                question: 'With box-sizing: border-box, does width include padding?',
                options: ['Yes', 'No', 'Only on mobile', 'Only for flex items'],
                correctIndex: 0,
                explanation: 'border-box includes padding and border in the specified width.',
              },
            ],
          },
        ],
      },
      {
        id: 'css-m2',
        title: 'Layout with Flexbox and Grid',
        titleAm: 'በFlexbox እና Grid አቀማመጥ',
        lessons: [
          {
            id: 'css-l3',
            title: 'Flexbox',
            titleAm: 'Flexbox',
            durationMinutes: 30,
            content: `Flexbox aligns items in a row or column:

\`\`\`css
.row {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: center;
}
\`\`\``,
            exercises: ['Create a navigation bar using flexbox.'],
            quiz: [
              {
                id: 'css-q3',
                question: 'Which property sets the main axis direction in flexbox?',
                options: ['align-items', 'flex-direction', 'order', 'gap'],
                correctIndex: 1,
                explanation: 'flex-direction sets row or column (main axis).',
              },
            ],
          },
          {
            id: 'css-l4',
            title: 'CSS Grid',
            titleAm: 'CSS Grid',
            durationMinutes: 30,
            content: `Grid creates two-dimensional layouts:

\`\`\`css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
\`\`\``,
            exercises: ['Build a 3-column card grid that collapses on small screens.'],
            quiz: [
              {
                id: 'css-q4',
                question: 'What does 1fr mean in grid-template-columns?',
                options: [
                  'One fixed pixel',
                  'One fraction of available space',
                  'One font size',
                  'Invalid value',
                ],
                correctIndex: 1,
                explanation: 'fr is a flexible fraction of the free space in the grid container.',
              },
            ],
          },
        ],
      },
      {
        id: 'css-m3',
        title: 'Responsive Design',
        titleAm: 'ምላሽ ሰጪ ንድፍ',
        lessons: [
          {
            id: 'css-l5',
            title: 'Media Queries',
            titleAm: 'Media Queries',
            durationMinutes: 25,
            content: `Adapt styles by viewport size:

\`\`\`css
.container { width: 100%; max-width: 1100px; margin: 0 auto; }

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
\`\`\`

Also set the viewport meta tag in HTML.`,
            exercises: ['Make a layout stack on mobile and split into columns on tablet+.'],
            quiz: [
              {
                id: 'css-q5',
                question: 'Which meta tag is required for responsive pages on mobile?',
                options: [
                  '<meta name="viewport" content="width=device-width, initial-scale=1">',
                  '<meta name="mobile">',
                  '<meta charset="utf-8">',
                  '<meta responsive>',
                ],
                correctIndex: 0,
                explanation: 'The viewport meta tag controls how mobile browsers scale the page.',
              },
            ],
          },
        ],
      },
    ],
    project: {
      title: 'Responsive Landing Page',
      titleAm: 'ምላሽ ሰጪ ማረፊያ ገጽ',
      brief:
        'Design and build a responsive landing page with a hero, features section, and footer. It must work well on mobile and desktop using Flexbox and/or Grid and media queries.',
      briefAm:
        'ሂሮ፣ የባህሪ ክፍል እና ፉተር ያለው ምላሽ ሰጪ ማረፊያ ገጽ ይንደፉ እና ይገንቡ። በFlexbox እና/ወይም Grid እና media queries በሞባይል እና ዴስክቶፕ ላይ በደንብ መስራት አለበት።',
      requirements: [
        'Mobile-first or clearly responsive layout',
        'Use of Flexbox and/or CSS Grid',
        'At least one media query breakpoint',
        'Consistent spacing and readable typography',
        'Public URL for review',
      ],
      requirementsAm: [
        'ሞባይል-መጀመሪያ ወይም በግልጽ ምላሽ ሰጪ አቀማመጥ',
        'Flexbox እና/ወይም CSS Grid መጠቀም',
        'ቢያንስ አንድ media query breakpoint',
        'ተከታታይ ክፍተት እና ተነባቢ ታይፖግራፊ',
        'ለግምገማ የህዝብ URL',
      ],
      rubric: [
        { criterion: 'Responsive behavior', points: 30 },
        { criterion: 'Layout technique (Flex/Grid)', points: 25 },
        { criterion: 'Visual polish & spacing', points: 25 },
        { criterion: 'Code quality', points: 20 },
      ],
    },
  },
  {
    id: 'course-js',
    slug: 'javascript-fundamentals',
    language: 'en',
    status: 'published',
    title: 'JavaScript Fundamentals',
    titleAm: 'የJavaScript መሰረታዊ ነገሮች',
    description:
      'Add interactivity to web pages. Learn variables, control flow, functions, arrays, objects, DOM manipulation, and events by building small interactive apps.',
    descriptionAm:
      'ለድረ-ገጾች በይነተገናኝነት ያክሉ። ተለዋዋጮችን፣ የቁጥጥር ፍሰትን፣ ተግባራትን፣ ድርድሮችን፣ ነገሮችን፣ DOM ማጭበርበርን እና ክስተቶችን በትንንሽ በይነተገናኝ መተግበሪያዎች በመገንባት ይማሩ።',
    objectives: [
      'Use variables, operators, and data types',
      'Write conditions, loops, and functions',
      'Work with arrays and objects',
      'Manipulate the DOM and respond to events',
      'Build an interactive quiz or task manager',
    ],
    objectivesAm: [
      'ተለዋዋጮችን፣ ኦፕሬተሮችን እና የውሂብ ዓይነቶችን ይጠቀሙ',
      'ሁኔታዎችን፣ ሉፖችን እና ተግባራትን ይጻፉ',
      'ከድርድሮች እና ነገሮች ጋር ይስሩ',
      'DOMን ያጭበርብሩ እና ለክስተቶች ምላሽ ይስጡ',
      'በይነተገናኝ ፈተና ወይም የተግባር አስተዳዳሪ ይገንቡ',
    ],
    prerequisites: 'HTML Fundamentals and basic CSS recommended.',
    prerequisitesAm: 'የHTML መሰረታዊ ነገሮች እና መሰረታዊ CSS ይመከራል።',
    durationHours: 16,
    certificateRequirements: {
      minQuizScore: 70,
      requireAllLessons: true,
      requireProjectApproval: true,
    },
    modules: [
      {
        id: 'js-m1',
        title: 'Language Basics',
        titleAm: 'የቋንቋ መሰረታዊ ነገሮች',
        lessons: [
          {
            id: 'js-l1',
            title: 'Variables and Data Types',
            titleAm: 'ተለዋዋጮች እና የውሂብ ዓይነቶች',
            durationMinutes: 25,
            content: `Declare variables with \`let\` and \`const\` (prefer const when the value does not change).

Types: string, number, boolean, null, undefined, object, symbol.

\`\`\`js
const name = 'Amina';
let score = 0;
const active = true;
\`\`\``,
            exercises: ['Create variables for a student profile and log them.'],
            quiz: [
              {
                id: 'js-q1',
                question: 'Which keyword should you prefer for a value that never reassigns?',
                options: ['var', 'let', 'const', 'static'],
                correctIndex: 2,
                explanation: 'const prevents reassignment of the binding.',
              },
            ],
          },
          {
            id: 'js-l2',
            title: 'Operators, Conditions, and Loops',
            titleAm: 'ኦፕሬተሮች፣ ሁኔታዎች እና ሉፖች',
            durationMinutes: 30,
            content: `\`\`\`js
if (score >= 70) {
  console.log('Passed');
} else {
  console.log('Try again');
}

for (let i = 0; i < 5; i++) {
  console.log(i);
}
\`\`\``,
            exercises: ['Write a loop that prints numbers 1–10 and an if/else for pass/fail.'],
            quiz: [
              {
                id: 'js-q2',
                question: 'What does === check?',
                options: [
                  'Value only',
                  'Value and type',
                  'Only type',
                  'Reference identity only for primitives',
                ],
                correctIndex: 1,
                explanation: '=== compares both value and type without coercion.',
              },
            ],
          },
        ],
      },
      {
        id: 'js-m2',
        title: 'Functions, Arrays, and Objects',
        titleAm: 'ተግባራት፣ ድርድሮች እና ነገሮች',
        lessons: [
          {
            id: 'js-l3',
            title: 'Functions',
            titleAm: 'ተግባራት',
            durationMinutes: 25,
            content: `\`\`\`js
function greet(name) {
  return \`Hello, \${name}\`;
}

const add = (a, b) => a + b;
\`\`\``,
            exercises: ['Write a function that calculates average of three scores.'],
            quiz: [
              {
                id: 'js-q3',
                question: 'What does a function return if there is no return statement?',
                options: ['null', '0', 'undefined', 'false'],
                correctIndex: 2,
                explanation: 'Functions return undefined by default.',
              },
            ],
          },
          {
            id: 'js-l4',
            title: 'Arrays and Objects',
            titleAm: 'ድርድሮች እና ነገሮች',
            durationMinutes: 30,
            content: `\`\`\`js
const scores = [80, 90, 70];
scores.push(85);

const student = { name: 'Amina', passed: true };
console.log(student.name);
\`\`\``,
            exercises: ['Store a list of tasks as objects with title and done fields.'],
            quiz: [
              {
                id: 'js-q4',
                question: 'Which method adds an item to the end of an array?',
                options: ['pop', 'push', 'shift', 'slice'],
                correctIndex: 1,
                explanation: 'push appends to the end of an array.',
              },
            ],
          },
        ],
      },
      {
        id: 'js-m3',
        title: 'DOM and Events',
        titleAm: 'DOM እና ክስተቶች',
        lessons: [
          {
            id: 'js-l5',
            title: 'Selecting and Updating the DOM',
            titleAm: 'DOMን መምረጥ እና ማዘመን',
            durationMinutes: 30,
            content: `\`\`\`js
const title = document.querySelector('h1');
title.textContent = 'Updated';

const list = document.getElementById('tasks');
const li = document.createElement('li');
li.textContent = 'New task';
list.appendChild(li);
\`\`\``,
            exercises: ['Change page text and add a list item with JavaScript.'],
            quiz: [
              {
                id: 'js-q5',
                question: 'Which method selects the first matching CSS selector?',
                options: [
                  'document.getElementById',
                  'document.querySelector',
                  'document.getElementsByClassName',
                  'document.write',
                ],
                correctIndex: 1,
                explanation: 'querySelector returns the first element matching a CSS selector.',
              },
            ],
          },
          {
            id: 'js-l6',
            title: 'Events and Basic Debugging',
            titleAm: 'ክስተቶች እና መሰረታዊ ማረም',
            durationMinutes: 30,
            content: `\`\`\`js
button.addEventListener('click', () => {
  console.log('Clicked');
});
\`\`\`

Use browser DevTools: Console, Elements, and Sources for debugging.`,
            exercises: ['Add a button that toggles a message when clicked.'],
            quiz: [
              {
                id: 'js-q6',
                question: 'Which method registers a click handler?',
                options: ['onclick()', 'addEventListener', 'attachEvent only', 'bindClick'],
                correctIndex: 1,
                explanation: 'addEventListener is the standard way to register event handlers.',
              },
            ],
          },
        ],
      },
    ],
    project: {
      title: 'Interactive Quiz or Task Manager',
      titleAm: 'በይነተገናኝ ፈተና ወይም የተግባር አስተዳዳሪ',
      brief:
        'Build either (1) a quiz app that shows questions, accepts answers, and displays a score, or (2) a task manager where users can add, complete, and remove tasks. Use vanilla JavaScript and DOM APIs.',
      briefAm:
        'ወይ (1) ጥያቄዎችን የሚያሳይ፣ መልሶችን የሚቀበል እና ውጤት የሚያሳይ የፈተና መተግበሪያ፣ ወይም (2) ተጠቃሚዎች ተግባራትን ማከል፣ ማጠናቀቅ እና ማስወገድ የሚችሉበት የተግባር አስተዳዳሪ ይገንቡ። ቫኒላ JavaScript እና DOM APIs ይጠቀሙ።',
      requirements: [
        'Interactive UI driven by JavaScript',
        'Use of functions, arrays/objects, and events',
        'Clear user feedback (score or task state)',
        'Readable code structure',
        'Public URL for review',
      ],
      requirementsAm: [
        'በJavaScript የሚነዳ በይነተገናኝ በይነገጽ',
        'ተግባራት፣ ድርድሮች/ነገሮች እና ክስተቶች መጠቀም',
        'ግልጽ የተጠቃሚ ግብረመልስ (ውጤት ወይም የተግባር ሁኔታ)',
        'ተነባቢ የኮድ መዋቅር',
        'ለግምገማ የህዝብ URL',
      ],
      rubric: [
        { criterion: 'Interactivity & correctness', points: 35 },
        { criterion: 'Use of JS fundamentals', points: 25 },
        { criterion: 'Code organization', points: 20 },
        { criterion: 'UX clarity', points: 20 },
      ],
    },
  },
]

export function getCourseBySlug(slug: string): Course | undefined {
  return COURSES.find((c) => c.slug === slug)
}

export function getPublishedCourses(): Course[] {
  return COURSES.filter((c) => c.status === 'published')
}

export function getAllLessons(course: Course): Lesson[] {
  return course.modules.flatMap((m) => m.lessons)
}

export function getLesson(course: Course, lessonId: string): Lesson | undefined {
  return getAllLessons(course).find((l) => l.id === lessonId)
}
