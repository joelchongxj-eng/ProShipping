import type { VerificationCase } from "@/types/verification";

// Authored synthetic backend-shaped responses; no runtime comparison or normalization.
export const mock_verification_cases: VerificationCase[] = [
  {
    "email": {
      "email_id": "email_demo_001",
      "from": "operations@selatpaper.example",
      "subject": "Draft BL verification - PKL-SIN-260901",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-001-SI.pdf",
        "/demo-documents/PS-DEMO-001-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "MATCH",
    "si_attachment": "/demo-documents/PS-DEMO-001-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-001-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Selat Paper Industries Sdn. Bhd.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Selat Paper Industries Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: SELAT PAPER INDUSTRIES SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Singapore",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Singapore"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "SINGAPORE",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: SINGAPORE"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "2 x 40 HC",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 2 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "2",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 2"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "22 MT",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 22 MT"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "22,000 KG",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 22,000 KG"
        },
        "reason": "SI states 22 MT and BL states 22,000 KG; the supplied normalized values are both 22000 kg."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_002",
      "from": "export@merantiwood.example",
      "subject": "Draft BL verification - PKL-JKT-260902",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-002-SI.pdf",
        "/demo-documents/PS-DEMO-002-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "MISMATCH",
    "si_attachment": "/demo-documents/PS-DEMO-002-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-002-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Meranti Wood Products Sdn. Bhd.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Meranti Wood Products Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: MERANTI WOOD PRODUCTS SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "PT Nusantara Furnishings",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: PT Nusantara Furnishings"
        },
        "bl": {
          "field": "consignee",
          "raw_value": "PT NUSANTARA FURNISHINGS",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: PT NUSANTARA FURNISHINGS"
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "PT Tanjung Logistics",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: PT Tanjung Logistics"
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "PT TANJUNG LOGISTICS",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: PT TANJUNG LOGISTICS"
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Tanjung Priok",
          "normalized_value": "TANJUNG PRIOK",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Tanjung Priok"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "TANJUNG PRIOK",
          "normalized_value": "TANJUNG PRIOK",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: TANJUNG PRIOK"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "mismatch",
        "si": {
          "field": "container_count",
          "raw_value": "3 x 20 GP",
          "normalized_value": "3",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 3 x 20 GP"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "4 x 20 GP",
          "normalized_value": "4",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 4 x 20 GP"
        },
        "reason": "SI specifies 3 containers, while the draft BL specifies 4. Both values were confidently extracted."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "18,600 KG",
          "normalized_value": "18600",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 18,600 KG"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "18,600 KG",
          "normalized_value": "18600",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 18,600 KG"
        },
        "reason": "SI and BL specify the same gross weight in kilograms."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_003",
      "from": "shipping@mutiararubber.example",
      "subject": "Scanned draft BL verification - PEN-LCH-260903",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-003-SI.pdf",
        "/demo-documents/PS-DEMO-003-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "NEEDS_REVIEW",
    "review_reason": "unreadable",
    "si_attachment": "/demo-documents/PS-DEMO-003-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-003-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Mutiara Rubber Products Sdn. Bhd.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Mutiara Rubber Products Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: MUTIARA RUBBER PRODUCTS SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Siam Industrial Supplies Co., Ltd.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Siam Industrial Supplies Co., Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: SIAM INDUSTRIAL SUPPLIES CO., LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "Eastern Seaboard Logistics Co., Ltd.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Eastern Seaboard Logistics Co., Ltd."
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: EASTERN SEABOARD LOGISTICS CO., LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Penang",
          "normalized_value": "PENANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Penang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PENANG",
          "normalized_value": "PENANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PENANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Laem Chabang",
          "normalized_value": "LAEM CHABANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Laem Chabang"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "LAEM CHABANG",
          "normalized_value": "LAEM CHABANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: LAEM CHABANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "1 x 40 HC",
          "normalized_value": "1",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 1 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "1",
          "normalized_value": "1",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 1"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "needs_review",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "12,850 KG",
          "normalized_value": "12850",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 12,850 KG"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "12,?50 KG",
          "normalized_value": "",
          "unit": "kg",
          "confidence": 0.58,
          "page": 2,
          "evidence": "Gross Weight: 12,?50 KG"
        },
        "reason": "A digit in the scanned BL gross weight is illegible. Human review is required; a weight mismatch cannot be confirmed."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_004",
      "from": "operations@selatpaper.example",
      "subject": "Draft BL verification - PKL-SIN-260904",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-004-SI.pdf",
        "/demo-documents/PS-DEMO-004-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "MATCH",
    "si_attachment": "/demo-documents/PS-DEMO-004-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-004-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Selat Paper Industries Sdn. Bhd.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Selat Paper Industries Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: SELAT PAPER INDUSTRIES SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Singapore",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Singapore"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "SINGAPORE",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: SINGAPORE"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "2 x 40 HC",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 2 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "2",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 2"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "22 MT",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 22 MT"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "22,000 KG",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 22,000 KG"
        },
        "reason": "SI states 22 MT and BL states 22,000 KG; the supplied normalized values are both 22000 kg."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_005",
      "from": "operations@selatpaper.example",
      "subject": "Draft BL verification - PKL-SIN-260905",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-005-SI.pdf",
        "/demo-documents/PS-DEMO-005-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "MATCH",
    "si_attachment": "/demo-documents/PS-DEMO-005-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-005-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Selat Paper Industries Sdn. Bhd.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Selat Paper Industries Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: SELAT PAPER INDUSTRIES SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Singapore",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Singapore"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "SINGAPORE",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: SINGAPORE"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "2 x 40 HC",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 2 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "2",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 2"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "22 MT",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 22 MT"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "22,000 KG",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 22,000 KG"
        },
        "reason": "SI states 22 MT and BL states 22,000 KG; the supplied normalized values are both 22000 kg."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_006",
      "from": "operations@selatpaper.example",
      "subject": "Draft BL verification - PKL-SIN-260906",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-006-SI.pdf",
        "/demo-documents/PS-DEMO-006-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "MATCH",
    "si_attachment": "/demo-documents/PS-DEMO-006-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-006-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Selat Paper Industries Sdn. Bhd.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Selat Paper Industries Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: SELAT PAPER INDUSTRIES SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Singapore",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Singapore"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "SINGAPORE",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: SINGAPORE"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "2 x 40 HC",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 2 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "2",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 2"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "22 MT",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 22 MT"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "22,000 KG",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 22,000 KG"
        },
        "reason": "SI states 22 MT and BL states 22,000 KG; the supplied normalized values are both 22000 kg."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_007",
      "from": "export@merantiwood.example",
      "subject": "Draft BL verification - PKL-JKT-260907",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-007-SI.pdf",
        "/demo-documents/PS-DEMO-007-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "MISMATCH",
    "si_attachment": "/demo-documents/PS-DEMO-007-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-007-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Meranti Wood Products Sdn. Bhd.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Meranti Wood Products Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: MERANTI WOOD PRODUCTS SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "PT Nusantara Furnishings",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: PT Nusantara Furnishings"
        },
        "bl": {
          "field": "consignee",
          "raw_value": "PT NUSANTARA FURNISHINGS",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: PT NUSANTARA FURNISHINGS"
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "PT Tanjung Logistics",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: PT Tanjung Logistics"
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "PT TANJUNG LOGISTICS",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: PT TANJUNG LOGISTICS"
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Tanjung Priok",
          "normalized_value": "TANJUNG PRIOK",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Tanjung Priok"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "TANJUNG PRIOK",
          "normalized_value": "TANJUNG PRIOK",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: TANJUNG PRIOK"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "mismatch",
        "si": {
          "field": "container_count",
          "raw_value": "3 x 20 GP",
          "normalized_value": "3",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 3 x 20 GP"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "4 x 20 GP",
          "normalized_value": "4",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 4 x 20 GP"
        },
        "reason": "SI specifies 3 containers, while the draft BL specifies 4. Both values were confidently extracted."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "18,600 KG",
          "normalized_value": "18600",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 18,600 KG"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "18,600 KG",
          "normalized_value": "18600",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 18,600 KG"
        },
        "reason": "SI and BL specify the same gross weight in kilograms."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_008",
      "from": "export@merantiwood.example",
      "subject": "Draft BL verification - PKL-JKT-260908",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-008-SI.pdf",
        "/demo-documents/PS-DEMO-008-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "MISMATCH",
    "si_attachment": "/demo-documents/PS-DEMO-008-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-008-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Meranti Wood Products Sdn. Bhd.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Meranti Wood Products Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: MERANTI WOOD PRODUCTS SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "PT Nusantara Furnishings",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: PT Nusantara Furnishings"
        },
        "bl": {
          "field": "consignee",
          "raw_value": "PT NUSANTARA FURNISHINGS",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: PT NUSANTARA FURNISHINGS"
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "PT Tanjung Logistics",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: PT Tanjung Logistics"
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "PT TANJUNG LOGISTICS",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: PT TANJUNG LOGISTICS"
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Tanjung Priok",
          "normalized_value": "TANJUNG PRIOK",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Tanjung Priok"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "TANJUNG PRIOK",
          "normalized_value": "TANJUNG PRIOK",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: TANJUNG PRIOK"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "mismatch",
        "si": {
          "field": "container_count",
          "raw_value": "3 x 20 GP",
          "normalized_value": "3",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 3 x 20 GP"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "4 x 20 GP",
          "normalized_value": "4",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 4 x 20 GP"
        },
        "reason": "SI specifies 3 containers, while the draft BL specifies 4. Both values were confidently extracted."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "18,600 KG",
          "normalized_value": "18600",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 18,600 KG"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "18,600 KG",
          "normalized_value": "18600",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 18,600 KG"
        },
        "reason": "SI and BL specify the same gross weight in kilograms."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_009",
      "from": "export@merantiwood.example",
      "subject": "Draft BL verification - PKL-JKT-260909",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-009-SI.pdf",
        "/demo-documents/PS-DEMO-009-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "MISMATCH",
    "si_attachment": "/demo-documents/PS-DEMO-009-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-009-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Meranti Wood Products Sdn. Bhd.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Meranti Wood Products Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "normalized_value": "MERANTI WOOD PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: MERANTI WOOD PRODUCTS SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "PT Nusantara Furnishings",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: PT Nusantara Furnishings"
        },
        "bl": {
          "field": "consignee",
          "raw_value": "PT NUSANTARA FURNISHINGS",
          "normalized_value": "PT NUSANTARA FURNISHINGS",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: PT NUSANTARA FURNISHINGS"
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "PT Tanjung Logistics",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: PT Tanjung Logistics"
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "PT TANJUNG LOGISTICS",
          "normalized_value": "PT TANJUNG LOGISTICS",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: PT TANJUNG LOGISTICS"
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Tanjung Priok",
          "normalized_value": "TANJUNG PRIOK",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Tanjung Priok"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "TANJUNG PRIOK",
          "normalized_value": "TANJUNG PRIOK",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: TANJUNG PRIOK"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "mismatch",
        "si": {
          "field": "container_count",
          "raw_value": "3 x 20 GP",
          "normalized_value": "3",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 3 x 20 GP"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "4 x 20 GP",
          "normalized_value": "4",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 4 x 20 GP"
        },
        "reason": "SI specifies 3 containers, while the draft BL specifies 4. Both values were confidently extracted."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "18,600 KG",
          "normalized_value": "18600",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 18,600 KG"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "18,600 KG",
          "normalized_value": "18600",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 18,600 KG"
        },
        "reason": "SI and BL specify the same gross weight in kilograms."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_010",
      "from": "shipping@mutiararubber.example",
      "subject": "Scanned draft BL verification - PEN-LCH-260910",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-010-SI.pdf",
        "/demo-documents/PS-DEMO-010-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "NEEDS_REVIEW",
    "review_reason": "unreadable",
    "si_attachment": "/demo-documents/PS-DEMO-010-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-010-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Mutiara Rubber Products Sdn. Bhd.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Mutiara Rubber Products Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: MUTIARA RUBBER PRODUCTS SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Siam Industrial Supplies Co., Ltd.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Siam Industrial Supplies Co., Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: SIAM INDUSTRIAL SUPPLIES CO., LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "Eastern Seaboard Logistics Co., Ltd.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Eastern Seaboard Logistics Co., Ltd."
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: EASTERN SEABOARD LOGISTICS CO., LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Penang",
          "normalized_value": "PENANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Penang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PENANG",
          "normalized_value": "PENANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PENANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Laem Chabang",
          "normalized_value": "LAEM CHABANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Laem Chabang"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "LAEM CHABANG",
          "normalized_value": "LAEM CHABANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: LAEM CHABANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "1 x 40 HC",
          "normalized_value": "1",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 1 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "1",
          "normalized_value": "1",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 1"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "needs_review",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "12,850 KG",
          "normalized_value": "12850",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 12,850 KG"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "12,?50 KG",
          "normalized_value": "",
          "unit": "kg",
          "confidence": 0.58,
          "page": 2,
          "evidence": "Gross Weight: 12,?50 KG"
        },
        "reason": "A digit in the scanned BL gross weight is illegible. Human review is required; a weight mismatch cannot be confirmed."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_011",
      "from": "shipping@mutiararubber.example",
      "subject": "Scanned draft BL verification - PEN-LCH-260911",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-011-SI.pdf",
        "/demo-documents/PS-DEMO-011-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "NEEDS_REVIEW",
    "review_reason": "wrong_doc_type",
    "si_attachment": "/demo-documents/PS-DEMO-011-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-011-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Mutiara Rubber Products Sdn. Bhd.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Mutiara Rubber Products Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: MUTIARA RUBBER PRODUCTS SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Siam Industrial Supplies Co., Ltd.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Siam Industrial Supplies Co., Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: SIAM INDUSTRIAL SUPPLIES CO., LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "Eastern Seaboard Logistics Co., Ltd.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Eastern Seaboard Logistics Co., Ltd."
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: EASTERN SEABOARD LOGISTICS CO., LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Penang",
          "normalized_value": "PENANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Penang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PENANG",
          "normalized_value": "PENANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PENANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Laem Chabang",
          "normalized_value": "LAEM CHABANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Laem Chabang"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "LAEM CHABANG",
          "normalized_value": "LAEM CHABANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: LAEM CHABANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "1 x 40 HC",
          "normalized_value": "1",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 1 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "1",
          "normalized_value": "1",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 1"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "needs_review",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "12,850 KG",
          "normalized_value": "12850",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 12,850 KG"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "12,?50 KG",
          "normalized_value": "",
          "unit": "kg",
          "confidence": 0.58,
          "page": 2,
          "evidence": "Gross Weight: 12,?50 KG"
        },
        "reason": "A digit in the scanned BL gross weight is illegible. Human review is required; a weight mismatch cannot be confirmed."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_012",
      "from": "shipping@mutiararubber.example",
      "subject": "Draft BL attachment missing - PEN-LCH-260912",
      "body": "Synthetic demo email. The SI is attached, but the draft BL attachment is missing.",
      "attachments": [
        "/demo-documents/PS-DEMO-012-SI.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "NEEDS_REVIEW",
    "review_reason": "missing_attachment",
    "si_attachment": "/demo-documents/PS-DEMO-012-SI.pdf",
    "bl_attachment": null,
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Mutiara Rubber Products Sdn. Bhd.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Mutiara Rubber Products Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "normalized_value": "MUTIARA RUBBER PRODUCTS SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: MUTIARA RUBBER PRODUCTS SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Siam Industrial Supplies Co., Ltd.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Siam Industrial Supplies Co., Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "normalized_value": "SIAM INDUSTRIAL SUPPLIES CO., LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: SIAM INDUSTRIAL SUPPLIES CO., LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "match",
        "si": {
          "field": "notify_party",
          "raw_value": "Eastern Seaboard Logistics Co., Ltd.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Eastern Seaboard Logistics Co., Ltd."
        },
        "bl": {
          "field": "notify_party",
          "raw_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "normalized_value": "EASTERN SEABOARD LOGISTICS CO., LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Notify Party: EASTERN SEABOARD LOGISTICS CO., LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Penang",
          "normalized_value": "PENANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Penang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PENANG",
          "normalized_value": "PENANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PENANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Laem Chabang",
          "normalized_value": "LAEM CHABANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Laem Chabang"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "LAEM CHABANG",
          "normalized_value": "LAEM CHABANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: LAEM CHABANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "1 x 40 HC",
          "normalized_value": "1",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 1 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "1",
          "normalized_value": "1",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 1"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "needs_review",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "12,850 KG",
          "normalized_value": "12850",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 12,850 KG"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "12,?50 KG",
          "normalized_value": "",
          "unit": "kg",
          "confidence": 0.58,
          "page": 2,
          "evidence": "Gross Weight: 12,?50 KG"
        },
        "reason": "A digit in the scanned BL gross weight is illegible. Human review is required; a weight mismatch cannot be confirmed."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_013",
      "from": "operations@selatpaper.example",
      "subject": "Draft BL missing notify party - PKL-SIN-260913",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-013-SI.pdf",
        "/demo-documents/PS-DEMO-013-BL.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "NEEDS_REVIEW",
    "review_reason": "missing_value",
    "si_attachment": "/demo-documents/PS-DEMO-013-SI.pdf",
    "bl_attachment": "/demo-documents/PS-DEMO-013-BL.pdf",
    "comparison": [
      {
        "field": "shipper",
        "status": "match",
        "si": {
          "field": "shipper",
          "raw_value": "Selat Paper Industries Sdn. Bhd.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Selat Paper Industries Sdn. Bhd."
        },
        "bl": {
          "field": "shipper",
          "raw_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Shipper: SELAT PAPER INDUSTRIES SDN. BHD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "consignee",
        "status": "match",
        "si": {
          "field": "consignee",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Straits Packaging Pte. Ltd."
        },
        "bl": {
          "field": "consignee",
          "raw_value": "STRAITS PACKAGING PTE. LTD.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Consignee: STRAITS PACKAGING PTE. LTD."
        },
        "reason": "SI and BL identify the same party after casing normalization."
      },
      {
        "field": "notify_party",
        "status": "missing",
        "si": {
          "field": "notify_party",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Straits Packaging Pte. Ltd."
        },
        "bl": null,
        "reason": "The notify party is present in the SI but blank in the draft BL. Human review is required."
      },
      {
        "field": "port_of_loading",
        "status": "match",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": {
          "field": "port_of_loading",
          "raw_value": "PORT KLANG",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Loading: PORT KLANG"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "port_of_discharge",
        "status": "match",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Singapore",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Singapore"
        },
        "bl": {
          "field": "port_of_discharge",
          "raw_value": "SINGAPORE",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.98,
          "page": 1,
          "evidence": "Port of Discharge: SINGAPORE"
        },
        "reason": "SI and BL identify the same port after casing normalization."
      },
      {
        "field": "container_count",
        "status": "match",
        "si": {
          "field": "container_count",
          "raw_value": "2 x 40 HC",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 2 x 40 HC"
        },
        "bl": {
          "field": "container_count",
          "raw_value": "2",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.98,
          "page": 2,
          "evidence": "Container Count: 2"
        },
        "reason": "SI and BL both specify the same container count."
      },
      {
        "field": "gross_weight_kg",
        "status": "match",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "22 MT",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 22 MT"
        },
        "bl": {
          "field": "gross_weight_kg",
          "raw_value": "22,000 KG",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.98,
          "page": 2,
          "evidence": "Gross Weight: 22,000 KG"
        },
        "reason": "SI states 22 MT and BL states 22,000 KG; the supplied normalized values are both 22000 kg."
      }
    ]
  },
  {
    "email": {
      "email_id": "email_demo_014",
      "from": "operations@selatpaper.example",
      "subject": "Unreadable draft BL - PKL-SIN-260914",
      "body": "Synthetic demo email. Please verify the attached SI and draft BL.",
      "attachments": [
        "/demo-documents/PS-DEMO-014-SI.pdf"
      ]
    },
    "category": "BL_COMPARISON",
    "status": "FAILED",
    "si_attachment": "/demo-documents/PS-DEMO-014-SI.pdf",
    "bl_attachment": null,
    "comparison": [
      {
        "field": "shipper",
        "status": "needs_review",
        "si": {
          "field": "shipper",
          "raw_value": "Selat Paper Industries Sdn. Bhd.",
          "normalized_value": "SELAT PAPER INDUSTRIES SDN. BHD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Shipper: Selat Paper Industries Sdn. Bhd."
        },
        "bl": null,
        "reason": "The draft BL could not be processed. No extraction result is available; retry processing."
      },
      {
        "field": "consignee",
        "status": "needs_review",
        "si": {
          "field": "consignee",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Consignee: Straits Packaging Pte. Ltd."
        },
        "bl": null,
        "reason": "The draft BL could not be processed. No extraction result is available; retry processing."
      },
      {
        "field": "notify_party",
        "status": "needs_review",
        "si": {
          "field": "notify_party",
          "raw_value": "Straits Packaging Pte. Ltd.",
          "normalized_value": "STRAITS PACKAGING PTE. LTD.",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Notify Party: Straits Packaging Pte. Ltd."
        },
        "bl": null,
        "reason": "The draft BL could not be processed. No extraction result is available; retry processing."
      },
      {
        "field": "port_of_loading",
        "status": "needs_review",
        "si": {
          "field": "port_of_loading",
          "raw_value": "Port Klang",
          "normalized_value": "PORT KLANG",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Loading: Port Klang"
        },
        "bl": null,
        "reason": "The draft BL could not be processed. No extraction result is available; retry processing."
      },
      {
        "field": "port_of_discharge",
        "status": "needs_review",
        "si": {
          "field": "port_of_discharge",
          "raw_value": "Singapore",
          "normalized_value": "SINGAPORE",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Port of Discharge: Singapore"
        },
        "bl": null,
        "reason": "The draft BL could not be processed. No extraction result is available; retry processing."
      },
      {
        "field": "container_count",
        "status": "needs_review",
        "si": {
          "field": "container_count",
          "raw_value": "2 x 40 HC",
          "normalized_value": "2",
          "unit": null,
          "confidence": 0.99,
          "page": 1,
          "evidence": "Container Count: 2 x 40 HC"
        },
        "bl": null,
        "reason": "The draft BL could not be processed. No extraction result is available; retry processing."
      },
      {
        "field": "gross_weight_kg",
        "status": "needs_review",
        "si": {
          "field": "gross_weight_kg",
          "raw_value": "22 MT",
          "normalized_value": "22000",
          "unit": "kg",
          "confidence": 0.99,
          "page": 1,
          "evidence": "Gross Weight: 22 MT"
        },
        "bl": null,
        "reason": "The draft BL could not be processed. No extraction result is available; retry processing."
      }
    ]
  }
];
