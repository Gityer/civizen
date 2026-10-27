export const m_messages_member_enforcement = {
  "memberEnforcement": {
    "steps": {
      "note": "Note",
      "warning": "Warning",
      "content_restriction": "Cannot post or comment (7 days)",
      "messaging_restriction": "Cannot start conversations (7 days)",
      "suspension": "Suspended (30 days)"
    },
    "refused": {
      "content_restriction": "A moderation decision stops you from posting or commenting until {date}. Open Moderation to see why or to appeal.",
      "messaging_restriction": "A moderation decision stops you from starting new conversations until {date}. Open Moderation to see why or to appeal.",
      "suspension": "Your account is suspended until {date} by a moderation decision: you can read and appeal, but not post, message or change anything."
    },
    "banner": {
      "content_restriction": "A moderation decision stops you from posting or commenting until {date}.",
      "messaging_restriction": "A moderation decision stops you from starting new conversations until {date}.",
      "suspension": "Your account is suspended until {date}: you can read and appeal, but not post, message or change anything.",
      "open": "See why or appeal"
    },
    "signInSuspended": "This account is suspended by a moderation decision, so it cannot sign in until the suspension ends.",
    "mine": {
      "title": "Decisions about your account",
      "empty": "No moderation decisions about your account.",
      "until": "Until {date}",
      "ended": "Ended",
      "reason": "Reason: {reason}"
    },
    "appeals": {
      "title": "Appeals about accounts",
      "empty": "No open appeals about accounts."
    },
    "form": {
      "title": "Account step for @{username}",
      "titleNoName": "Account step for this member",
      "history": "Standing steps: {steps}",
      "noHistory": "No earlier steps.",
      "step": "Step",
      "rule": "One step above the highest standing one. Threats of violence, sexualisation of minors and private information may skip steps.",
      "apply": "Apply step",
      "applied": "Step applied. The member is notified and can appeal once."
    },
    "errors": {
      "step_too_high": "That step is more than one above the member's standing steps. Choose a lower step, or a reason that allows skipping.",
      "note_required": "Add a note when the reason is \"Other\".",
      "cannot_moderate_self": "You cannot apply a step to your own account.",
      "member_not_found": "This member no longer exists."
    }
  }
};
