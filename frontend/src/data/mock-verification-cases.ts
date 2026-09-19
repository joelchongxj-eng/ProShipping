import type { VerificationCase } from "@/types/verification";

// Synthetic shipping examples only; no real documents or personal data.
// Statuses, normalization, and reasons are authored fixtures, not computed decisions.
export const mock_verification_cases = [
  {
    "case_id": "PS-DEMO-001",
    "email_id": "email_demo_001",
    "subject": "Draft BL verification - PKL-SIN-260901",
    "sender": "operations@selatpaper.example",
    "received_at": "2026-09-19T08:15:00+08:00",
    "status": "matched",
    "field_comparisons": {
      "shipper": {
        "si": {
          "raw_value": "Selat Paper Industries Sdn. Bhd.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Shipper: Selat Paper Industries Sdn. Bhd.",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Shipper: SELAT PAPER INDUSTRIES SDN. BHD.",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "consignee": {
        "si": {
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Consignee: Straits Packaging Pte. Ltd.",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Consignee: STRAITS PACKAGING PTE. LTD.",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "notify_party": {
        "si": {
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Notify Party: Straits Packaging Pte. Ltd.",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Notify Party: STRAITS PACKAGING PTE. LTD.",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "port_of_loading": {
        "si": {
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Port of Loading: Port Klang",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Port of Loading: PORT KLANG",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same port after casing normalization."
      },
      "port_of_discharge": {
        "si": {
          "raw_value": "Singapore",
          "normalized_value": "SINGAPORE",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Port of Discharge: Singapore",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "SINGAPORE",
          "normalized_value": "SINGAPORE",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Port of Discharge: SINGAPORE",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same port after casing normalization."
      },
      "container_count": {
        "si": {
          "raw_value": "2 x 40 HC",
          "normalized_value": 2,
          "confidence": 0.99,
          "evidence": {
            "source_text": "Container Count: 2 x 40 HC",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "2",
          "normalized_value": 2,
          "confidence": 0.98,
          "evidence": {
            "source_text": "Container Count: 2",
            "page_number": 2
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL both specify the same container count."
      },
      "gross_weight_kg": {
        "si": {
          "raw_value": "22 MT",
          "normalized_value": 22000,
          "confidence": 0.99,
          "evidence": {
            "source_text": "Gross Weight: 22 MT",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "22,000 KG",
          "normalized_value": 22000,
          "confidence": 0.98,
          "evidence": {
            "source_text": "Gross Weight: 22,000 KG",
            "page_number": 2
          }
        },
        "status": "match",
        "comparison_reason": "SI states 22 MT and BL states 22,000 KG; the supplied normalized values are both 22000 kg."
      }
    }
  },
  {
    "case_id": "PS-DEMO-002",
    "email_id": "email_demo_002",
    "subject": "Draft BL verification - PKL-JKT-260902",
    "sender": "export@merantiwood.example",
    "received_at": "2026-09-19T09:05:00+08:00",
    "status": "mismatch",
    "field_comparisons": {
      "shipper": {
        "si": {
          "raw_value": "Meranti Wood Products Sdn. Bhd.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Shipper: Meranti Wood Products Sdn. Bhd.",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Shipper: MERANTI WOOD PRODUCTS SDN. BHD.",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "consignee": {
        "si": {
          "raw_value": "PT Nusantara Furnishings",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Consignee: PT Nusantara Furnishings",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "PT NUSANTARA FURNISHINGS",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Consignee: PT NUSANTARA FURNISHINGS",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "notify_party": {
        "si": {
          "raw_value": "PT Tanjung Logistics",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Notify Party: PT Tanjung Logistics",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "PT TANJUNG LOGISTICS",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Notify Party: PT TANJUNG LOGISTICS",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "port_of_loading": {
        "si": {
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Port of Loading: Port Klang",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Port of Loading: PORT KLANG",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same port after casing normalization."
      },
      "port_of_discharge": {
        "si": {
          "raw_value": "Tanjung Priok",
          "normalized_value": "TANJUNG PRIOK",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Port of Discharge: Tanjung Priok",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "TANJUNG PRIOK",
          "normalized_value": "TANJUNG PRIOK",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Port of Discharge: TANJUNG PRIOK",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same port after casing normalization."
      },
      "container_count": {
        "si": {
          "raw_value": "3 x 20 GP",
          "normalized_value": 3,
          "confidence": 0.99,
          "evidence": {
            "source_text": "Container Count: 3 x 20 GP",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "4 x 20 GP",
          "normalized_value": 4,
          "confidence": 0.98,
          "evidence": {
            "source_text": "Container Count: 4 x 20 GP",
            "page_number": 2
          }
        },
        "status": "mismatch",
        "comparison_reason": "SI specifies 3 containers, while the draft BL specifies 4. Both values were confidently extracted."
      },
      "gross_weight_kg": {
        "si": {
          "raw_value": "18,600 KG",
          "normalized_value": 18600,
          "confidence": 0.99,
          "evidence": {
            "source_text": "Gross Weight: 18,600 KG",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "18,600 KG",
          "normalized_value": 18600,
          "confidence": 0.98,
          "evidence": {
            "source_text": "Gross Weight: 18,600 KG",
            "page_number": 2
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL specify the same gross weight in kilograms."
      }
    }
  },
  {
    "case_id": "PS-DEMO-003",
    "email_id": "email_demo_003",
    "subject": "Scanned draft BL verification - PEN-LCH-260903",
    "sender": "shipping@mutiararubber.example",
    "received_at": "2026-09-19T10:20:00+08:00",
    "status": "needs_review",
    "field_comparisons": {
      "shipper": {
        "si": {
          "raw_value": "Mutiara Rubber Products Sdn. Bhd.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Shipper: Mutiara Rubber Products Sdn. Bhd.",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Shipper: MUTIARA RUBBER PRODUCTS SDN. BHD.",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "consignee": {
        "si": {
          "raw_value": "Siam Industrial Supplies Co., Ltd.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Consignee: Siam Industrial Supplies Co., Ltd.",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Consignee: SIAM INDUSTRIAL SUPPLIES CO., LTD.",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "notify_party": {
        "si": {
          "raw_value": "Eastern Seaboard Logistics Co., Ltd.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Notify Party: Eastern Seaboard Logistics Co., Ltd.",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Notify Party: EASTERN SEABOARD LOGISTICS CO., LTD.",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same party after casing normalization."
      },
      "port_of_loading": {
        "si": {
          "raw_value": "Penang",
          "normalized_value": "PENANG",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Port of Loading: Penang",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "PENANG",
          "normalized_value": "PENANG",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Port of Loading: PENANG",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same port after casing normalization."
      },
      "port_of_discharge": {
        "si": {
          "raw_value": "Laem Chabang",
          "normalized_value": "LAEM CHABANG",
          "confidence": 0.99,
          "evidence": {
            "source_text": "Port of Discharge: Laem Chabang",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "LAEM CHABANG",
          "normalized_value": "LAEM CHABANG",
          "confidence": 0.98,
          "evidence": {
            "source_text": "Port of Discharge: LAEM CHABANG",
            "page_number": 1
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL identify the same port after casing normalization."
      },
      "container_count": {
        "si": {
          "raw_value": "1 x 40 HC",
          "normalized_value": 1,
          "confidence": 0.99,
          "evidence": {
            "source_text": "Container Count: 1 x 40 HC",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "1",
          "normalized_value": 1,
          "confidence": 0.98,
          "evidence": {
            "source_text": "Container Count: 1",
            "page_number": 2
          }
        },
        "status": "match",
        "comparison_reason": "SI and BL both specify the same container count."
      },
      "gross_weight_kg": {
        "si": {
          "raw_value": "12,850 KG",
          "normalized_value": 12850,
          "confidence": 0.99,
          "evidence": {
            "source_text": "Gross Weight: 12,850 KG",
            "page_number": 1
          }
        },
        "bl": {
          "raw_value": "12,?50 KG",
          "normalized_value": null,
          "confidence": 0.58,
          "evidence": {
            "source_text": "Gross Weight: 12,?50 KG",
            "page_number": 2
          }
        },
        "status": "uncertain",
        "comparison_reason": "A digit in the scanned BL gross weight is illegible. Human review is required; a weight mismatch cannot be confirmed."
      }
    }
  }
] satisfies VerificationCase[];
