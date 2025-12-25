export const JOB_FIELDS = [
  { key: "url", label: "url", type: "url" },
  { key: "title", label: "title", type: "text" },
  { key: "company", label: "company", type: "text" },

  { key: "created_at", label: "created_at", type: "datetime", readonly: true },
  { key: "updated_at", label: "updated_at", type: "datetime", readonly: true },
  { key: "published_at", label: "published_at", type: "date" },
  { key: "deadline", label: "deadline", type: "date" },

  { key: "applied_at", label: "applied_at", type: "date" },
  { key: "rejected_at", label: "rejected_at", type: "date" },
  { key: "next_step_notified_at", label: "next_step_notified_at", type: "datetime" },
  { key: "interview_at", label: "interview_at", type: "datetime" },

  { key: "language", label: "language", type: "select", options: ["fi", "en", "sv", "other", ""] },

  { key: "status", label: "status", type: "select", options: [
      "", "jono", "käynnissä", "ei_aloitettu", "karsittu", "poistettu", "valmis", "haastattelu"
    ]
  },

  { key: "level", label: "level", type: "select", options: ["", "junior", "mid", "senior", "lead", ""] },

  { key: "priority", label: "priority", type: "select", options: ["", "1", "2", "3"] },
  { key: "urgency", label: "urgency", type: "select", options: ["", "1", "2", "3"] },

  { key: "requirements", label: "requirements", type: "textarea" },
  { key: "requirements_score", label: "requirements_score", type: "number" },

  { key: "cover_letter", label: "cover_letter", type: "textarea" },
  { key: "cv_version", label: "cv_version", type: "text" },

  { key: "duplicate_of", label: "duplicate_of", type: "text" },
  { key: "ai_result", label: "ai_result", type: "textarea" },

  // body_text aina viimeiseksi:
  { key: "body_text", label: "body_text", type: "textarea", large: true },
];
