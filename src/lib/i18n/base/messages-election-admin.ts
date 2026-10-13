export const m_messages_election_admin = {
  "electionAdmin": {
    "tab": "Elections",
    "intro": "Consultations that are scheduled, open, waiting for certification, or changed in the last 30 days. New consultations start from a Matter through a voting proposal. Every action here is recorded in the consultation's public log with your username and reason.",
    "empty": "No consultations need attention.",
    "ballots": "{count} countable ballots",
    "cancelReason": "Cancelled: {reason}",
    "certificationRequested": "Certification requested by @{username}.",
    "awaitingSecond": "Another administrator must certify it.",
    "history": "Administrative history",
    "historyEmpty": "No administrative actions yet.",
    "opensAt": "Voting opens",
    "closesAt": "Voting closes",
    "reason": "Reason (required)",
    "note": "Note (optional)",
    "reasonPlaceholder": "Why, in one or two sentences",
    "public": "This is published in the consultation's public log.",
    "status": {
      "draft": "Draft",
      "scheduled": "Scheduled",
      "open": "Open",
      "closed": "Closed, not certified",
      "certified": "Certified",
      "cancelled": "Cancelled"
    },
    "actions": {
      "reschedule": "Reschedule",
      "extend": "Extend voting",
      "cancel": "Cancel consultation",
      "requestCertification": "Request certification",
      "certify": "Certify result"
    },
    "help": {
      "reschedule": "Move the voting window before it opens.",
      "extend": "Give voters more time: a later closing time, at most 14 days more at once. Followers are told.",
      "cancel": "Stop the consultation. Counts stay sealed and no outcome is written to the Matter. Followers and voters are told.",
      "requestCertification": "You confirm the count looks right. A second administrator then certifies it.",
      "certify": "Certify the result that another administrator checked. Followers are told."
    },
    "done": {
      "reschedule": "Consultation rescheduled",
      "extend": "Voting extended",
      "cancel": "Consultation cancelled",
      "requestCertification": "Certification requested",
      "certify": "Result certified"
    },
    "events": {
      "election_rescheduled": "Rescheduled",
      "election_extended": "Voting extended",
      "election_cancelled": "Cancelled",
      "certification_requested": "Certification requested",
      "election_certified": "Certified",
      "election_opened": "Voting opened",
      "election_closed": "Voting closed"
    },
    "errors": {
      "reason_required": "Give a reason of at least 5 characters.",
      "extension_must_be_later": "The new closing time must be later than the current one.",
      "extension_too_long": "Extend by at most 14 days at once.",
      "election_already_closed": "Voting has already closed.",
      "opens_in_past": "Choose an opening time at least 5 minutes from now.",
      "window_too_short": "Voting must stay open for at least 1 hour.",
      "window_too_long": "Voting can stay open for at most 90 days.",
      "second_person_required": "A different administrator must certify the result.",
      "certification_already_requested": "Certification was already requested.",
      "generic": "That did not work. Reload and try again."
    }
  }
};
