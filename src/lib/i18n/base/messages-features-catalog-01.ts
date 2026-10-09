export const m_messages_features_catalog_01 = {
      "accessControl": {
        "title": "Role-based access control",
        "summary": "The app now has a structured role and permission foundation for members, moderators, admins, and future staff tools.",
        "workflow": [
          "Create or load a profile with its assigned app role.",
          "Resolve the effective permissions from the base role plus any explicit overrides.",
          "Use those permissions in policies and future UI guards to decide what the user can do."
        ],
        "details": [
          "Roles are modeled separately from permissions so the system can stay flexible as the app grows.",
          "The database includes enum-backed roles and permissions for stronger consistency.",
          "This foundation supports future moderation, admin, and marketplace controls without hardcoding one-off checks everywhere."
        ]
      },
      "adminUsers": {
        "title": "Manage users and roles",
        "summary": "Use the admin Users page to review members, assign roles, and set person-by-person access overrides with autosave.",
        "workflow": [
          "Open Settings and move into the Admin area.",
          "Open Users to review the current member list.",
          "Create a user, choose a role, or open Manage access for an existing person.",
          "Pause briefly after changing an override and let the page save it automatically."
        ],
        "details": [
          "The Users page lists the current profile records in the app.",
          "Admins can create new users without leaving the current admin session.",
          "Admins can change another person's role directly from the role selector.",
          "Each user can also have permission overrides that inherit, allow, or deny specific capabilities beyond the base role.",
          "Override changes now autosave, and the manual save button only appears if recovery is needed after a failed save.",
          "The current admin cannot demote their own account or change their own overrides from this screen to avoid accidental lockout."
        ]
      },
      "adminRoles": {
        "title": "Review role groups",
        "summary": "Use the Roles page to understand the role catalog before you edit the live permission matrix.",
        "workflow": [
          "Open Settings and move into the Admin area.",
          "Open Roles to review the current role groups.",
          "Open Permissions when you are ready to change what each role can access."
        ],
        "details": [
          "The Roles page gives admins a cleaner overview of the current user groups.",
          "Each role card shows the current permission count and a short description of the role's scope.",
          "This keeps the role overview separate from the detailed permission matrix."
        ]
      },
      "adminPermissions": {
        "title": "Edit the permission matrix",
        "summary": "Use the Permissions page to review and directly toggle what each role can do across the app.",
        "workflow": [
          "Open Settings and enter the Admin area.",
          "Open Permissions to inspect each role and its default access.",
          "Use the matrix to enable or disable section, page, and functionality permissions for any role."
        ],
        "details": [
          "The page summarizes each role and shows the full permission matrix in one place.",
          "Permissions are grouped by section, page, and functionality so the access model is easier to understand.",
          "Admins can toggle permissions directly in the matrix, while the reserved system role stays read-only."
        ]
      },
      "governancePolicies": {
        "title": "Manage governance policy controls",
        "summary": "Use the Governance admin page to tune policy parameters and run immediate monetary guardrail simulations.",
        "workflow": [
          "Open Settings and move into Administration.",
          "Open Governance to review policy values.",
          "Adjust control inputs, inspect simulation outputs, and save the policy profile."
        ],
        "details": [
          "Governance controls map directly to the foundational monetary policy formula.",
          "The page surfaces guardrail status so policy operators can react early.",
          "Saved policy values persist locally for iterative governance sessions."
        ]
      },
      "adminSystemModules": {
        "title": "Review internal system modules",
        "summary": "Use the System Modules page to inspect internal workflows, role tooling, and implementation-level capability surfaces.",
        "workflow": [
          "Open Settings and move into Administration.",
          "Open System Modules.",
          "Filter by section and page to inspect specific modules quickly."
        ],
        "details": [
          "This page is intentionally admin-facing and separate from the citizen Study experience.",
          "It helps staff and agents align on current workflows before changing behavior.",
          "Module documentation should remain updated as product behavior changes."
        ]
      },
      "autosaveDefaults": {
        "title": "Autosave by default",
        "summary": "Editable pages use autosave as the standard pattern, and manual save buttons only appear when autosave needs a recovery path.",
        "workflow": [
          "Open an editable page and change one or more values.",
          "Pause briefly or finish the local edit action and let the page save automatically.",
          "Use a visible save button only if the page reports that autosave failed."
        ],
        "details": [
          "Autosave is now the expected default for editable experiences across the app.",
          "Fallback save buttons are recovery controls rather than the main workflow.",
          "New product work should follow this pattern unless there is a strong reason to behave differently."
        ]
      },
      "contributionHub": {
        "title": "Open the contribute hub",
        "summary": "Use Contribute as the gateway for volunteering, professional skills, financial interest, community projects, and related participation paths.",
        "workflow": [
          "Open Contribute from the bottom navigation.",
          "Choose how you want to contribute — volunteer, skills, funding interest, organization partnership, community, knowledge, or impact.",
          "Follow the linked flow or placeholder path for that contribution lane."
        ],
        "details": [
          "Contribute is the participation engine for Civizen, not a shortcut to Profile, Messaging, or Score.",
          "Endorsement stays on Search and user profiles.",
          "Financial paths remain inquiry-only until an authorized funding portal is available."
        ]
      },
      "homeAppDownload": {
        "title": "Download the Android app from Home",
        "summary": "Home includes a visible app-download card with a direct APK link and a QR code for phone installation.",
        "workflow": [
          "Open Home and find the download card below the quick actions.",
          "Tap the download button or scan the QR code from another device.",
          "Install the Android test build on your phone."
        ],
        "details": [
          "The card keeps the Android test build visible without making users hunt through auth screens or hidden links.",
          "The QR code points directly to the current APK so desktop users can move smoothly to mobile testing."
        ]
      },
      "trustFeed": {
        "title": "Share trust feed posts",
        "summary": "Post updates from the Home page so your latest thoughts and activity stay visible in the community feed.",
        "workflow": [
          "Open Home and move to the post composer below your score card.",
          "Write a short update in the message box and watch it expand as needed.",
          "Press Post to publish the update into the feed."
        ],
        "details": [
          "New posts appear in the feed and push older posts downward.",
          "The composer activates visually when text is entered.",
          "Posts are designed to support likes, comments, and scrolling through the feed."
        ]
      },
      "profilePageMenu": {
        "title": "Open pages from the profile menu",
        "summary": "Use the top-right profile picture on Home to open a compact list of every page your account can currently access.",
        "workflow": [
          "Open Home and move to the profile picture in the top-right corner.",
          "Hover over it on desktop or tap it on touch devices to open the page list.",
          "Choose any listed page to jump there directly."
        ],
        "details": [
          "The menu lists real navigable pages instead of abstract features.",
          "Admin pages only appear when the signed-in user has the required permissions.",
          "The current page is highlighted so people can stay oriented while navigating."
        ]
      },
      "messaging": {
        "title": "Join the messaging stream",
        "summary": "Use the Messaging page to send short messages, join calls, and keep the shared conversation moving.",
        "workflow": [
          "Open Messaging from the bottom navigation or your page list.",
          "Type a message and submit it to the shared stream.",
          "Review the ongoing conversation as new messages appear."
        ],
        "details": [
          "Messaging is available as a lightweight shared communication surface.",
          "The experience is intended for quick updates rather than long-form posts.",
          "It lives on its own route so it stays one tap away from Home, Study, Market, and Settings."
        ]
      },
      "scoreSnapshot": {
        "title": "Review your score snapshot",
        "summary": "See your current Civizen score, endorsements, and trust signal summary at a glance.",
        "workflow": [
          "Open Home or Profile to see your current Civizen score.",
          "Review your endorsement totals and score-related context.",
          "Use the details link to move deeper into your profile view."
        ],
        "details": [
          "The score card summarizes your current trust position.",
          "It highlights how many endorsements currently support your profile.",
          "The component is designed as a quick entry point into your deeper identity view."
        ]
      },
      "happinessFoundation": {
        "title": "Happiness & Fulfillment",
        "summary": "A private way to notice how life is going, what is affecting it, and what might help — without a public Happiness Score.",
        "workflow": [
          "Open Happiness & Fulfillment from the Profile menu.",
          "Complete a short check-in or a fuller wellbeing review.",
          "See which life areas are going well and which need attention.",
          "Choose one area to improve, or start a Fulfillment Plan and later say whether it helped."
        ],
        "details": [
          "The public result uses five levels: Struggling, Unsettled, Balanced, Flourishing, and Thriving.",
          "These are states, not identities. Happiness data is private by default.",
          "It is not used for Civizen Score, reputation, hiring, or governance power.",
          "Work Fulfillment is a distinct part of the Happiness Profile.",
          "Fulfillment Plans live under Improve. Work issues open Work Fulfillment. Actual jobs use Marketplace Jobs."
        ]
      },
      "workFulfillment": {
        "title": "Work Fulfillment",
        "summary": "A distinct subunit for how work actually feels, kept separate from the broader Happiness Profile.",
        "workflow": [
          "Open Happiness & Fulfillment, then Work Fulfillment.",
          "See the current Work Fulfillment life-area state.",
          "Improve current work first. Use Contribute to try work, Study to learn, and Marketplace Jobs when seeking actual employment."
        ],
        "details": [
          "Current work, Work Joy, Fit, and improve-current-work are the live Work Fulfillment path.",
          "Work Joy Monitor, Fit, and improve-current-work are live. Marketplace Jobs is the employment destination.",
          "Low work fulfillment does not automatically recommend a career change."
        ]
      },
      "fulfillmentPlans": {
        "title": "Fulfillment Plans",
        "summary": "A private, longer-running plan for one life area — understand, try, follow up, and adapt.",
        "workflow": [
          "Open Happiness & Fulfillment, then Improve.",
          "Choose an area, say what better would look like, and pick a small next step.",
          "Record whether it helped, then continue, pause, or complete the plan."
        ],
        "details": [
          "Plans are owner-only. They are not Score, hiring, or public ranking.",
          "Work Fulfillment stays the specialized workspace. Marketplace Jobs is for actual employment.",
          "There is no numeric Fulfillment or Job Fit score."
        ]
      },
      "wellbeingAggregatePrivacy": {
        "title": "Privacy-protected group insights",
        "summary": "Optional participation in privacy-protected group insights. Individual Happiness stays private.",
        "workflow": [
          "Open Happiness & Fulfillment, then Privacy.",
          "Read that individual Happiness remains private.",
          "Turn privacy-protected group insights on or off. Off is the default."
        ],
        "details": [
          "Participation is separate from Job Fit sharing, public profile, employer access, and Civi.",
          "Group insights are only produced when enough participating members are included.",
          "There is no employer dashboard of individual Happiness."
        ]
      },
      "directorySearch": {
        "title": "Search people quickly",
        "summary": "Look up people by name or username so you can discover profiles worth viewing or endorsing.",
        "workflow": [
          "Open the Search page from Home.",
          "Type a name or username into the search field.",
          "Review the matching profiles and open one that looks relevant."
        ],
        "details": [
          "Search is intended for discovery across the app’s user base.",
          "It helps users move quickly from browsing to profile review.",
          "Search supports the endorsement flow by making people easy to find."
        ]
      },
      "publicProfiles": {
        "title": "Open public profiles",
        "summary": "Visit profile pages to understand someone’s trust profile, pillars, and endorsement history.",
        "workflow": [
          "Open a profile from search, feed activity, or endorsement flow.",
          "Review the score, pillar breakdown, and endorsement context.",
          "Decide whether to endorse, follow up, or simply learn more about the person."
        ],
        "details": [
          "Profiles centralize a person’s trust and contribution information.",
          "They surface pillar context and endorsement history in one place.",
          "Profiles support both self-understanding and community evaluation."
        ]
      },
      "endorsements": {
        "title": "Send endorsements",
        "summary": "Recognize people across the five pillars with ratings and optional comments that add meaningful context.",
        "workflow": [
          "Open Endorse and choose a person to recognize.",
          "Select the relevant pillar and assign a rating.",
          "Optionally add a comment, then submit the endorsement."
        ],
        "details": [
          "Endorsements are organized around the app’s five-pillar model.",
          "Comments add qualitative context to a rating.",
          "The flow is designed to encourage thoughtful recognition instead of one-tap reactions."
        ]
      },
      "featureExplorer": {
        "title": "Explore modules by area",
        "summary": "Use this System Modules page to browse internal app surfaces and filter them by section or page.",
        "workflow": [
          "Open Settings and move into Administration.",
          "Open System Modules.",
          "Use the Sections and Pages filters to narrow the catalog.",
          "Read each feature card to understand workflows and detailed behavior."
        ],
        "details": [
          "The System Modules page is the internal product reference surface.",
          "It is meant to help moderators, admins, and agents understand what exists today.",
          "It should stay aligned with product changes as the source of truth evolves."
        ]
      },
      "studyNestedHub": {
        "title": "Study hub with nested sections",
        "summary": "Study is organized into dedicated routes under `/study`: the Civic Learning Center, the learning paths and the materials.",
        "workflow": [
          "Open Study from the bottom navigation.",
          "Use the section tabs to switch between Civic Learning Center, Learning paths and Materials.",
          "Deep links such as `/study/paths` keep bookmarks and support links stable."
        ],
        "details": [
          "The default Study index remains the Civic Learning Center experience.",
          "Each section can evolve independently without turning a single page into a catch-all.",
          "Mobile navigation highlights Study whenever any `/study` child route is active."
        ]
      },
      "studyCoursesLearnerTracks": {
        "title": "Courses with learner tracks",
        "summary": "Courses are grouped for school students, university students, and self-paced citizens, each linking forward to schedules, materials, and tests.",
        "workflow": [
          "Open Study and move to the Courses tab.",
          "Choose School, University, or General to see the starter catalog for that track.",
          "Open Schedule, Materials, or Tests from a course card to follow the guided path."
        ],
        "details": [
          "Tracks are a presentation layer; the same civic core can be tuned for different reading depth.",
          "Course metadata references material keys and test ids for future automation.",
          "Interactive tests are stubbed until the assessment engine ships."
        ]
      },
      "studyLearningCenter": {
        "title": "Open the Study learning center",
        "summary": "Use Study as the citizen-facing knowledge hub for constitutional, legal, civic, and economic learning paths.",
        "workflow": [
          "Open Study from the bottom navigation (Civic Learning Center is the default index).",
          "Use the Learning paths tab for the three guided paths with saved progress, and Materials for the reading packs.",
          "Select a foundation domain such as Constitution, Laws, Citizenship, or Economy.",
          "Track progress and continue through recommended materials."
        ],
        "details": [
          "Study is structured for civic learning rather than internal system tooling.",
          "The first phase focuses on four foundational domains, with additional domains staged next.",
          "Progress indicators make long-form civic reading easier to sustain."
        ]
      },
      "identifierLogin": {
        "title": "Sign in with one identifier field",
        "summary": "Login accepts an email address, username, or phone number instead of forcing a single credential style.",
        "workflow": [
          "Open Login and type your email, username, or phone number.",
          "Enter your password.",
          "Let the app resolve the right account and continue into the app."
        ],
        "details": [
          "The login field stays simple while still supporting multiple identity methods.",
          "Username and phone logins resolve to the linked account before the password sign-in runs.",
          "This keeps login flexible without forcing users to remember which contact method they originally used."
        ]
      },
} as const;
