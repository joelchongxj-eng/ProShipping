// Mock-only source references. VerificationCase and the backend contract are unchanged.
// These PDFs illustrate the fixture values; they are not original shipment documents.
export interface MockDocumentSource {
  url: string;
  filename: string;
}

export const mock_document_sources: Record<string, { si: MockDocumentSource | null; bl: MockDocumentSource | null }> = {
  "email_demo_001": {
    "si": {
      "url": "/demo-documents/PS-DEMO-001-SI.pdf",
      "filename": "PS-DEMO-001-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-001-BL.pdf",
      "filename": "PS-DEMO-001-BL.pdf"
    }
  },
  "email_demo_002": {
    "si": {
      "url": "/demo-documents/PS-DEMO-002-SI.pdf",
      "filename": "PS-DEMO-002-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-002-BL.pdf",
      "filename": "PS-DEMO-002-BL.pdf"
    }
  },
  "email_demo_003": {
    "si": {
      "url": "/demo-documents/PS-DEMO-003-SI.pdf",
      "filename": "PS-DEMO-003-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-003-BL.pdf",
      "filename": "PS-DEMO-003-BL.pdf"
    }
  },
  "email_demo_004": {
    "si": {
      "url": "/demo-documents/PS-DEMO-004-SI.pdf",
      "filename": "PS-DEMO-004-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-004-BL.pdf",
      "filename": "PS-DEMO-004-BL.pdf"
    }
  },
  "email_demo_005": {
    "si": {
      "url": "/demo-documents/PS-DEMO-005-SI.pdf",
      "filename": "PS-DEMO-005-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-005-BL.pdf",
      "filename": "PS-DEMO-005-BL.pdf"
    }
  },
  "email_demo_006": {
    "si": {
      "url": "/demo-documents/PS-DEMO-006-SI.pdf",
      "filename": "PS-DEMO-006-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-006-BL.pdf",
      "filename": "PS-DEMO-006-BL.pdf"
    }
  },
  "email_demo_007": {
    "si": {
      "url": "/demo-documents/PS-DEMO-007-SI.pdf",
      "filename": "PS-DEMO-007-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-007-BL.pdf",
      "filename": "PS-DEMO-007-BL.pdf"
    }
  },
  "email_demo_008": {
    "si": {
      "url": "/demo-documents/PS-DEMO-008-SI.pdf",
      "filename": "PS-DEMO-008-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-008-BL.pdf",
      "filename": "PS-DEMO-008-BL.pdf"
    }
  },
  "email_demo_009": {
    "si": {
      "url": "/demo-documents/PS-DEMO-009-SI.pdf",
      "filename": "PS-DEMO-009-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-009-BL.pdf",
      "filename": "PS-DEMO-009-BL.pdf"
    }
  },
  "email_demo_010": {
    "si": {
      "url": "/demo-documents/PS-DEMO-010-SI.pdf",
      "filename": "PS-DEMO-010-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-010-BL.pdf",
      "filename": "PS-DEMO-010-BL.pdf"
    }
  },
  "email_demo_011": {
    "si": {
      "url": "/demo-documents/PS-DEMO-011-SI.pdf",
      "filename": "PS-DEMO-011-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-011-BL.pdf",
      "filename": "PS-DEMO-011-BL.pdf"
    }
  },
  "email_demo_012": {
    "si": {
      "url": "/demo-documents/PS-DEMO-012-SI.pdf",
      "filename": "PS-DEMO-012-SI.pdf"
    },
    "bl": null
  },
  "email_demo_013": {
    "si": {
      "url": "/demo-documents/PS-DEMO-013-SI.pdf",
      "filename": "PS-DEMO-013-SI.pdf"
    },
    "bl": {
      "url": "/demo-documents/PS-DEMO-013-BL.pdf",
      "filename": "PS-DEMO-013-BL.pdf"
    }
  },
  "email_demo_014": {
    "si": {
      "url": "/demo-documents/PS-DEMO-014-SI.pdf",
      "filename": "PS-DEMO-014-SI.pdf"
    },
    "bl": null
  }
};
