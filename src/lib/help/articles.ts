export type ArticleSection = {
  heading: string;
  body: string;
  steps?: string[];
  bullets?: string[];
  tip?: string;
  warning?: string;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  category: string;
  categorySlug: string;
  readingTime: number;
  intro: string;
  sections: ArticleSection[];
  relatedSlugs?: string[];
};

export const CATEGORIES = [
  { slug: "getting-started",       label: "Getting Started",         icon: "🚀" },
  { slug: "compliance",            label: "Compliance Monitoring",   icon: "📋" },
  { slug: "flight-books",          label: "Flight Books & Manuals",  icon: "📖" },
  { slug: "training",              label: "Training Management",     icon: "🎓" },
  { slug: "account-billing",       label: "Account & Billing",       icon: "💳" },
];

export const ARTICLES: Article[] = [
  // ─── Getting Started ───────────────────────────────────────────────────────
  {
    slug: "getting-started",
    title: "Getting started: your first 10 minutes on Flight Lyceum",
    description: "A step-by-step walkthrough to get your school set up, your manuals uploaded, and your team invited: all in under 10 minutes.",
    category: "Getting Started",
    categorySlug: "getting-started",
    readingTime: 4,
    intro: "Flight Lyceum is designed so you can go from signup to a fully configured compliance workspace in a single session. This guide walks you through the essential first steps.",
    sections: [
      {
        heading: "Step 1: Register your organisation",
        body: "When you first sign up, you'll create an organisation account for your school. This is the central workspace that all your instructors and students will join.",
        steps: [
          "Visit flightlyceum.com and click Start free trial.",
          "Enter your school name, country, and ICAO identifier.",
          "Create your admin account with a work email address.",
          "Confirm your email and log in.",
        ],
        tip: "Use your official school email domain. This makes it easier to recognise and approve future team member invitations.",
      },
      {
        heading: "Step 2: Upload your first manual",
        body: "The fastest way to make Flight Lyceum useful is to upload your Operations Manual or Training Manual. The system parses it into indexed sections so the AI can compare them against regulation updates.",
        steps: [
          "Navigate to Flight Books in the sidebar.",
          "Click Upload flight book.",
          "Choose PDF, TXT, or Markdown format and select your file.",
          "Give it a clear title (e.g. 'Operations Manual Rev 4.2') and click Upload.",
          "Wait for the indexing pipeline to process: usually under two minutes.",
        ],
        tip: "You can upload multiple manuals at once. Start with your most frequently updated documents.",
      },
      {
        heading: "Step 3: Configure your regulation sources",
        body: "Flight Lyceum monitors official EASA publications for changes. You choose which regulatory areas matter to your school.",
        steps: [
          "Go to Settings → Sources.",
          "Enable the document types relevant to your ATO: Part-FCL, Part-ORA, AMC/GM, and EASA Opinions.",
          "Save your selection.",
        ],
      },
      {
        heading: "Step 4: Invite your team",
        body: "Add your instructors and compliance officer so they can start reviewing updates and assigning training.",
        steps: [
          "Go to Settings → Users.",
          "Click Invite user, enter their email, and choose a role: Admin, Instructor, or Student.",
          "They'll receive an email with a sign-in link.",
        ],
      },
      {
        heading: "You're ready",
        body: "Once your first manual is indexed and your sources are configured, Flight Lyceum will begin monitoring for relevant regulation changes. The next time EASA publishes an update, you'll receive a notification and a review item will appear in your queue.",
      },
    ],
    relatedSlugs: ["inviting-your-team", "understanding-your-dashboard", "setting-up-easa-sources"],
  },

  {
    slug: "inviting-your-team",
    title: "Inviting your team: adding instructors and students",
    description: "How to add instructors, students, and administrators to your organisation, manage roles, and control what each person can see and do.",
    category: "Getting Started",
    categorySlug: "getting-started",
    readingTime: 3,
    intro: "Flight Lyceum uses a role-based system. Each person in your organisation has a role that controls their access level. Here's how to get your team set up.",
    sections: [
      {
        heading: "Understanding roles",
        body: "There are three roles in Flight Lyceum:",
        bullets: [
          "Admin: full access to settings, manuals, training programmes, users, and billing. Typically your head of training or compliance officer.",
          "Instructor: can manage training programmes, assign reading to lessons, review compliance items, and view student progress. Cannot change billing or organisation settings.",
          "Student: can read assigned material, mark acknowledgements, and view their training plan. Cannot access compliance monitoring or settings.",
        ],
      },
      {
        heading: "Sending invitations",
        body: "Invitations are sent by email. The recipient receives a link that creates their account and ties it to your organisation automatically.",
        steps: [
          "Go to Settings → Users.",
          "Click Invite user.",
          "Enter the person's email address.",
          "Select their role from the dropdown.",
          "Click Send invitation.",
        ],
        tip: "You can invite multiple people at once by entering each email address on a new line.",
      },
      {
        heading: "Managing pending invitations",
        body: "Invitations appear in a Pending section until accepted. You can resend or revoke them at any time from the Users tab.",
        tip: "Invitations expire after 7 days. If a team member hasn't accepted, use the Resend link to generate a fresh invite.",
      },
      {
        heading: "Changing a user's role",
        body: "You can change a team member's role at any time without losing their activity history.",
        steps: [
          "Go to Settings → Users.",
          "Find the team member and click the role badge next to their name.",
          "Select a new role from the dropdown.",
          "The change takes effect immediately on their next page load.",
        ],
        warning: "Downgrading an admin to instructor or student will immediately remove their access to settings and billing.",
      },
      {
        heading: "Removing a user",
        body: "Removing a user prevents them from logging in, but preserves their historical activity records (acknowledgements, signoffs) for your audit trail.",
      },
    ],
    relatedSlugs: ["role-based-access", "getting-started", "tracking-acknowledgements"],
  },

  {
    slug: "understanding-your-dashboard",
    title: "Understanding your dashboard",
    description: "A tour of the Flight Lyceum dashboard: what each panel shows, what the numbers mean, and how to use it as your daily compliance starting point.",
    category: "Getting Started",
    categorySlug: "getting-started",
    readingTime: 3,
    intro: "The dashboard is your compliance command centre. It surfaces the most important things happening in your school right now, without requiring you to go looking for them.",
    sections: [
      {
        heading: "The pipeline status card",
        body: "This card shows the current state of the AI monitoring pipeline: when it last ran, how many items it found, and whether any issues need your attention. A green status means the pipeline completed its last run successfully and your monitoring is active.",
        tip: "If you see a warning or error, check that your regulation sources are still configured correctly in Settings → Sources.",
      },
      {
        heading: "Review queue summary",
        body: "The review queue panel shows how many regulation change items are waiting for your review. Items are colour-coded: red means the change is marked critical, yellow means notable, and grey means informational. Clicking the panel takes you directly to the queue.",
      },
      {
        heading: "Compliance timeline",
        body: "The compliance timeline shows upcoming EASA effective dates and any internal deadlines you've set for updating your manuals. It helps you see at a glance whether you're ahead of or behind your obligations.",
      },
      {
        heading: "Training progress",
        body: "The training panel gives you a snapshot of student acknowledgement rates across your active programmes. A number below 80% warrants a closer look: use the drill-down link to see which students haven't completed their assigned reading.",
      },
      {
        heading: "EASA Watch digest",
        body: "The bottom of the dashboard surfaces a rolling digest of recent EASA publications and regulatory news. These items are informational; they don't require action unless the AI pipeline has already created a review item for them.",
      },
      {
        heading: "Customising the dashboard view",
        body: "Admins and instructors see slightly different dashboards based on their role. Admins see billing and user stats; instructors see programme-level training metrics. Students see only their own assigned reading and upcoming deadlines.",
      },
    ],
    relatedSlugs: ["how-regulation-monitoring-works", "getting-started"],
  },

  // ─── Compliance Monitoring ─────────────────────────────────────────────────
  {
    slug: "how-regulation-monitoring-works",
    title: "How regulation monitoring works",
    description: "A clear explanation of the AI monitoring pipeline: what it watches, how it detects changes, and what triggers a review item in your queue.",
    category: "Compliance Monitoring",
    categorySlug: "compliance",
    readingTime: 5,
    intro: "Flight Lyceum's regulation monitoring is built on a three-stage pipeline: ingestion, comparison, and classification. Understanding each stage helps you configure it well and trust its output.",
    sections: [
      {
        heading: "Stage 1: Ingestion",
        body: "The pipeline periodically fetches the latest versions of the EASA documents you've subscribed to: Part-FCL, Part-ORA, AMC/GM documents, and EASA Opinions. It stores each version with a timestamp so changes can be tracked over time.",
        tip: "The default schedule is daily. You can trigger a manual run from the Dashboard or from Settings → Automation.",
      },
      {
        heading: "Stage 2: Change detection",
        body: "Each new document version is compared against the previous version using a semantic diff algorithm. This identifies not just word-for-word edits, but also restructuring, renumbering, and requirement additions that a simple text diff would miss.",
        bullets: [
          "Added or removed regulatory requirements",
          "Changes to acceptable means of compliance (AMC) that affect training content",
          "Effective date changes for existing requirements",
          "New Opinions and Decisions that may affect your ATO certificate",
        ],
      },
      {
        heading: "Stage 3: Classification and impact scoring",
        body: "For each detected change, the AI assesses its likely impact on your organisation based on the specific manuals you've uploaded. It assigns a priority level:",
        bullets: [
          "Critical: a requirement directly referenced in your uploaded manuals has changed. Immediate review recommended.",
          "Notable: a related requirement or AMC has changed. May require manual update.",
          "Informational: a change in scope or area relevant to your school type, but unlikely to require a manual revision.",
        ],
        tip: "The priority classification improves over time as you approve or dismiss items. Each action you take helps the AI understand what your school cares about.",
      },
      {
        heading: "What happens after classification",
        body: "Each classified change becomes a review item in your queue. The item shows you the specific regulatory text that changed, side-by-side with the relevant sections of your uploaded manuals. Your compliance team can then decide whether a manual update is needed.",
      },
      {
        heading: "What the pipeline does not do",
        body: "The pipeline identifies changes and flags likely impact: it does not make compliance decisions on your behalf. Every review item requires a human decision: approve the proposed update, dismiss it, or schedule a review for later. The audit trail records who reviewed each item and when.",
        warning: "Flight Lyceum is a compliance monitoring tool, not a legal compliance guarantee. Always verify critical changes with your accountable manager or legal counsel before updating your manuals.",
      },
    ],
    relatedSlugs: ["reviewing-regulation-changes", "setting-up-easa-sources", "understanding-your-dashboard"],
  },

  {
    slug: "reviewing-regulation-changes",
    title: "Reviewing and approving a regulation change",
    description: "How to work through a review item: reading the diff, assessing impact, approving an AI-generated manual update, or dismissing the item.",
    category: "Compliance Monitoring",
    categorySlug: "compliance",
    readingTime: 5,
    intro: "The review queue is where compliance work happens. Each item represents a regulation change that the AI has assessed as relevant to your school. Here's how to process one efficiently.",
    sections: [
      {
        heading: "Opening a review item",
        body: "Navigate to Review Queue in the sidebar. Each item shows its priority, the EASA document it came from, and the date it was detected. Click any item to open the full review panel.",
      },
      {
        heading: "Reading the regulatory diff",
        body: "The left panel shows the regulation text that changed. Red highlighting indicates deleted text; green indicates additions. You can toggle between a side-by-side view and a unified diff view using the buttons at the top of the panel.",
        tip: "If the diff is very long, use the Jump to changes button to skip directly to the modified passages.",
      },
      {
        heading: "Reviewing the impact assessment",
        body: "The right panel shows which sections of your uploaded manuals the AI believes are affected by this change. Each section is highlighted with the specific passage that may need updating.",
        bullets: [
          "A direct reference means the manual section explicitly cites the changed regulation.",
          "A semantic match means the section covers the same subject matter, even without explicit citation.",
          "A suggested update is a proposed revision that the AI has drafted based on the regulatory change.",
        ],
      },
      {
        heading: "Approving an AI-generated update",
        body: "If you agree with the suggested update, click Approve update. The system will:",
        steps: [
          "Apply the suggested text change to the relevant section of your manual.",
          "Create a new date-stamped version of the manual.",
          "Log your approval with your user ID and timestamp.",
          "Mark the review item as complete.",
        ],
        warning: "Always read the proposed update text carefully before approving. The AI drafts updates based on pattern matching: it may not capture the full intent of a regulatory change in complex cases.",
      },
      {
        heading: "Editing the proposed update before approving",
        body: "If the AI suggestion needs adjustment, click Edit before approving. You can modify the proposed text directly in the editor. Your edited version, not the AI draft, will be applied to the manual.",
      },
      {
        heading: "Dismissing an item",
        body: "If a review item is not relevant to your school (e.g. it relates to an aircraft type you don't operate), click Dismiss and confirm that no manual change is required. Add or keep the dismissal reason for your audit trail. Dismissed items are archived and can be reviewed later.",
      },
      {
        heading: "Deferring for later",
        body: "If you need more information before deciding, click Defer. You can add a note and set a reminder date. Deferred items appear in a separate view and are not counted as outstanding review items.",
      },
    ],
    relatedSlugs: ["how-regulation-monitoring-works", "creating-manual-versions", "uploading-manuals"],
  },

  {
    slug: "setting-up-easa-sources",
    title: "Setting up your EASA regulation sources",
    description: "How to choose which EASA publications to monitor, add custom RSS feeds, and configure how frequently the pipeline runs.",
    category: "Compliance Monitoring",
    categorySlug: "compliance",
    readingTime: 3,
    intro: "Flight Lyceum monitors only the sources you subscribe to. This keeps your review queue relevant and prevents noise from regulations that don't apply to your ATO.",
    sections: [
      {
        heading: "Available source types",
        body: "Flight Lyceum currently supports the following official EASA publication types:",
        bullets: [
          "Part-FCL: Flight crew licensing requirements",
          "Part-ORA: Organisation requirements for ATOs",
          "AMC/GM publications: Acceptable Means of Compliance and Guidance Material",
          "EASA Opinions and Decisions: proposed rule changes and final decisions",
          "Air Operations (Part-ORO/CAT/SPA): relevant for ATOs operating aircraft commercially",
          "EASA Safety Information Bulletins: non-regulatory but operationally relevant",
        ],
      },
      {
        heading: "Enabling and disabling sources",
        body: "Go to Settings → Sources. Each source type has a toggle. Enable only the sources relevant to your school's scope and aircraft types.",
        tip: "If you're unsure which sources to enable, start with Part-FCL and Part-ORA: these cover the core requirements for most PPL/CPL/IR ATOs.",
        steps: [
          "Navigate to Settings → Sources.",
          "Toggle each source type on or off.",
          "Click Save changes.",
          "Optionally, click Run now to immediately fetch the current version of all enabled sources.",
        ],
      },
      {
        heading: "Adding custom RSS feeds",
        body: "In addition to built-in EASA sources, you can add any RSS or Atom feed: national CAA publications, your country's transposition notices, or industry news sources.",
        steps: [
          "In Settings → Sources, scroll to Custom feeds.",
          "Click Add feed.",
          "Paste the feed URL.",
          "Give it a descriptive label (e.g. 'UK CAA Regulatory Updates').",
          "Click Test connection to verify the feed is reachable.",
          "Save and enable the feed.",
        ],
        warning: "Custom feeds are parsed as informational only: the AI does not automatically compare them against your manuals. Use them to stay aware of upcoming changes without creating review queue noise.",
      },
      {
        heading: "Configuring the pipeline schedule",
        body: "By default, the monitoring pipeline runs daily at 04:00 UTC. You can change this to twice-daily or weekly in Settings → Automation.",
        tip: "More frequent runs mean faster detection of changes. For most ATOs, daily is sufficient: EASA rarely publishes updates more frequently than that.",
      },
    ],
    relatedSlugs: ["how-regulation-monitoring-works", "reviewing-regulation-changes"],
  },

  // ─── Flight Books & Manuals ─────────────────────────────────────────────────
  {
    slug: "uploading-manuals",
    title: "Uploading and indexing your manuals",
    description: "A complete guide to uploading your Operations Manual, Training Manual, or any other flight book: including supported formats, size limits, and indexing tips.",
    category: "Flight Books & Manuals",
    categorySlug: "flight-books",
    readingTime: 4,
    intro: "Flight Lyceum can work with almost any document format your school uses. The key step is getting your manuals uploaded and indexed so the AI can compare them against regulation changes.",
    sections: [
      {
        heading: "Supported formats",
        body: "The following file formats are supported for upload:",
        bullets: [
          "PDF: the most common format for flight school manuals. Text is extracted automatically; scanned documents may have reduced accuracy.",
          "DOCX: Microsoft Word documents. Text is extracted automatically and indexed using the same section detection flow.",
          "Markdown (.md): ideal for version-controlled documentation. Headings become section titles automatically.",
          "Plain text (.txt): works well for simpler documents.",
          "JSON: structured data format supported for integration with other document management systems.",
        ],
        tip: "PDF and DOCX are recommended for most schools. If your manual is stored in Pages format, export it as PDF or DOCX before uploading.",
      },
      {
        heading: "Upload size limits",
        body: "Individual files can be up to 50 MB. For very large manuals (over 500 pages), consider splitting the document by chapter or volume before uploading: this improves indexing accuracy and makes section references more precise.",
      },
      {
        heading: "Uploading a manual",
        body: "You can upload manuals from the Flight Books section of the app.",
        steps: [
          "Navigate to Flight Books in the sidebar.",
          "Click Upload flight book.",
          "Select your file or drag and drop it onto the upload area.",
          "Enter a title, document type (e.g. Operations Manual), and optional version number.",
          "Click Upload.",
          "Wait for the indexing pipeline to complete: a progress indicator will appear.",
        ],
      },
      {
        heading: "How indexing works",
        body: "After upload, the system parses your document into sections. For PDFs and DOCX files, section boundaries are detected from headings and numbered paragraphs. For Markdown, headings (##, ###) define sections directly.",
        tip: "A well-structured PDF with clear heading hierarchy will produce more accurate section mapping. If your manual uses continuous paragraph numbering (e.g. 3.2.1), make sure those are formatted as headings rather than inline bold text.",
      },
      {
        heading: "Managing uploaded manuals",
        body: "All uploaded manuals appear in the Flight Books browser. You can view each manual's sections, download the original file, create a new version, or delete an outdated document.",
        warning: "Deleting a manual is permanent. If you're replacing an old version, use Create new version instead: this preserves the history.",
      },
    ],
    relatedSlugs: ["manual-section-mapping", "creating-manual-versions", "reviewing-regulation-changes"],
  },

  {
    slug: "manual-section-mapping",
    title: "How manual sections are mapped to regulations",
    description: "Understanding how Flight Lyceum links your manual sections to specific EASA regulations, and how to improve that mapping for more accurate impact assessments.",
    category: "Flight Books & Manuals",
    categorySlug: "flight-books",
    readingTime: 4,
    intro: "The accuracy of regulation change impact assessments depends on how well your manual sections are mapped to the underlying regulations. Flight Lyceum does this automatically using semantic embeddings, but you can improve it manually.",
    sections: [
      {
        heading: "How automatic mapping works",
        body: "When your manual is indexed, each section is converted into a vector embedding: a mathematical representation of its meaning. These embeddings are compared against the embeddings of each regulation to find semantically similar passages.",
        tip: "This approach catches regulatory references that aren't explicit citations. For example, a section titled 'Pre-flight checks' will be linked to relevant Part-FCL requirements even if it doesn't mention 'FCL.050' by name.",
      },
      {
        heading: "Viewing section mappings",
        body: "You can view the regulatory mappings for any manual section from the Flight Books browser.",
        steps: [
          "Open a flight book.",
          "Click on any section.",
          "Scroll to the Regulatory references panel on the right.",
          "The panel lists every regulation that the section is mapped to, with a confidence score.",
        ],
      },
      {
        heading: "Adding explicit regulation citations",
        body: "The most reliable way to improve mapping accuracy is to add explicit regulation references within your manual text. Citations in the format 'FCL.050', 'ORA.ATO.100', or 'AMC1 FCL.050' are automatically detected and create a direct mapping: stronger than a semantic match.",
        tip: "Many EASA-compliant ATOs already include regulation citations in their manuals. If yours doesn't, adding them is good compliance practice regardless of Flight Lyceum.",
      },
      {
        heading: "Correcting a mismatched section",
        body: "If a section appears to be mapped to an irrelevant regulation, you can remove the mapping manually.",
        steps: [
          "Open the section detail view.",
          "Click the X next to the incorrect regulation mapping.",
          "Confirm the removal.",
          "The correction is saved and used when future changes to that regulation are assessed.",
        ],
      },
      {
        heading: "Sections with no mappings",
        body: "Some sections (administrative front matter, definitions, list of amendments) may have no regulation mappings. This is expected. These sections will not generate review queue items when regulations change.",
      },
    ],
    relatedSlugs: ["uploading-manuals", "reviewing-regulation-changes", "creating-manual-versions"],
  },

  {
    slug: "creating-manual-versions",
    title: "Creating a new manual version after a compliance update",
    description: "How to create a date-stamped new version of your manual after approving a compliance change, manage the version history, and download or export updated documents.",
    category: "Flight Books & Manuals",
    categorySlug: "flight-books",
    readingTime: 3,
    intro: "Every approved compliance change creates an auditable trail. Flight Lyceum automatically versions your manuals so you always have a clear record of what changed, when, and who approved it.",
    sections: [
      {
        heading: "Versions created automatically",
        body: "When you approve an AI-generated update from the review queue, Flight Lyceum automatically creates a new version of the affected manual with the approved changes applied. You don't need to manually trigger this: it happens as part of the approval workflow.",
      },
      {
        heading: "Creating a manual version manually",
        body: "You can also create a new version at any time to record a manual revision that you made outside the system.",
        steps: [
          "Open the manual in Flight Books.",
          "Click the version history icon (clock icon) in the top right.",
          "Click Save current version.",
          "Enter a version label (e.g. 'Rev 4.3') and optional change notes.",
          "Click Save.",
        ],
        tip: "Version labels are searchable, so use a consistent naming convention: the ISO date format (YYYY-MM-DD) or your school's existing revision numbering works well.",
      },
      {
        heading: "Viewing version history",
        body: "Every manual has a complete version history accessible from its detail view. You can see the change log for each version, who approved it, and compare any two versions side-by-side.",
      },
      {
        heading: "Downloading a specific version",
        body: "You can download any version of a manual: not just the current one. This is useful when you need to provide a specific revision to an authority or auditor.",
        steps: [
          "Open the manual's version history.",
          "Find the version you need.",
          "Click Download PDF next to that version.",
        ],
      },
      {
        heading: "Rolling back to a previous version",
        body: "If an approved change needs to be reversed, you can roll back the manual to any previous version.",
        steps: [
          "Open the manual's version history.",
          "Click the version you want to restore.",
          "Click Restore this version.",
          "Confirm the rollback: this creates a new version that is identical to the selected one.",
        ],
        warning: "Rolling back doesn't delete the intervening versions: they remain in the history. The rollback itself is recorded as a new version entry.",
      },
    ],
    relatedSlugs: ["uploading-manuals", "reviewing-regulation-changes", "exporting-data"],
  },

  // ─── Training Management ───────────────────────────────────────────────────
  {
    slug: "creating-training-programmes",
    title: "Creating a training programme",
    description: "How to set up a structured training programme with phases and lessons, assign it to students, and configure the reading required at each stage.",
    category: "Training Management",
    categorySlug: "training",
    readingTime: 4,
    intro: "Training programmes in Flight Lyceum mirror the structure you'd find in your Training Manual: a programme contains phases, phases contain lessons, and each lesson can have assigned reading from your manuals. Here's how to build one.",
    sections: [
      {
        heading: "Programme structure",
        body: "Before creating a programme in the app, it helps to understand the hierarchy:",
        bullets: [
          "Programme: the top-level container (e.g. PPL(A) Integrated Course).",
          "Phase: a grouping of lessons within a programme (e.g. Phase 1: Pre-Solo, Phase 2: Cross Country).",
          "Lesson: an individual training event with defined objectives and reading requirements.",
        ],
      },
      {
        heading: "Creating a programme",
        body: "Programmes are created from the Training section of the sidebar.",
        steps: [
          "Go to Training → Programmes.",
          "Click New programme.",
          "Enter a programme name, description, and optional aircraft type.",
          "Click Create.",
        ],
      },
      {
        heading: "Adding phases",
        body: "Once your programme exists, add phases to organise your lessons.",
        steps: [
          "Open the programme.",
          "Click Add phase.",
          "Name the phase and add a brief description.",
          "Click Save phase.",
          "Repeat for each phase in your syllabus.",
        ],
        tip: "Keep phase names consistent with your Training Manual chapter headings. This makes it easier to cross-reference during audits.",
      },
      {
        heading: "Adding lessons to a phase",
        body: "Each phase can contain as many lessons as your syllabus requires.",
        steps: [
          "Open a phase.",
          "Click Add lesson.",
          "Enter the lesson title, objectives, and minimum hours (if applicable).",
          "Under Reading assignments, link relevant sections from your manuals.",
          "Click Save lesson.",
        ],
      },
      {
        heading: "Assigning the programme to students",
        body: "Once your programme is set up, you can assign it to one or more students.",
        steps: [
          "Open the programme.",
          "Click Assign students.",
          "Select the students to enrol.",
          "Set a start date.",
          "Click Assign.",
        ],
        tip: "Students receive a notification when they're enrolled. Their dashboard will immediately show their assigned reading and upcoming lessons.",
      },
    ],
    relatedSlugs: ["assigning-reading-to-lessons", "tracking-acknowledgements", "inviting-your-team"],
  },

  {
    slug: "assigning-reading-to-lessons",
    title: "Assigning reading to lessons",
    description: "How to link manual sections to specific training lessons so students know exactly what to read before each flight, and how those assignments update when manuals are revised.",
    category: "Training Management",
    categorySlug: "training",
    readingTime: 3,
    intro: "One of Flight Lyceum's most useful features is linking specific manual sections to lessons: not just 'read Chapter 4', but precisely the paragraphs each student needs for that lesson. Here's how to configure it.",
    sections: [
      {
        heading: "Assigning sections to a lesson",
        body: "Reading assignments are added from the lesson detail view.",
        steps: [
          "Navigate to Training → Programmes → [Programme] → [Phase] → [Lesson].",
          "Click Add reading assignment.",
          "Use the document browser to select the relevant flight book.",
          "Browse or search for the specific section.",
          "Click Assign section.",
          "Repeat for every section required for that lesson.",
        ],
        tip: "You can assign sections from multiple manuals to the same lesson. For example, a lesson on radio procedures might draw from both the Operations Manual and the Communications chapter of the Training Manual.",
      },
      {
        heading: "Setting read-before or read-after",
        body: "Each assignment can be tagged as pre-lesson reading (before the flight) or post-lesson reading (debriefing and consolidation). Students see this clearly in their reading list.",
      },
      {
        heading: "What students see",
        body: "When a student opens their training view, they see a list of upcoming lessons and the reading assigned to each one. Sections they've acknowledged are marked with a green checkmark. Outstanding reading is highlighted.",
      },
      {
        heading: "When a manual section is updated",
        body: "If you approve a compliance update that modifies a section assigned to lessons, Flight Lyceum automatically updates the assignment to reference the new version of that section. Students who have already acknowledged the old version are flagged for re-acknowledgement.",
        tip: "You can review which students need to re-acknowledge after a manual update from the Acknowledgements view in Training.",
        warning: "Re-acknowledgement requests are not sent automatically. Go to Training → Acknowledgements and use the Send reminder button to notify affected students.",
      },
    ],
    relatedSlugs: ["creating-training-programmes", "tracking-acknowledgements", "creating-manual-versions"],
  },

  {
    slug: "tracking-acknowledgements",
    title: "Tracking student acknowledgements",
    description: "How to view acknowledgement status for each student, send reminders, export acknowledgement records for audits, and understand what the audit trail captures.",
    category: "Training Management",
    categorySlug: "training",
    readingTime: 3,
    intro: "The acknowledgement system gives you the documented evidence that each student has read the required material: a key requirement for EASA ATO audits. Here's how to use it effectively.",
    sections: [
      {
        heading: "What is an acknowledgement?",
        body: "When a student marks a section as read, the system records:",
        bullets: [
          "Their user ID and name.",
          "The exact section of the manual they acknowledged (title, version, page range).",
          "The date and time of acknowledgement.",
          "The device type used (desktop or mobile).",
        ],
        tip: "This creates an immutable audit record. Even if you later update the manual, the acknowledgement record permanently references the version that was current when the student read it.",
      },
      {
        heading: "Viewing acknowledgement status",
        body: "The full acknowledgement overview is at Training → Acknowledgements. You can filter by programme, phase, lesson, or individual student.",
        steps: [
          "Go to Training → Acknowledgements.",
          "Use the Programme and Student dropdowns to filter the view.",
          "Green rows indicate complete acknowledgement; yellow indicates partial; red indicates no acknowledgement.",
        ],
      },
      {
        heading: "Sending reminders",
        body: "Students who haven't completed their assigned reading can be nudged with an in-app notification.",
        steps: [
          "Filter the acknowledgement view to show outstanding items.",
          "Select the students you want to remind.",
          "Click Send reminder.",
          "Students receive a notification on their next login (or immediately if they're logged in).",
        ],
      },
      {
        heading: "Exporting acknowledgement records",
        body: "For audits, you can export a complete acknowledgement report as a CSV or PDF.",
        steps: [
          "Go to Training → Acknowledgements.",
          "Set the filters to the scope you need (e.g. all students in a specific programme).",
          "Click Export.",
          "Choose CSV (for spreadsheet analysis) or PDF (for printing or filing).",
        ],
      },
      {
        heading: "Instructor sign-offs",
        body: "Beyond student self-acknowledgement, instructors can record a sign-off confirming they witnessed or verified a student's understanding of a section. Sign-offs appear as a separate column in the acknowledgement export.",
      },
    ],
    relatedSlugs: ["assigning-reading-to-lessons", "creating-training-programmes", "exporting-data"],
  },

  // ─── Account & Billing ──────────────────────────────────────────────────────
  {
    slug: "managing-billing",
    title: "Managing billing and your subscription",
    description: "How to view your current plan, add student packs, update payment details, and understand what happens at the end of your trial or when you cancel.",
    category: "Account & Billing",
    categorySlug: "account-billing",
    readingTime: 3,
    intro: "All billing in Flight Lyceum is handled through Stripe. You can manage everything: plan changes, payment details, invoices, directly from Settings → Billing.",
    sections: [
      {
        heading: "Viewing your current plan",
        body: "Go to Settings → Billing to see your active plan, the number of included and active students, your next billing date, and a link to your invoice history.",
      },
      {
        heading: "The base plan and student packs",
        body: "The Flight Lyceum subscription includes a base of 50 students. Additional students are available in packs of 10 at a fixed monthly cost. You can add or remove packs at any time.",
        steps: [
          "Go to Settings → Billing.",
          "Under Student capacity, click Manage packs.",
          "Use the + and – buttons to adjust your pack count.",
          "Click Confirm. Changes take effect immediately; billing is prorated.",
        ],
        tip: "Student packs are prorated to the day. If you add a pack mid-month, you'll only be charged for the remaining days in the current billing cycle.",
      },
      {
        heading: "Updating payment details",
        body: "Click Update payment method in Settings → Billing. You'll be redirected to a secure Stripe page to update your card details. Once saved, you're returned to the app automatically.",
      },
      {
        heading: "Downloading invoices",
        body: "All invoices are available in Settings → Billing → Invoice history. Each invoice can be downloaded as a PDF for your accounting records.",
      },
      {
        heading: "What happens when your trial ends",
        body: "Your trial lasts 30 days from the date you registered. On day 31, your card is charged for the first month. If no card is on file, your account is paused: your data is preserved, but logins are blocked until a payment method is added.",
      },
      {
        heading: "Cancelling your subscription",
        body: "You can cancel at any time from Settings → Billing → Cancel subscription. Your access continues until the end of the current billing period. Data is retained for 30 days after cancellation, after which it is permanently deleted.",
        warning: "Before cancelling, export any acknowledgement records, manual versions, or training data you need to keep. The 30-day retention window cannot be extended.",
      },
    ],
    relatedSlugs: ["role-based-access", "exporting-data"],
  },

  {
    slug: "role-based-access",
    title: "Role-based access: admin, instructor, student",
    description: "A detailed breakdown of what each role can see and do in Flight Lyceum, including which settings are admin-only and how student access is scoped.",
    category: "Account & Billing",
    categorySlug: "account-billing",
    readingTime: 3,
    intro: "Flight Lyceum uses three roles to ensure each person sees exactly what they need: no more, no less. Here's a full breakdown of permissions by role.",
    sections: [
      {
        heading: "Admin",
        body: "Admins have full access to the organisation. Typically your Head of Training, Chief Flying Instructor, or Compliance Officer.",
        bullets: [
          "All compliance monitoring features: pipeline, review queue, regulation sources.",
          "All flight book features: upload, index, create versions, export.",
          "All training management features: programmes, lessons, assignments, acknowledgements, signoffs.",
          "Organisation settings: branding, custom sources, automation schedule.",
          "User management: invite, change roles, remove users.",
          "Billing: view plan, add student packs, update payment, cancel subscription.",
        ],
      },
      {
        heading: "Instructor",
        body: "Instructors can manage training and review compliance but cannot change organisation settings or billing.",
        bullets: [
          "View and process items in the compliance review queue (but not approve major manual updates: admin approval is required for those).",
          "View flight books and section content.",
          "Create and edit training programmes, phases, and lessons.",
          "Assign reading to lessons.",
          "View and export acknowledgement records.",
          "Record instructor sign-offs.",
          "Send student reminders.",
        ],
      },
      {
        heading: "Student",
        body: "Students have a read-only view scoped to their own training assignments.",
        bullets: [
          "View assigned reading for each lesson.",
          "Read manual sections assigned to their lessons.",
          "Mark sections as acknowledged.",
          "View their own acknowledgement history.",
          "View their training programme and lesson schedule.",
        ],
        tip: "Students cannot see other students' data, compliance monitoring, or any settings. Their interface is intentionally simplified to show only what's relevant to them.",
      },
      {
        heading: "Changing a user's role",
        body: "Admins can change any team member's role at any time from Settings → Users. Role changes take effect immediately.",
        warning: "Reducing an admin to instructor or student removes their access to settings and billing immediately. Make sure at least one other admin account exists before doing this.",
      },
    ],
    relatedSlugs: ["inviting-your-team", "managing-billing"],
  },

  {
    slug: "exporting-data",
    title: "Exporting data and audit reports",
    description: "How to export acknowledgement records, manual versions, compliance history, and other data for audits, quality reviews, or migration to another system.",
    category: "Account & Billing",
    categorySlug: "account-billing",
    readingTime: 3,
    intro: "Flight Lyceum stores a complete audit trail of every compliance decision and student acknowledgement. Here's how to extract that data in formats suitable for regulators, auditors, and your own quality management system.",
    sections: [
      {
        heading: "Acknowledgement records",
        body: "The most commonly requested export for EASA audits is the student acknowledgement log.",
        steps: [
          "Go to Training → Acknowledgements.",
          "Filter by programme, student, or date range as required.",
          "Click Export.",
          "Select PDF (formatted report) or CSV (raw data for spreadsheet analysis).",
          "The export includes: student name, section title, manual version, acknowledgement date, and instructor sign-off if applicable.",
        ],
      },
      {
        heading: "Manual version history",
        body: "Every version of every uploaded manual is stored and can be downloaded.",
        steps: [
          "Open the manual in Flight Books.",
          "Click the version history icon.",
          "Select the version you need.",
          "Click Download PDF.",
        ],
        tip: "Keep a record of which manual revision was current on the date of each student's first solo or type rating check: this is commonly requested during EASA ATO oversight visits.",
      },
      {
        heading: "Compliance review history",
        body: "The full log of reviewed, approved, dismissed, and deferred regulation changes is exportable from the Changes section.",
        steps: [
          "Go to Changes in the sidebar.",
          "Set the date range filter.",
          "Click Export compliance log.",
          "The export includes: regulation reference, change summary, review decision, reviewer name, and date.",
        ],
      },
      {
        heading: "Full data export",
        body: "Admins can request a complete export of all organisation data from Settings → Data Export. This includes all manuals, training data, compliance records, and user activity. The export is prepared as a ZIP archive and emailed to your admin address within one hour.",
        warning: "Full data exports are available once per 24-hour period and are limited to the account admin. The archive contains personally identifiable information: handle it in accordance with your privacy policy.",
      },
    ],
    relatedSlugs: ["tracking-acknowledgements", "creating-manual-versions", "managing-billing"],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getArticlesByCategory(categorySlug: string): Article[] {
  return ARTICLES.filter((a) => a.categorySlug === categorySlug);
}

export function getRelatedArticles(article: Article): Article[] {
  if (!article.relatedSlugs) return [];
  return article.relatedSlugs
    .map((slug) => getArticleBySlug(slug))
    .filter((a): a is Article => !!a);
}
