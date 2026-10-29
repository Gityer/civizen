export const m_messages_settings_04 = {
  "readingTitle": "Reading",
  "readingDescription": "Text size, contrast and motion on this device",
  "readingTextSize": "Text size",
  "readingContrast": "Contrast",
  "readingMotion": "Motion",
  "readingTextSizes": { "default": "Default", "large": "Large", "larger": "Larger" },
  "readingContrasts": { "standard": "Standard", "high": "High" },
  "readingMotions": { "device": "Follow this device", "reduce": "Reduce" },
  "marketJobsAdminCardTitle": "Review Jobs postings",
  "marketJobsAdminCardDescription": "Every posting with its status and contact; mark reviewing, contacted, closed or spam."
} as const;

export const m_messages_market_jobs_admin = {
  "marketJobsAdmin": {
    "title": "Jobs postings",
    "subtitle": "Postings from people looking for work and employers looking for workers. Public rows are new, reviewing and contacted.",
    "loadFailed": "Could not load the postings.",
    "updateFailed": "Could not update the posting.",
    "empty": "No postings in this state.",
    "anonymous": "posted without an account",
    "mode": { "seeker": "looking for work", "employer": "hiring" },
    "status": { "all": "All", "new": "New", "reviewing": "Reviewing", "contacted": "Contacted", "closed": "Closed", "spam": "Spam" },
    "setStatus": { "new": "Mark new", "reviewing": "Mark reviewing", "contacted": "Mark contacted", "closed": "Close", "spam": "Spam" }
  }
} as const;
