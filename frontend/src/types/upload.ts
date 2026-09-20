import type {
  CaseStatus,
  FieldComparison,
  ReviewReason,
  ShippingFields,
} from "./verification";

export interface UploadedFileReference {
  filename: string;
  source_filename: string;
  attachment_url: string;
}

export interface UploadComparisonResponse {
  comparison_id: string;
  status: CaseStatus;
  review_reason?: ReviewReason | null;
  si_file: UploadedFileReference;
  bl_file: UploadedFileReference;
  si_fields?: ShippingFields | null;
  bl_fields?: ShippingFields | null;
  comparison: FieldComparison[];
}
