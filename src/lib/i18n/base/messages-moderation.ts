export const m_messages_moderation = {
  "moderation": {
    "title": "Moderation",
    "subtitle": "Reports, decisions and appeals",
    "tabs": { "mine": "My content", "queue": "Reports", "appeals": "Appeals" },
    "report": {
      "action": "Report",
      "title": "Report this",
      "description": "Tell moderators what is wrong. They review every report against the community guidelines; the author is not told who reported.",
      "reasonLabel": "Reason",
      "detailsPlaceholder": "Anything moderators should know (optional)",
      "submit": "Send report",
      "submitted": "Thank you. Moderators will review it.",
      "guidelines": "Community guidelines"
    },
    "reasons": {
      "spam": "Spam or advertising",
      "harassment": "Harassment or bullying",
      "hate": "Hate speech",
      "violence": "Violence or threats",
      "sexual": "Sexual content",
      "child_safety": "Sexualisation of minors",
      "misinformation": "False or misleading information",
      "privacy": "Shares someone's private information",
      "illegal": "Illegal content",
      "other": "Something else"
    },
    "kinds": {
      "post": "Post",
      "post_comment": "Comment on a post",
      "matter": "Matter",
      "matter_comment": "Comment on a Matter",
      "solution_comment": "Comment in Solutions",
      "job_listing": "Job listing",
      "user": "Member"
    },
    "queue": {
      "empty": "No open reports.",
      "reports": "{count} reports",
      "claim": "Claim",
      "claimedBy": "Claimed by @{username}",
      "hide": "Hide",
      "dismiss": "Dismiss",
      "hideReason": "Reason for hiding",
      "noteLabel": "Note for the record (optional)",
      "open": "Open",
      "hidden": "Hidden. The author was told and may appeal.",
      "dismissed": "Reports dismissed."
    },
    "appeals": {
      "empty": "No appeals waiting.",
      "rule": "The moderator who hid the item cannot decide its appeal.",
      "uphold": "Keep hidden",
      "overturn": "Restore",
      "upheld": "Decision kept.",
      "overturned": "Content restored.",
      "appealLabel": "Appeal"
    },
    "mine": {
      "empty": "Nothing of yours has been moderated.",
      "hiddenFor": "Hidden for: {reason}",
      "appeal": "Appeal",
      "appealPlaceholder": "Explain why this should be visible again",
      "sendAppeal": "Send appeal",
      "appealSent": "Appeal sent. A different moderator will decide.",
      "appealPending": "Appeal waiting for a decision",
      "restored": "Restored after appeal",
      "upheld": "Appeal reviewed; the decision stands",
      "moderatorNote": "Moderator's note: {note}"
    },
    "hiddenBanner": "Hidden by moderation ({reason}). Only you and moderators see it.",
    "hiddenBannerLink": "Details and appeal",
    "errors": {
      "cannot_report_own_content": "You cannot report your own content.",
      "already_hidden": "This is already hidden.",
      "appeal_needs_another_moderator": "Another moderator must decide this appeal.",
      "already_appealed": "You already appealed this decision.",
      "cannot_moderate_own_content": "You cannot moderate your own content.",
      "generic": "That did not work. Try again."
    }
  },
  "publicMatters": {
    "title": "Public Matters",
    "metaTitle": "Public Matters — Civizen",
    "metaDescription": "Issues, questions and suggestions people have raised openly on Civizen, and the discussion around them.",
    "subtitle": "Issues, questions and suggestions raised openly by members, with their discussion. Join to take part.",
    "searchPlaceholder": "Search Matters",
    "all": "All",
    "open": "Open",
    "empty": "No public Matters match.",
    "more": "Show more",
    "notFound": "This Matter is not public or does not exist.",
    "raisedBy": "Raised by {initiator} for {addressee}",
    "joinPrompt": "Join Civizen to comment, support a proposal or help resolve this Matter. You will come back here after signing up.",
    "join": "Join to take part",
    "discussion": "Discussion ({count})"
  },
  "firstSteps": {
    "title": "Getting started",
    "progress": "{done} of {total} done",
    "dismiss": "Hide getting started",
    "voteCounts": "Your vote counts.",
    "voteAdvisory": "Your vote is advisory until your identity is verified.",
    "steps": {
      "lesson": { "title": "Read your first lesson", "hint": "Five minutes on how Civizen works and decides." },
      "vote": { "title": "Vote in the open consultation", "hint": "Read the question and cast your ballot." },
      "matter": { "title": "Raise or join a Matter", "hint": "Bring up an issue, a question or an idea, or add to one." },
      "verify": { "title": "Verify your identity", "hint": "An ID photo and a selfie; it makes your vote count." },
      "profile": { "title": "Add a photo or a short bio", "hint": "Helps others know who they are talking to." }
    }
  },
  "participation": {
    "title": "Participation",
    "subtitle": "The funnel from visit to countable vote, in totals",
    "privacyNote": "Aggregate counts only: page views are daily totals per page; no visitor, IP address or device is recorded.",
    "loadFailed": "The participation numbers could not be loaded.",
    "target": "Target by 22 Dec 2026: {value}",
    "members": "Members",
    "countries": "Countries",
    "ballotsCountable": "Countable ballots",
    "publicMatters": "Public Matters by members",
    "verificationHours": "Median verification time (hours)",
    "oldestReportHours": "Oldest open report (hours)",
    "funnelTitle": "Last {days} days",
    "dailyTitle": "Day by day",
    "topPages": "Most viewed pages",
    "noPageViews": "No page views recorded yet.",
    "metrics": {
      "signups": "Sign-ups",
      "confirmed": "Confirmed e-mail",
      "tookFirstAction": "Members who posted, raised, commented or voted (all time)",
      "verificationRequested": "Asked for verification (all time)",
      "verified": "Verified members",
      "ballotsAdvisory": "Advisory ballots",
      "active7d": "Signed in during the last 7 days",
      "active30d": "Signed in during the last 30 days",
      "openReports": "Open reports",
      "returned": "Came back after their first day (of those who joined over a week ago)"
    },
    "columns": { "day": "Day", "pageViews": "Views", "signups": "Sign-ups", "ballots": "Ballots", "matters": "Public Matters", "posts": "Posts" }
  }
} as const;
