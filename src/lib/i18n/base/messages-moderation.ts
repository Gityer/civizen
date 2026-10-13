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
      "dismissed": "Reports dismissed.",
      "userHint": "Members are not hidden here; use sanctions in Users admin."
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
  }
} as const;
