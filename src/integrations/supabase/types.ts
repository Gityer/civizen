
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activation_decisions": {
                  Row: {
                    "created_at": string,"decision": Database["public"]['Enums']["activation_review_decision"],"id": string,"metadata": NonNullable<Json>,"notes": string | null,"review_id": string,"reviewer_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decision": Database["public"]['Enums']["activation_review_decision"],"id"?: string,"metadata"?: NonNullable<Json>,"notes"?: string | null,"review_id": string,"reviewer_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"decision"?: Database["public"]['Enums']["activation_review_decision"],"id"?: string,"metadata"?: NonNullable<Json>,"notes"?: string | null,"review_id"?: string,"reviewer_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_decisions_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "activation_threshold_reviews"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activation_decisions_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_demographic_feed_adapters": {
                  Row: {
                    "adapter_key": string,"adapter_name": string,"adapter_type": Database["public"]['Enums']["activation_demographic_feed_adapter_type"],"added_by": string | null,"country_code": string,"created_at": string,"endpoint_url": string | null,"id": string,"is_active": boolean,"key_algorithm": string,"last_ingested_at": string | null,"metadata": NonNullable<Json>,"public_signer_key": string,"scope_type": Database["public"]['Enums']["activation_scope_type"],"updated_at": string,"worker_sweep_interval_minutes": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter_key": string,"adapter_name": string,"adapter_type"?: Database["public"]['Enums']["activation_demographic_feed_adapter_type"],"added_by"?: string | null,"country_code"?: string,"created_at"?: string,"endpoint_url"?: string | null,"id"?: string,"is_active"?: boolean,"key_algorithm"?: string,"last_ingested_at"?: string | null,"metadata"?: NonNullable<Json>,"public_signer_key": string,"scope_type"?: Database["public"]['Enums']["activation_scope_type"],"updated_at"?: string,"worker_sweep_interval_minutes"?: number | null
                  }
                  Update: {
                    "adapter_key"?: string,"adapter_name"?: string,"adapter_type"?: Database["public"]['Enums']["activation_demographic_feed_adapter_type"],"added_by"?: string | null,"country_code"?: string,"created_at"?: string,"endpoint_url"?: string | null,"id"?: string,"is_active"?: boolean,"key_algorithm"?: string,"last_ingested_at"?: string | null,"metadata"?: NonNullable<Json>,"public_signer_key"?: string,"scope_type"?: Database["public"]['Enums']["activation_scope_type"],"updated_at"?: string,"worker_sweep_interval_minutes"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_demographic_feed_adapters_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_demographic_feed_ingestions": {
                  Row: {
                    "adapter_id": string,"country_code": string,"created_at": string,"id": string,"ingested_by": string | null,"ingestion_metadata": NonNullable<Json>,"ingestion_notes": string | null,"ingestion_status": string,"observed_at": string,"payload_hash": string | null,"payload_signature": string | null,"scope_type": Database["public"]['Enums']["activation_scope_type"],"signature_verified": boolean,"signed_payload": string | null,"snapshot_id": string | null,"target_population": number
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter_id": string,"country_code"?: string,"created_at"?: string,"id"?: string,"ingested_by"?: string | null,"ingestion_metadata"?: NonNullable<Json>,"ingestion_notes"?: string | null,"ingestion_status"?: string,"observed_at": string,"payload_hash"?: string | null,"payload_signature"?: string | null,"scope_type": Database["public"]['Enums']["activation_scope_type"],"signature_verified"?: boolean,"signed_payload"?: string | null,"snapshot_id"?: string | null,"target_population": number
                  }
                  Update: {
                    "adapter_id"?: string,"country_code"?: string,"created_at"?: string,"id"?: string,"ingested_by"?: string | null,"ingestion_metadata"?: NonNullable<Json>,"ingestion_notes"?: string | null,"ingestion_status"?: string,"observed_at"?: string,"payload_hash"?: string | null,"payload_signature"?: string | null,"scope_type"?: Database["public"]['Enums']["activation_scope_type"],"signature_verified"?: boolean,"signed_payload"?: string | null,"snapshot_id"?: string | null,"target_population"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_demographic_feed_ingestions_adapter_id_fkey"
      columns: ["adapter_id"]
isOneToOne: false
      referencedRelation: "activation_demographic_feed_adapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activation_demographic_feed_ingestions_ingested_by_fkey"
      columns: ["ingested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activation_demographic_feed_ingestions_snapshot_id_fkey"
      columns: ["snapshot_id"]
isOneToOne: false
      referencedRelation: "activation_demographic_snapshots"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_demographic_feed_worker_escalation_policies": {
                  Row: {
                    "created_at": string,"escalation_enabled": boolean,"escalation_severity": string,"freshness_hours": number,"id": string,"metadata": NonNullable<Json>,"minimum_adapter_issues_for_escalation": number,"policy_key": string,"policy_name": string,"policy_schema_version": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"escalation_enabled"?: boolean,"escalation_severity"?: string,"freshness_hours"?: number,"id"?: string,"metadata"?: NonNullable<Json>,"minimum_adapter_issues_for_escalation"?: number,"policy_key": string,"policy_name": string,"policy_schema_version"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"escalation_enabled"?: boolean,"escalation_severity"?: string,"freshness_hours"?: number,"id"?: string,"metadata"?: NonNullable<Json>,"minimum_adapter_issues_for_escalation"?: number,"policy_key"?: string,"policy_name"?: string,"policy_schema_version"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_demographic_feed_worker_escalation_p_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_demographic_feed_worker_escalation_policy_events": {
                  Row: {
                    "actor_profile_id": string | null,"created_at": string,"event_message": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"policy_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"event_message": string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"policy_key": string
                  }
                  Update: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"event_message"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"policy_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_demographic_feed_worker_escala_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_demographic_feed_worker_outbox": {
                  Row: {
                    "adapter_id": string,"attempt_count": number,"claim_expires_at": string | null,"claimed_at": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"error_message": string | null,"id": string,"metadata": NonNullable<Json>,"requested_at": string,"status": string,"updated_at": string,"worker_identity": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter_id": string,"attempt_count"?: number,"claim_expires_at"?: string | null,"claimed_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"error_message"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"requested_at"?: string,"status"?: string,"updated_at"?: string,"worker_identity"?: string | null
                  }
                  Update: {
                    "adapter_id"?: string,"attempt_count"?: number,"claim_expires_at"?: string | null,"claimed_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"error_message"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"requested_at"?: string,"status"?: string,"updated_at"?: string,"worker_identity"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_demographic_feed_worker_outbox_adapter_id_fkey"
      columns: ["adapter_id"]
isOneToOne: false
      referencedRelation: "activation_demographic_feed_adapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activation_demographic_feed_worker_outbox_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_demographic_feed_worker_runs": {
                  Row: {
                    "adapter_id": string,"alert_message": string,"alert_severity": string,"alert_type": Database["public"]['Enums']["activation_demographic_feed_alert_type"],"created_at": string,"created_by": string | null,"id": string,"metadata": NonNullable<Json>,"observed_at": string,"payload_hash": string | null,"resolved_at": string | null,"run_status": Database["public"]['Enums']["activation_demographic_feed_worker_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter_id": string,"alert_message": string,"alert_severity"?: string,"alert_type": Database["public"]['Enums']["activation_demographic_feed_alert_type"],"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"observed_at"?: string,"payload_hash"?: string | null,"resolved_at"?: string | null,"run_status": Database["public"]['Enums']["activation_demographic_feed_worker_status"],"updated_at"?: string
                  }
                  Update: {
                    "adapter_id"?: string,"alert_message"?: string,"alert_severity"?: string,"alert_type"?: Database["public"]['Enums']["activation_demographic_feed_alert_type"],"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"observed_at"?: string,"payload_hash"?: string | null,"resolved_at"?: string | null,"run_status"?: Database["public"]['Enums']["activation_demographic_feed_worker_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_demographic_feed_worker_runs_adapter_id_fkey"
      columns: ["adapter_id"]
isOneToOne: false
      referencedRelation: "activation_demographic_feed_adapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activation_demographic_feed_worker_runs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_demographic_feed_worker_schedule_automation_runs": {
                  Row: {
                    "adapter_issue_count": number,"created_at": string,"force_reschedule_applied": boolean,"id": string,"jobs_enqueued_count": number,"metadata": NonNullable<Json>,"open_or_ack_page_count": number,"run_finished_at": string | null,"run_message": string | null,"run_started_at": string,"run_status": string,"trigger_source": string,"triggered_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter_issue_count"?: number,"created_at"?: string,"force_reschedule_applied"?: boolean,"id"?: string,"jobs_enqueued_count"?: number,"metadata"?: NonNullable<Json>,"open_or_ack_page_count"?: number,"run_finished_at"?: string | null,"run_message"?: string | null,"run_started_at"?: string,"run_status": string,"trigger_source": string,"triggered_by"?: string | null
                  }
                  Update: {
                    "adapter_issue_count"?: number,"created_at"?: string,"force_reschedule_applied"?: boolean,"id"?: string,"jobs_enqueued_count"?: number,"metadata"?: NonNullable<Json>,"open_or_ack_page_count"?: number,"run_finished_at"?: string | null,"run_message"?: string | null,"run_started_at"?: string,"run_status"?: string,"trigger_source"?: string,"triggered_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_demographic_feed_worker_schedule_a_triggered_by_fkey"
      columns: ["triggered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_demographic_feed_worker_schedule_policies": {
                  Row: {
                    "claim_ttl_minutes": number,"default_interval_minutes": number,"id": string,"policy_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "claim_ttl_minutes"?: number,"default_interval_minutes"?: number,"id"?: string,"policy_key": string,"updated_at"?: string
                  }
                  Update: {
                    "claim_ttl_minutes"?: number,"default_interval_minutes"?: number,"id"?: string,"policy_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"activation_demographic_snapshots": {
                  Row: {
                    "country_code": string,"created_at": string,"created_by": string | null,"id": string,"ingestion_notes": string | null,"jurisdiction_label": string,"metadata": NonNullable<Json>,"observed_at": string,"scope_type": Database["public"]['Enums']["activation_scope_type"],"source_label": string,"source_url": string | null,"target_population": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "country_code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"ingestion_notes"?: string | null,"jurisdiction_label"?: string,"metadata"?: NonNullable<Json>,"observed_at"?: string,"scope_type": Database["public"]['Enums']["activation_scope_type"],"source_label": string,"source_url"?: string | null,"target_population": number,"updated_at"?: string
                  }
                  Update: {
                    "country_code"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"ingestion_notes"?: string | null,"jurisdiction_label"?: string,"metadata"?: NonNullable<Json>,"observed_at"?: string,"scope_type"?: Database["public"]['Enums']["activation_scope_type"],"source_label"?: string,"source_url"?: string | null,"target_population"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_demographic_snapshots_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_evidence": {
                  Row: {
                    "created_at": string,"created_by": string | null,"evidence_type": string,"id": string,"metadata": NonNullable<Json>,"metric_key": string | null,"metric_value": number | null,"notes": string | null,"observed_at": string | null,"review_id": string,"source_label": string | null,"source_url": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"evidence_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"metric_key"?: string | null,"metric_value"?: number | null,"notes"?: string | null,"observed_at"?: string | null,"review_id": string,"source_label"?: string | null,"source_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"evidence_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"metric_key"?: string | null,"metric_value"?: number | null,"notes"?: string | null,"observed_at"?: string | null,"review_id"?: string,"source_label"?: string | null,"source_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_evidence_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activation_evidence_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "activation_threshold_reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"activation_threshold_reviews": {
                  Row: {
                    "country_code": string,"created_at": string,"declaration_notes": string | null,"declared_at": string | null,"declared_by": string | null,"eligible_verified_citizens_count": number,"id": string,"jurisdiction_label": string,"metadata": NonNullable<Json>,"opened_at": string,"opened_by": string | null,"review_notes": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"scope_type": Database["public"]['Enums']["activation_scope_type"],"status": Database["public"]['Enums']["activation_review_status"],"target_population": number | null,"threshold_percent": number,"updated_at": string,"verified_citizens_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "country_code"?: string,"created_at"?: string,"declaration_notes"?: string | null,"declared_at"?: string | null,"declared_by"?: string | null,"eligible_verified_citizens_count"?: number,"id"?: string,"jurisdiction_label"?: string,"metadata"?: NonNullable<Json>,"opened_at"?: string,"opened_by"?: string | null,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"scope_type": Database["public"]['Enums']["activation_scope_type"],"status"?: Database["public"]['Enums']["activation_review_status"],"target_population"?: number | null,"threshold_percent"?: number,"updated_at"?: string,"verified_citizens_count"?: number
                  }
                  Update: {
                    "country_code"?: string,"created_at"?: string,"declaration_notes"?: string | null,"declared_at"?: string | null,"declared_by"?: string | null,"eligible_verified_citizens_count"?: number,"id"?: string,"jurisdiction_label"?: string,"metadata"?: NonNullable<Json>,"opened_at"?: string,"opened_by"?: string | null,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"scope_type"?: Database["public"]['Enums']["activation_scope_type"],"status"?: Database["public"]['Enums']["activation_review_status"],"target_population"?: number | null,"threshold_percent"?: number,"updated_at"?: string,"verified_citizens_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "activation_threshold_reviews_declared_by_fkey"
      columns: ["declared_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activation_threshold_reviews_opened_by_fkey"
      columns: ["opened_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activation_threshold_reviews_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_attachments": {
                  Row: {
                    "agreement_id": string,"byte_size": number | null,"content_type": string | null,"created_at": string,"file_name": string,"file_path": string,"fingerprint": string | null,"id": string,"kind": string,"uploaded_by": string | null,"version_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"byte_size"?: number | null,"content_type"?: string | null,"created_at"?: string,"file_name": string,"file_path": string,"fingerprint"?: string | null,"id"?: string,"kind"?: string,"uploaded_by"?: string | null,"version_id"?: string | null
                  }
                  Update: {
                    "agreement_id"?: string,"byte_size"?: number | null,"content_type"?: string | null,"created_at"?: string,"file_name"?: string,"file_path"?: string,"fingerprint"?: string | null,"id"?: string,"kind"?: string,"uploaded_by"?: string | null,"version_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_attachments_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_attachments_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_attachments_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "agreement_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_events": {
                  Row: {
                    "actor_profile_id": string | null,"agreement_id": string,"created_at": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"party_id": string | null,"version_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_profile_id"?: string | null,"agreement_id": string,"created_at"?: string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"party_id"?: string | null,"version_id"?: string | null
                  }
                  Update: {
                    "actor_profile_id"?: string | null,"agreement_id"?: string,"created_at"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"party_id"?: string | null,"version_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_events_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_events_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_events_party_id_fkey"
      columns: ["party_id"]
isOneToOne: false
      referencedRelation: "agreement_parties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_events_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "agreement_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_parties": {
                  Row: {
                    "agreement_id": string,"contact": string | null,"created_at": string,"display_name": string,"id": string,"legal_name": string | null,"party_kind": string,"profile_id": string | null,"representative_name": string | null,"representative_title": string | null,"role_in_agreement": string | null,"snapshot": NonNullable<Json>,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"contact"?: string | null,"created_at"?: string,"display_name": string,"id"?: string,"legal_name"?: string | null,"party_kind": string,"profile_id"?: string | null,"representative_name"?: string | null,"representative_title"?: string | null,"role_in_agreement"?: string | null,"snapshot"?: NonNullable<Json>,"sort_order"?: number
                  }
                  Update: {
                    "agreement_id"?: string,"contact"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string,"legal_name"?: string | null,"party_kind"?: string,"profile_id"?: string | null,"representative_name"?: string | null,"representative_title"?: string | null,"role_in_agreement"?: string | null,"snapshot"?: NonNullable<Json>,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_parties_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_parties_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_reference_counters": {
                  Row: {
                    "last_value": number,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "last_value"?: number,"year": number
                  }
                  Update: {
                    "last_value"?: number,"year"?: number
                  }
                  Relationships: [
                    
                  ]
                },"agreement_relationships": {
                  Row: {
                    "agreement_id": string,"created_at": string,"entity_id": string | null,"entity_type": string,"id": string,"label_snapshot": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"created_at"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: string,"label_snapshot": string
                  }
                  Update: {
                    "agreement_id"?: string,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: string,"label_snapshot"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_relationships_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_review_notes": {
                  Row: {
                    "agreement_id": string,"author_profile_id": string | null,"body": string,"created_at": string,"id": string,"version_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"author_profile_id"?: string | null,"body": string,"created_at"?: string,"id"?: string,"version_id"?: string | null
                  }
                  Update: {
                    "agreement_id"?: string,"author_profile_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"version_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_review_notes_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_review_notes_author_profile_id_fkey"
      columns: ["author_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_review_notes_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "agreement_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_signatories": {
                  Row: {
                    "agreement_id": string,"created_at": string,"display_name": string | null,"id": string,"kind": string,"party_id": string,"profile_id": string | null,"title_snapshot": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"created_at"?: string,"display_name"?: string | null,"id"?: string,"kind"?: string,"party_id": string,"profile_id"?: string | null,"title_snapshot"?: string | null
                  }
                  Update: {
                    "agreement_id"?: string,"created_at"?: string,"display_name"?: string | null,"id"?: string,"kind"?: string,"party_id"?: string,"profile_id"?: string | null,"title_snapshot"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_signatories_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_signatories_party_id_fkey"
      columns: ["party_id"]
isOneToOne: false
      referencedRelation: "agreement_parties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_signatories_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_signatures": {
                  Row: {
                    "agreement_id": string,"authority_attested": boolean,"electronic_records_consent": boolean,"electronic_signature_consent": boolean,"fingerprint": string,"id": string,"metadata": NonNullable<Json>,"party_id": string,"party_name_snapshot": string,"representative_title_snapshot": string | null,"role_snapshot": string | null,"signatory_id": string,"signed_at": string,"signer_name_snapshot": string,"signer_profile_id": string | null,"signer_user_id": string | null,"signing_method": string,"status": string,"version_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"authority_attested"?: boolean,"electronic_records_consent"?: boolean,"electronic_signature_consent"?: boolean,"fingerprint": string,"id"?: string,"metadata"?: NonNullable<Json>,"party_id": string,"party_name_snapshot": string,"representative_title_snapshot"?: string | null,"role_snapshot"?: string | null,"signatory_id": string,"signed_at"?: string,"signer_name_snapshot": string,"signer_profile_id"?: string | null,"signer_user_id"?: string | null,"signing_method"?: string,"status"?: string,"version_id": string
                  }
                  Update: {
                    "agreement_id"?: string,"authority_attested"?: boolean,"electronic_records_consent"?: boolean,"electronic_signature_consent"?: boolean,"fingerprint"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"party_id"?: string,"party_name_snapshot"?: string,"representative_title_snapshot"?: string | null,"role_snapshot"?: string | null,"signatory_id"?: string,"signed_at"?: string,"signer_name_snapshot"?: string,"signer_profile_id"?: string | null,"signer_user_id"?: string | null,"signing_method"?: string,"status"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_signatures_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_signatures_party_id_fkey"
      columns: ["party_id"]
isOneToOne: false
      referencedRelation: "agreement_parties"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_signatures_signatory_id_fkey"
      columns: ["signatory_id"]
isOneToOne: false
      referencedRelation: "agreement_signatories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_signatures_signer_profile_id_fkey"
      columns: ["signer_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_signatures_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "agreement_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"agreement_versions": {
                  Row: {
                    "agreement_id": string,"attachments_snapshot": NonNullable<Json>,"change_note": string | null,"content": NonNullable<Json>,"created_at": string,"created_by": string | null,"fingerprint": string | null,"id": string,"locked_at": string | null,"parties_snapshot": NonNullable<Json>,"signatories_snapshot": NonNullable<Json>,"version_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id": string,"attachments_snapshot"?: NonNullable<Json>,"change_note"?: string | null,"content"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"fingerprint"?: string | null,"id"?: string,"locked_at"?: string | null,"parties_snapshot"?: NonNullable<Json>,"signatories_snapshot"?: NonNullable<Json>,"version_number": number
                  }
                  Update: {
                    "agreement_id"?: string,"attachments_snapshot"?: NonNullable<Json>,"change_note"?: string | null,"content"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"fingerprint"?: string | null,"id"?: string,"locked_at"?: string | null,"parties_snapshot"?: NonNullable<Json>,"signatories_snapshot"?: NonNullable<Json>,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreement_versions_agreement_id_fkey"
      columns: ["agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreement_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"agreements": {
                  Row: {
                    "activated_at": string | null,"agreement_type": string | null,"amends_agreement_id": string | null,"body_markdown": string,"buyer_profile_id": string | null,"buyer_signed_at": string | null,"completed_at": string | null,"created_at": string,"current_version_id": string | null,"effective_at": string | null,"end_at": string | null,"executed_at": string | null,"executed_version_id": string | null,"execution_method": string | null,"id": string,"initiator_profile_id": string,"listing_kind_snapshot": string,"listing_price_lumens_snapshot": number | null,"listing_title_snapshot": string | null,"market_listing_id": string | null,"owner_profile_id": string | null,"party_reference": string | null,"reference_code": string | null,"seller_profile_id": string | null,"seller_signed_at": string | null,"signed_at": string | null,"signed_snapshot": Json | null,"status": string,"summary": string | null,"template_key": string | null,"terminated_at": string | null,"termination_reason": string | null,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string | null,"agreement_type"?: string | null,"amends_agreement_id"?: string | null,"body_markdown": string,"buyer_profile_id"?: string | null,"buyer_signed_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"current_version_id"?: string | null,"effective_at"?: string | null,"end_at"?: string | null,"executed_at"?: string | null,"executed_version_id"?: string | null,"execution_method"?: string | null,"id"?: string,"initiator_profile_id": string,"listing_kind_snapshot"?: string,"listing_price_lumens_snapshot"?: number | null,"listing_title_snapshot"?: string | null,"market_listing_id"?: string | null,"owner_profile_id"?: string | null,"party_reference"?: string | null,"reference_code"?: string | null,"seller_profile_id"?: string | null,"seller_signed_at"?: string | null,"signed_at"?: string | null,"signed_snapshot"?: Json | null,"status"?: string,"summary"?: string | null,"template_key"?: string | null,"terminated_at"?: string | null,"termination_reason"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "activated_at"?: string | null,"agreement_type"?: string | null,"amends_agreement_id"?: string | null,"body_markdown"?: string,"buyer_profile_id"?: string | null,"buyer_signed_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"current_version_id"?: string | null,"effective_at"?: string | null,"end_at"?: string | null,"executed_at"?: string | null,"executed_version_id"?: string | null,"execution_method"?: string | null,"id"?: string,"initiator_profile_id"?: string,"listing_kind_snapshot"?: string,"listing_price_lumens_snapshot"?: number | null,"listing_title_snapshot"?: string | null,"market_listing_id"?: string | null,"owner_profile_id"?: string | null,"party_reference"?: string | null,"reference_code"?: string | null,"seller_profile_id"?: string | null,"seller_signed_at"?: string | null,"signed_at"?: string | null,"signed_snapshot"?: Json | null,"status"?: string,"summary"?: string | null,"template_key"?: string | null,"terminated_at"?: string | null,"termination_reason"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agreements_amends_agreement_id_fkey"
      columns: ["amends_agreement_id"]
isOneToOne: false
      referencedRelation: "agreements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_buyer_profile_id_fkey"
      columns: ["buyer_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_current_version_fk"
      columns: ["current_version_id"]
isOneToOne: false
      referencedRelation: "agreement_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_executed_version_fk"
      columns: ["executed_version_id"]
isOneToOne: false
      referencedRelation: "agreement_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_initiator_profile_id_fkey"
      columns: ["initiator_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_market_listing_id_fkey"
      columns: ["market_listing_id"]
isOneToOne: false
      referencedRelation: "market_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_owner_profile_id_fkey"
      columns: ["owner_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agreements_seller_profile_id_fkey"
      columns: ["seller_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_agent_runs": {
                  Row: {
                    "assignment_id": string,"created_at": string,"failure_reason": string | null,"finished_at": string | null,"id": string,"input_context": NonNullable<Json>,"output_summary": string | null,"revision_number": number,"started_at": string | null,"status": string,"task_id": string | null,"triggered_by": string,"usage_metadata": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"created_at"?: string,"failure_reason"?: string | null,"finished_at"?: string | null,"id"?: string,"input_context"?: NonNullable<Json>,"output_summary"?: string | null,"revision_number"?: number,"started_at"?: string | null,"status"?: string,"task_id"?: string | null,"triggered_by"?: string,"usage_metadata"?: NonNullable<Json>
                  }
                  Update: {
                    "assignment_id"?: string,"created_at"?: string,"failure_reason"?: string | null,"finished_at"?: string | null,"id"?: string,"input_context"?: NonNullable<Json>,"output_summary"?: string | null,"revision_number"?: number,"started_at"?: string | null,"status"?: string,"task_id"?: string | null,"triggered_by"?: string,"usage_metadata"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_agent_runs_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "matter_agent_assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_agent_runs_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_agents": {
                  Row: {
                    "capability_profile": NonNullable<Json>,"created_at": string,"description": string | null,"display_name": string,"id": string,"model_ref": string | null,"provider_ref": string | null,"role_type": string,"slug": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capability_profile"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"display_name": string,"id": string,"model_ref"?: string | null,"provider_ref"?: string | null,"role_type": string,"slug": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "capability_profile"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"display_name"?: string,"id"?: string,"model_ref"?: string | null,"provider_ref"?: string | null,"role_type"?: string,"slug"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"budget_expense_groups": {
                  Row: {
                    "archived_at": string | null,"budget_id": string,"created_at": string,"description": string | null,"display_order": number,"id": string,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"budget_id": string,"created_at"?: string,"description"?: string | null,"display_order"?: number,"id"?: string,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"budget_id"?: string,"created_at"?: string,"description"?: string | null,"display_order"?: number,"id"?: string,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_expense_groups_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "project_budgets"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_line_items": {
                  Row: {
                    "actual_minor": number,"committed_minor": number,"created_at": string,"created_by": string | null,"currency": string,"description": string | null,"funding_restriction_tag": string | null,"group_id": string,"id": string,"owner_label": string | null,"period_label": string | null,"planned_minor": number,"public_description": string | null,"publish_flag": boolean,"status": string,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_minor"?: number,"committed_minor"?: number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"description"?: string | null,"funding_restriction_tag"?: string | null,"group_id": string,"id"?: string,"owner_label"?: string | null,"period_label"?: string | null,"planned_minor"?: number,"public_description"?: string | null,"publish_flag"?: boolean,"status"?: string,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "actual_minor"?: number,"committed_minor"?: number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"description"?: string | null,"funding_restriction_tag"?: string | null,"group_id"?: string,"id"?: string,"owner_label"?: string | null,"period_label"?: string | null,"planned_minor"?: number,"public_description"?: string | null,"publish_flag"?: boolean,"status"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_line_items_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "budget_expense_groups"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_publications": {
                  Row: {
                    "action": string,"actor_user_id": string | null,"budget_id": string,"created_at": string,"id": string,"note": string | null,"public_snapshot": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_user_id"?: string | null,"budget_id": string,"created_at"?: string,"id"?: string,"note"?: string | null,"public_snapshot"?: NonNullable<Json>
                  }
                  Update: {
                    "action"?: string,"actor_user_id"?: string | null,"budget_id"?: string,"created_at"?: string,"id"?: string,"note"?: string | null,"public_snapshot"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_publications_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "project_budgets"
      referencedColumns: ["id"]
    }
                  ]
                },"budget_revisions": {
                  Row: {
                    "actor_user_id": string | null,"approval_reference": string | null,"budget_id": string,"change_summary": string,"changed_fields": NonNullable<Json>,"created_at": string,"id": string,"reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_user_id"?: string | null,"approval_reference"?: string | null,"budget_id": string,"change_summary": string,"changed_fields"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"reason"?: string | null
                  }
                  Update: {
                    "actor_user_id"?: string | null,"approval_reference"?: string | null,"budget_id"?: string,"change_summary"?: string,"changed_fields"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "budget_revisions_budget_id_fkey"
      columns: ["budget_id"]
isOneToOne: false
      referencedRelation: "project_budgets"
      referencedColumns: ["id"]
    }
                  ]
                },"business_account_access_requests": {
                  Row: {
                    "created_at": string,"id": string,"request_note": string | null,"requester_profile_id": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"target_profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"request_note"?: string | null,"requester_profile_id": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"target_profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"request_note"?: string | null,"requester_profile_id"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"target_profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_account_access_requests_requester_profile_id_fkey"
      columns: ["requester_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_account_access_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_account_access_requests_target_profile_id_fkey"
      columns: ["target_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"business_account_link_grants": {
                  Row: {
                    "business_name_normalized": string | null,"consumed_at": string | null,"created_at": string,"expires_at": string,"id": string,"linked_profile_id": string | null,"owner_profile_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_name_normalized"?: string | null,"consumed_at"?: string | null,"created_at"?: string,"expires_at": string,"id"?: string,"linked_profile_id"?: string | null,"owner_profile_id": string,"token_hash": string
                  }
                  Update: {
                    "business_name_normalized"?: string | null,"consumed_at"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"linked_profile_id"?: string | null,"owner_profile_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_account_link_grants_linked_profile_id_fkey"
      columns: ["linked_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_account_link_grants_owner_profile_id_fkey"
      columns: ["owner_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"challenge_proposals": {
                  Row: {
                    "author_profile_id": string,"challenge_id": string,"created_at": string,"expected_result": string,"id": string,"implementation_approach": string | null,"rationale": string,"resources_needed": string | null,"risks": string | null,"status": string,"supporting_evidence": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_profile_id": string,"challenge_id": string,"created_at"?: string,"expected_result": string,"id"?: string,"implementation_approach"?: string | null,"rationale": string,"resources_needed"?: string | null,"risks"?: string | null,"status"?: string,"supporting_evidence"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_profile_id"?: string,"challenge_id"?: string,"created_at"?: string,"expected_result"?: string,"id"?: string,"implementation_approach"?: string | null,"rationale"?: string,"resources_needed"?: string | null,"risks"?: string | null,"status"?: string,"supporting_evidence"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenge_proposals_author_profile_id_fkey"
      columns: ["author_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenge_proposals_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "community_challenges"
      referencedColumns: ["id"]
    }
                  ]
                },"citizen_activation_scopes": {
                  Row: {
                    "activated_at": string,"activated_by": string | null,"country_code": string,"created_at": string,"id": string,"notes": string | null,"profile_id": string,"scope_type": Database["public"]['Enums']["activation_scope_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string,"activated_by"?: string | null,"country_code"?: string,"created_at"?: string,"id"?: string,"notes"?: string | null,"profile_id": string,"scope_type": Database["public"]['Enums']["activation_scope_type"]
                  }
                  Update: {
                    "activated_at"?: string,"activated_by"?: string | null,"country_code"?: string,"created_at"?: string,"id"?: string,"notes"?: string | null,"profile_id"?: string,"scope_type"?: Database["public"]['Enums']["activation_scope_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "citizen_activation_scopes_activated_by_fkey"
      columns: ["activated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "citizen_activation_scopes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civi_interaction_log": {
                  Row: {
                    "actor_profile_id": string | null,"answer": string,"answer_source": string,"audience": string,"channel": string,"conversation_id": string | null,"created_at": string,"id": string,"question": string,"remembered": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_profile_id"?: string | null,"answer": string,"answer_source": string,"audience": string,"channel": string,"conversation_id"?: string | null,"created_at"?: string,"id"?: string,"question": string,"remembered"?: boolean
                  }
                  Update: {
                    "actor_profile_id"?: string | null,"answer"?: string,"answer_source"?: string,"audience"?: string,"channel"?: string,"conversation_id"?: string | null,"created_at"?: string,"id"?: string,"question"?: string,"remembered"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "civi_interaction_log_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civi_learned_memories": {
                  Row: {
                    "answer": string,"created_at": string,"hit_count": number,"id": string,"kind": string,"last_used_at": string | null,"question": string,"question_key": string,"source": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"created_at"?: string,"hit_count"?: number,"id"?: string,"kind": string,"last_used_at"?: string | null,"question": string,"question_key": string,"source"?: string,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: string,"created_at"?: string,"hit_count"?: number,"id"?: string,"kind"?: string,"last_used_at"?: string | null,"question"?: string,"question_key"?: string,"source"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"civic_assisted_ballots": {
                  Row: {
                    "accessibility_reason": string,"assistant_confirmed_at": string | null,"assistant_profile_id": string,"audit_notes": string,"ballot_commitment": string | null,"created_at": string,"election_id": string,"id": string,"metadata": NonNullable<Json>,"status": Database["public"]['Enums']["civic_assisted_ballot_status"],"steward_confirmed_at": string | null,"steward_profile_id": string | null,"updated_at": string,"voter_profile_id": string,"witness_confirmed_at": string | null,"witness_profile_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accessibility_reason"?: string,"assistant_confirmed_at"?: string | null,"assistant_profile_id": string,"audit_notes"?: string,"ballot_commitment"?: string | null,"created_at"?: string,"election_id": string,"id"?: string,"metadata"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["civic_assisted_ballot_status"],"steward_confirmed_at"?: string | null,"steward_profile_id"?: string | null,"updated_at"?: string,"voter_profile_id": string,"witness_confirmed_at"?: string | null,"witness_profile_id"?: string | null
                  }
                  Update: {
                    "accessibility_reason"?: string,"assistant_confirmed_at"?: string | null,"assistant_profile_id"?: string,"audit_notes"?: string,"ballot_commitment"?: string | null,"created_at"?: string,"election_id"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["civic_assisted_ballot_status"],"steward_confirmed_at"?: string | null,"steward_profile_id"?: string | null,"updated_at"?: string,"voter_profile_id"?: string,"witness_confirmed_at"?: string | null,"witness_profile_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_assisted_ballots_assistant_profile_id_fkey"
      columns: ["assistant_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_assisted_ballots_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_assisted_ballots_steward_profile_id_fkey"
      columns: ["steward_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_assisted_ballots_voter_profile_id_fkey"
      columns: ["voter_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_assisted_ballots_witness_profile_id_fkey"
      columns: ["witness_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_ballot_selections": {
                  Row: {
                    "ballot_id": string,"candidate_id": string | null,"contest_id": string,"created_at": string,"id": string,"is_abstain": boolean,"rank": number | null,"selection_ciphertext": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ballot_id": string,"candidate_id"?: string | null,"contest_id": string,"created_at"?: string,"id"?: string,"is_abstain"?: boolean,"rank"?: number | null,"selection_ciphertext"?: string | null
                  }
                  Update: {
                    "ballot_id"?: string,"candidate_id"?: string | null,"contest_id"?: string,"created_at"?: string,"id"?: string,"is_abstain"?: boolean,"rank"?: number | null,"selection_ciphertext"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_ballot_selections_ballot_id_fkey"
      columns: ["ballot_id"]
isOneToOne: false
      referencedRelation: "civic_ballots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_ballot_selections_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "civic_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_ballot_selections_contest_id_fkey"
      columns: ["contest_id"]
isOneToOne: false
      referencedRelation: "civic_contests"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_ballots": {
                  Row: {
                    "ballot_commitment": string,"cast_at": string,"created_at": string,"election_id": string,"encrypted_payload": string | null,"id": string,"inclusion_proof_salt": string | null,"is_countable": boolean,"is_duress": boolean,"metadata": NonNullable<Json>,"profile_id": string,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ballot_commitment": string,"cast_at"?: string,"created_at"?: string,"election_id": string,"encrypted_payload"?: string | null,"id"?: string,"inclusion_proof_salt"?: string | null,"is_countable"?: boolean,"is_duress"?: boolean,"metadata"?: NonNullable<Json>,"profile_id": string,"session_id": string
                  }
                  Update: {
                    "ballot_commitment"?: string,"cast_at"?: string,"created_at"?: string,"election_id"?: string,"encrypted_payload"?: string | null,"id"?: string,"inclusion_proof_salt"?: string | null,"is_countable"?: boolean,"is_duress"?: boolean,"metadata"?: NonNullable<Json>,"profile_id"?: string,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_ballots_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_ballots_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_ballots_session_id_fkey"
      columns: ["session_id"]
isOneToOne: true
      referencedRelation: "civic_vote_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_candidate_challenges": {
                  Row: {
                    "candidate_id": string | null,"challenger_id": string,"contest_id": string,"created_at": string,"election_id": string,"id": string,"metadata": NonNullable<Json>,"reason": string,"resolution_notes": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["civic_challenge_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id"?: string | null,"challenger_id": string,"contest_id": string,"created_at"?: string,"election_id": string,"id"?: string,"metadata"?: NonNullable<Json>,"reason": string,"resolution_notes"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["civic_challenge_status"],"updated_at"?: string
                  }
                  Update: {
                    "candidate_id"?: string | null,"challenger_id"?: string,"contest_id"?: string,"created_at"?: string,"election_id"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"reason"?: string,"resolution_notes"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["civic_challenge_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_candidate_challenges_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "civic_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_candidate_challenges_challenger_id_fkey"
      columns: ["challenger_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_candidate_challenges_contest_id_fkey"
      columns: ["contest_id"]
isOneToOne: false
      referencedRelation: "civic_contests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_candidate_challenges_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_candidate_challenges_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_candidates": {
                  Row: {
                    "contest_id": string,"created_at": string,"display_name": string,"id": string,"is_write_in_slot": boolean,"metadata": NonNullable<Json>,"option_key": string | null,"profile_id": string | null,"sort_order": number,"statement": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contest_id": string,"created_at"?: string,"display_name": string,"id"?: string,"is_write_in_slot"?: boolean,"metadata"?: NonNullable<Json>,"option_key"?: string | null,"profile_id"?: string | null,"sort_order"?: number,"statement"?: string,"updated_at"?: string
                  }
                  Update: {
                    "contest_id"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"is_write_in_slot"?: boolean,"metadata"?: NonNullable<Json>,"option_key"?: string | null,"profile_id"?: string | null,"sort_order"?: number,"statement"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_candidates_contest_id_fkey"
      columns: ["contest_id"]
isOneToOne: false
      referencedRelation: "civic_contests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_candidates_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_canvass_samples": {
                  Row: {
                    "auditor_id": string | null,"created_at": string,"election_id": string,"id": string,"metadata": NonNullable<Json>,"process_notes": string,"reviewed_at": string | null,"sample_bucket": string,"session_id": string,"status": Database["public"]['Enums']["civic_canvass_sample_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auditor_id"?: string | null,"created_at"?: string,"election_id": string,"id"?: string,"metadata"?: NonNullable<Json>,"process_notes"?: string,"reviewed_at"?: string | null,"sample_bucket"?: string,"session_id": string,"status"?: Database["public"]['Enums']["civic_canvass_sample_status"],"updated_at"?: string
                  }
                  Update: {
                    "auditor_id"?: string | null,"created_at"?: string,"election_id"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"process_notes"?: string,"reviewed_at"?: string | null,"sample_bucket"?: string,"session_id"?: string,"status"?: Database["public"]['Enums']["civic_canvass_sample_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_canvass_samples_auditor_id_fkey"
      columns: ["auditor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_canvass_samples_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_canvass_samples_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "civic_vote_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_client_attestations": {
                  Row: {
                    "android_version_code": number | null,"app_release_id": string,"app_version": string,"attestation_ok": boolean,"checked_at": string,"created_at": string,"device_registration_id": string | null,"expected_release_id": string | null,"id": string,"metadata": NonNullable<Json>,"package_fingerprint": string | null,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "android_version_code"?: number | null,"app_release_id": string,"app_version": string,"attestation_ok"?: boolean,"checked_at"?: string,"created_at"?: string,"device_registration_id"?: string | null,"expected_release_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"package_fingerprint"?: string | null,"profile_id": string
                  }
                  Update: {
                    "android_version_code"?: number | null,"app_release_id"?: string,"app_version"?: string,"attestation_ok"?: boolean,"checked_at"?: string,"created_at"?: string,"device_registration_id"?: string | null,"expected_release_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"package_fingerprint"?: string | null,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_client_attestations_device_registration_id_fkey"
      columns: ["device_registration_id"]
isOneToOne: false
      referencedRelation: "civic_device_registrations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_client_attestations_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_consultation_public_presence": {
                  Row: {
                    "consented_at": string | null,"created_at": string,"election_id": string,"profile_id": string,"updated_at": string,"visible": boolean,"withdrawn_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "consented_at"?: string | null,"created_at"?: string,"election_id": string,"profile_id": string,"updated_at"?: string,"visible"?: boolean,"withdrawn_at"?: string | null
                  }
                  Update: {
                    "consented_at"?: string | null,"created_at"?: string,"election_id"?: string,"profile_id"?: string,"updated_at"?: string,"visible"?: boolean,"withdrawn_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_consultation_public_presence_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_consultation_public_presence_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_contests": {
                  Row: {
                    "allow_abstain": boolean,"contest_kind": Database["public"]['Enums']["civic_contest_kind"],"created_at": string,"election_id": string,"id": string,"metadata": NonNullable<Json>,"office_key": string | null,"seat_count": number,"sort_order": number,"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allow_abstain"?: boolean,"contest_kind"?: Database["public"]['Enums']["civic_contest_kind"],"created_at"?: string,"election_id": string,"id"?: string,"metadata"?: NonNullable<Json>,"office_key"?: string | null,"seat_count"?: number,"sort_order"?: number,"summary"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "allow_abstain"?: boolean,"contest_kind"?: Database["public"]['Enums']["civic_contest_kind"],"created_at"?: string,"election_id"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"office_key"?: string | null,"seat_count"?: number,"sort_order"?: number,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_contests_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_device_registrations": {
                  Row: {
                    "attestation_checked_at": string | null,"attestation_status": string,"created_at": string,"device_fingerprint_hash": string | null,"id": string,"is_active": boolean,"last_seen_at": string | null,"metadata": NonNullable<Json>,"platform": string,"profile_id": string,"push_token": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attestation_checked_at"?: string | null,"attestation_status"?: string,"created_at"?: string,"device_fingerprint_hash"?: string | null,"id"?: string,"is_active"?: boolean,"last_seen_at"?: string | null,"metadata"?: NonNullable<Json>,"platform": string,"profile_id": string,"push_token"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "attestation_checked_at"?: string | null,"attestation_status"?: string,"created_at"?: string,"device_fingerprint_hash"?: string | null,"id"?: string,"is_active"?: boolean,"last_seen_at"?: string | null,"metadata"?: NonNullable<Json>,"platform"?: string,"profile_id"?: string,"push_token"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_device_registrations_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_duress_alerts": {
                  Row: {
                    "acknowledged_at": string | null,"acknowledged_by": string | null,"created_at": string,"election_id": string | null,"id": string,"metadata": NonNullable<Json>,"profile_id": string,"session_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"acknowledged_by"?: string | null,"created_at"?: string,"election_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"profile_id": string,"session_id"?: string | null
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"acknowledged_by"?: string | null,"created_at"?: string,"election_id"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"profile_id"?: string,"session_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_duress_alerts_acknowledged_by_fkey"
      columns: ["acknowledged_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_duress_alerts_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_duress_alerts_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_duress_alerts_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "civic_vote_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_duress_settings": {
                  Row: {
                    "alert_enabled": boolean,"created_at": string,"duress_pin_hash": string,"enrolled_at": string,"id": string,"metadata": NonNullable<Json>,"pin_salt": string,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_enabled"?: boolean,"created_at"?: string,"duress_pin_hash": string,"enrolled_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"pin_salt": string,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "alert_enabled"?: boolean,"created_at"?: string,"duress_pin_hash"?: string,"enrolled_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"pin_salt"?: string,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_duress_settings_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_election_observers": {
                  Row: {
                    "accredited_at": string,"accredited_by": string | null,"created_at": string,"election_id": string,"id": string,"is_active": boolean,"metadata": NonNullable<Json>,"observer_role": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accredited_at"?: string,"accredited_by"?: string | null,"created_at"?: string,"election_id": string,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"observer_role"?: string,"profile_id": string
                  }
                  Update: {
                    "accredited_at"?: string,"accredited_by"?: string | null,"created_at"?: string,"election_id"?: string,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"observer_role"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_election_observers_accredited_by_fkey"
      columns: ["accredited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_election_observers_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_election_observers_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_election_secrets": {
                  Row: {
                    "created_at": string,"election_id": string,"secret": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"election_id": string,"secret": string
                  }
                  Update: {
                    "created_at"?: string,"election_id"?: string,"secret"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_election_secrets_election_id_fkey"
      columns: ["election_id"]
isOneToOne: true
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_elections": {
                  Row: {
                    "ballot_box_commitment": string | null,"body": string,"canvass_sample_rate": number,"challenge_closes_at": string | null,"challenge_opens_at": string | null,"created_at": string,"created_by": string | null,"eligibility_roster_commitment": string | null,"id": string,"max_attempts": number,"metadata": NonNullable<Json>,"primary_window_seconds": number,"require_face_liveness": boolean,"require_home_presence": boolean,"require_solitude": boolean,"retry_spacing_hours": number,"scope_country_code": string | null,"scope_locality_code": string | null,"scope_region_code": string | null,"security_class": Database["public"]['Enums']["civic_election_security_class"],"status": Database["public"]['Enums']["civic_election_status"],"summary": string,"tier": Database["public"]['Enums']["civic_election_tier"],"title": string,"updated_at": string,"voting_closes_at": string,"voting_opens_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ballot_box_commitment"?: string | null,"body"?: string,"canvass_sample_rate"?: number,"challenge_closes_at"?: string | null,"challenge_opens_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"eligibility_roster_commitment"?: string | null,"id"?: string,"max_attempts"?: number,"metadata"?: NonNullable<Json>,"primary_window_seconds"?: number,"require_face_liveness"?: boolean,"require_home_presence"?: boolean,"require_solitude"?: boolean,"retry_spacing_hours"?: number,"scope_country_code"?: string | null,"scope_locality_code"?: string | null,"scope_region_code"?: string | null,"security_class"?: Database["public"]['Enums']["civic_election_security_class"],"status"?: Database["public"]['Enums']["civic_election_status"],"summary"?: string,"tier"?: Database["public"]['Enums']["civic_election_tier"],"title": string,"updated_at"?: string,"voting_closes_at": string,"voting_opens_at": string
                  }
                  Update: {
                    "ballot_box_commitment"?: string | null,"body"?: string,"canvass_sample_rate"?: number,"challenge_closes_at"?: string | null,"challenge_opens_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"eligibility_roster_commitment"?: string | null,"id"?: string,"max_attempts"?: number,"metadata"?: NonNullable<Json>,"primary_window_seconds"?: number,"require_face_liveness"?: boolean,"require_home_presence"?: boolean,"require_solitude"?: boolean,"retry_spacing_hours"?: number,"scope_country_code"?: string | null,"scope_locality_code"?: string | null,"scope_region_code"?: string | null,"security_class"?: Database["public"]['Enums']["civic_election_security_class"],"status"?: Database["public"]['Enums']["civic_election_status"],"summary"?: string,"tier"?: Database["public"]['Enums']["civic_election_tier"],"title"?: string,"updated_at"?: string,"voting_closes_at"?: string,"voting_opens_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_elections_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_home_profiles": {
                  Row: {
                    "address_line": string | null,"consent_recorded_at": string | null,"cooling_off_until": string | null,"country_code": string | null,"created_at": string,"geofence_radius_meters": number,"id": string,"is_active": boolean,"label": string,"latitude": number | null,"locality_code": string | null,"longitude": number | null,"metadata": NonNullable<Json>,"presence_pattern": NonNullable<Json>,"profile_id": string,"region_code": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line"?: string | null,"consent_recorded_at"?: string | null,"cooling_off_until"?: string | null,"country_code"?: string | null,"created_at"?: string,"geofence_radius_meters"?: number,"id"?: string,"is_active"?: boolean,"label"?: string,"latitude"?: number | null,"locality_code"?: string | null,"longitude"?: number | null,"metadata"?: NonNullable<Json>,"presence_pattern"?: NonNullable<Json>,"profile_id": string,"region_code"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address_line"?: string | null,"consent_recorded_at"?: string | null,"cooling_off_until"?: string | null,"country_code"?: string | null,"created_at"?: string,"geofence_radius_meters"?: number,"id"?: string,"is_active"?: boolean,"label"?: string,"latitude"?: number | null,"locality_code"?: string | null,"longitude"?: number | null,"metadata"?: NonNullable<Json>,"presence_pattern"?: NonNullable<Json>,"profile_id"?: string,"region_code"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_home_profiles_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_risk_findings": {
                  Row: {
                    "created_at": string,"detail": NonNullable<Json>,"election_id": string | null,"id": string,"profile_id": string | null,"score": number,"session_id": string | null,"severity": Database["public"]['Enums']["civic_risk_severity"],"signal_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"detail"?: NonNullable<Json>,"election_id"?: string | null,"id"?: string,"profile_id"?: string | null,"score"?: number,"session_id"?: string | null,"severity"?: Database["public"]['Enums']["civic_risk_severity"],"signal_key": string
                  }
                  Update: {
                    "created_at"?: string,"detail"?: NonNullable<Json>,"election_id"?: string | null,"id"?: string,"profile_id"?: string | null,"score"?: number,"session_id"?: string | null,"severity"?: Database["public"]['Enums']["civic_risk_severity"],"signal_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_risk_findings_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_risk_findings_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_risk_findings_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "civic_vote_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_verification_checks": {
                  Row: {
                    "check_kind": Database["public"]['Enums']["civic_verification_check_kind"],"created_at": string,"detail": NonNullable<Json>,"id": string,"result": Database["public"]['Enums']["civic_verification_check_result"],"score": number | null,"session_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "check_kind": Database["public"]['Enums']["civic_verification_check_kind"],"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: string,"result": Database["public"]['Enums']["civic_verification_check_result"],"score"?: number | null,"session_id": string
                  }
                  Update: {
                    "check_kind"?: Database["public"]['Enums']["civic_verification_check_kind"],"created_at"?: string,"detail"?: NonNullable<Json>,"id"?: string,"result"?: Database["public"]['Enums']["civic_verification_check_result"],"score"?: number | null,"session_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_verification_checks_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "civic_vote_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_vote_sessions": {
                  Row: {
                    "attempt_number": number,"completed_at": string | null,"created_at": string,"device_registration_id": string | null,"election_id": string,"failure_reason": string | null,"id": string,"metadata": NonNullable<Json>,"notified_at": string | null,"profile_id": string,"scheduled_for": string,"started_at": string | null,"status": Database["public"]['Enums']["civic_vote_session_status"],"updated_at": string,"window_closes_at": string | null,"window_opens_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_number"?: number,"completed_at"?: string | null,"created_at"?: string,"device_registration_id"?: string | null,"election_id": string,"failure_reason"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"notified_at"?: string | null,"profile_id": string,"scheduled_for": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["civic_vote_session_status"],"updated_at"?: string,"window_closes_at"?: string | null,"window_opens_at"?: string | null
                  }
                  Update: {
                    "attempt_number"?: number,"completed_at"?: string | null,"created_at"?: string,"device_registration_id"?: string | null,"election_id"?: string,"failure_reason"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"notified_at"?: string | null,"profile_id"?: string,"scheduled_for"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["civic_vote_session_status"],"updated_at"?: string,"window_closes_at"?: string | null,"window_opens_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_vote_sessions_device_registration_id_fkey"
      columns: ["device_registration_id"]
isOneToOne: false
      referencedRelation: "civic_device_registrations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_vote_sessions_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_vote_sessions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_voter_eligibility": {
                  Row: {
                    "created_at": string,"election_id": string,"eligibility_hash": string,"id": string,"is_eligible": boolean,"profile_id": string,"reasons": (string)[],"snapshot": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"election_id": string,"eligibility_hash": string,"id"?: string,"is_eligible"?: boolean,"profile_id": string,"reasons"?: (string)[],"snapshot"?: NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"election_id"?: string,"eligibility_hash"?: string,"id"?: string,"is_eligible"?: boolean,"profile_id"?: string,"reasons"?: (string)[],"snapshot"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_voter_eligibility_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_voter_eligibility_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_voting_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"election_id": string | null,"event_hash": string,"event_type": string,"id": string,"payload": NonNullable<Json>,"prev_event_hash": string | null,"session_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"election_id"?: string | null,"event_hash": string,"event_type": string,"id"?: string,"payload"?: NonNullable<Json>,"prev_event_hash"?: string | null,"session_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"election_id"?: string | null,"event_hash"?: string,"event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>,"prev_event_hash"?: string | null,"session_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_voting_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_voting_events_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_voting_events_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "civic_vote_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_voting_proposal_support": {
                  Row: {
                    "created_at": string,"profile_id": string,"proposal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"profile_id": string,"proposal_id": string
                  }
                  Update: {
                    "created_at"?: string,"profile_id"?: string,"proposal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_voting_proposal_support_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_voting_proposal_support_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "civic_voting_proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"civic_voting_proposals": {
                  Row: {
                    "body": string,"consultation_kind": string,"created_at": string,"created_by_profile_id": string,"election_id": string | null,"id": string,"matter_id": string,"metadata": NonNullable<Json>,"published_at": string | null,"published_by_profile_id": string | null,"scope_country_code": string | null,"scope_kind": string,"scope_locality_code": string | null,"scope_region_code": string | null,"status": string,"summary": string,"title": string,"updated_at": string,"voting_closes_at": string | null,"voting_opens_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"consultation_kind"?: string,"created_at"?: string,"created_by_profile_id": string,"election_id"?: string | null,"id"?: string,"matter_id": string,"metadata"?: NonNullable<Json>,"published_at"?: string | null,"published_by_profile_id"?: string | null,"scope_country_code"?: string | null,"scope_kind"?: string,"scope_locality_code"?: string | null,"scope_region_code"?: string | null,"status"?: string,"summary"?: string,"title": string,"updated_at"?: string,"voting_closes_at"?: string | null,"voting_opens_at"?: string | null
                  }
                  Update: {
                    "body"?: string,"consultation_kind"?: string,"created_at"?: string,"created_by_profile_id"?: string,"election_id"?: string | null,"id"?: string,"matter_id"?: string,"metadata"?: NonNullable<Json>,"published_at"?: string | null,"published_by_profile_id"?: string | null,"scope_country_code"?: string | null,"scope_kind"?: string,"scope_locality_code"?: string | null,"scope_region_code"?: string | null,"status"?: string,"summary"?: string,"title"?: string,"updated_at"?: string,"voting_closes_at"?: string | null,"voting_opens_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "civic_voting_proposals_created_by_profile_id_fkey"
      columns: ["created_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_voting_proposals_election_id_fkey"
      columns: ["election_id"]
isOneToOne: false
      referencedRelation: "civic_elections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_voting_proposals_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "civic_voting_proposals_published_by_profile_id_fkey"
      columns: ["published_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"classification_aliases": {
                  Row: {
                    "alias": string,"created_at": string,"id": string,"kind": string,"locale": string,"node_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"created_at"?: string,"id"?: string,"kind"?: string,"locale"?: string,"node_id": string
                  }
                  Update: {
                    "alias"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"locale"?: string,"node_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "classification_aliases_node_id_fkey"
      columns: ["node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    }
                  ]
                },"classification_nodes": {
                  Row: {
                    "code": string,"concept_key": string,"created_at": string,"description": string,"display_name": string,"id": string,"node_type": string,"replaced_by_node_id": string | null,"set_id": string,"short_name": string,"sort_order": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"concept_key": string,"created_at"?: string,"description"?: string,"display_name": string,"id": string,"node_type": string,"replaced_by_node_id"?: string | null,"set_id": string,"short_name": string,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"concept_key"?: string,"created_at"?: string,"description"?: string,"display_name"?: string,"id"?: string,"node_type"?: string,"replaced_by_node_id"?: string | null,"set_id"?: string,"short_name"?: string,"sort_order"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "classification_nodes_replaced_by_node_id_fkey"
      columns: ["replaced_by_node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classification_nodes_set_id_fkey"
      columns: ["set_id"]
isOneToOne: false
      referencedRelation: "classification_sets"
      referencedColumns: ["id"]
    }
                  ]
                },"classification_relationships": {
                  Row: {
                    "created_at": string,"from_node_id": string,"id": string,"note": string | null,"relationship_type": string,"to_node_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_node_id": string,"id"?: string,"note"?: string | null,"relationship_type": string,"to_node_id": string
                  }
                  Update: {
                    "created_at"?: string,"from_node_id"?: string,"id"?: string,"note"?: string | null,"relationship_type"?: string,"to_node_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "classification_relationships_from_node_id_fkey"
      columns: ["from_node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classification_relationships_to_node_id_fkey"
      columns: ["to_node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    }
                  ]
                },"classification_sets": {
                  Row: {
                    "change_rationale": string | null,"created_at": string,"description": string,"effective_from": string | null,"effective_to": string | null,"family_key": string,"id": string,"is_current": boolean,"methodology_doc_ref": string | null,"name": string,"predecessor_id": string | null,"status": string,"successor_id": string | null,"updated_at": string,"version_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "change_rationale"?: string | null,"created_at"?: string,"description"?: string,"effective_from"?: string | null,"effective_to"?: string | null,"family_key": string,"id": string,"is_current"?: boolean,"methodology_doc_ref"?: string | null,"name": string,"predecessor_id"?: string | null,"status"?: string,"successor_id"?: string | null,"updated_at"?: string,"version_key": string
                  }
                  Update: {
                    "change_rationale"?: string | null,"created_at"?: string,"description"?: string,"effective_from"?: string | null,"effective_to"?: string | null,"family_key"?: string,"id"?: string,"is_current"?: boolean,"methodology_doc_ref"?: string | null,"name"?: string,"predecessor_id"?: string | null,"status"?: string,"successor_id"?: string | null,"updated_at"?: string,"version_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "classification_sets_predecessor_id_fkey"
      columns: ["predecessor_id"]
isOneToOne: false
      referencedRelation: "classification_sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "classification_sets_successor_id_fkey"
      columns: ["successor_id"]
isOneToOne: false
      referencedRelation: "classification_sets"
      referencedColumns: ["id"]
    }
                  ]
                },"coding_repositories": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"notes": string | null,"slug": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"notes"?: string | null,"slug": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"notes"?: string | null,"slug"?: string,"status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"collaboration_tasks": {
                  Row: {
                    "cancelled_at": string | null,"completed_at": string | null,"completion_criteria": string | null,"created_at": string,"created_by_kind": string,"created_by_profile_id": string,"current_action_id": string | null,"description": string | null,"due_at": string | null,"expected_outcome": string | null,"id": string,"lead_kind": string | null,"lead_profile_id": string | null,"lead_unit_label": string | null,"matter_id": string,"parent_id": string,"parent_kind": string,"parent_task_id": string | null,"priority": string,"review_required": boolean,"start_at": string | null,"status": string,"submitted_at": string | null,"title": string,"updated_at": string,"waiting_condition": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled_at"?: string | null,"completed_at"?: string | null,"completion_criteria"?: string | null,"created_at"?: string,"created_by_kind": string,"created_by_profile_id": string,"current_action_id"?: string | null,"description"?: string | null,"due_at"?: string | null,"expected_outcome"?: string | null,"id"?: string,"lead_kind"?: string | null,"lead_profile_id"?: string | null,"lead_unit_label"?: string | null,"matter_id": string,"parent_id": string,"parent_kind"?: string,"parent_task_id"?: string | null,"priority"?: string,"review_required"?: boolean,"start_at"?: string | null,"status"?: string,"submitted_at"?: string | null,"title": string,"updated_at"?: string,"waiting_condition"?: string | null
                  }
                  Update: {
                    "cancelled_at"?: string | null,"completed_at"?: string | null,"completion_criteria"?: string | null,"created_at"?: string,"created_by_kind"?: string,"created_by_profile_id"?: string,"current_action_id"?: string | null,"description"?: string | null,"due_at"?: string | null,"expected_outcome"?: string | null,"id"?: string,"lead_kind"?: string | null,"lead_profile_id"?: string | null,"lead_unit_label"?: string | null,"matter_id"?: string,"parent_id"?: string,"parent_kind"?: string,"parent_task_id"?: string | null,"priority"?: string,"review_required"?: boolean,"start_at"?: string | null,"status"?: string,"submitted_at"?: string | null,"title"?: string,"updated_at"?: string,"waiting_condition"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "collaboration_tasks_created_by_profile_id_fkey"
      columns: ["created_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collaboration_tasks_lead_profile_id_fkey"
      columns: ["lead_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collaboration_tasks_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collaboration_tasks_parent_task_id_fkey"
      columns: ["parent_task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"community_challenges": {
                  Row: {
                    "affected": string | null,"area_node_id": string | null,"completed_at": string | null,"completed_by": string | null,"constraints": string | null,"context_detail": string | null,"created_at": string,"evidence_links": string | null,"id": string,"is_demo": boolean,"lessons_learned": string | null,"outcome_evidence": string | null,"outcome_summary": string | null,"problem_statement": string,"program_id": string,"publisher_profile_id": string,"resources": string | null,"scope_text": string | null,"selected_proposal_id": string | null,"source_matter_id": string | null,"status": string,"success_criteria": string,"success_criteria_result": string | null,"title": string,"updated_at": string,"why_it_matters": string
                  }
                  ComputedFields: never
                  Insert: {
                    "affected"?: string | null,"area_node_id"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"constraints"?: string | null,"context_detail"?: string | null,"created_at"?: string,"evidence_links"?: string | null,"id"?: string,"is_demo"?: boolean,"lessons_learned"?: string | null,"outcome_evidence"?: string | null,"outcome_summary"?: string | null,"problem_statement": string,"program_id": string,"publisher_profile_id": string,"resources"?: string | null,"scope_text"?: string | null,"selected_proposal_id"?: string | null,"source_matter_id"?: string | null,"status"?: string,"success_criteria": string,"success_criteria_result"?: string | null,"title": string,"updated_at"?: string,"why_it_matters": string
                  }
                  Update: {
                    "affected"?: string | null,"area_node_id"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"constraints"?: string | null,"context_detail"?: string | null,"created_at"?: string,"evidence_links"?: string | null,"id"?: string,"is_demo"?: boolean,"lessons_learned"?: string | null,"outcome_evidence"?: string | null,"outcome_summary"?: string | null,"problem_statement"?: string,"program_id"?: string,"publisher_profile_id"?: string,"resources"?: string | null,"scope_text"?: string | null,"selected_proposal_id"?: string | null,"source_matter_id"?: string | null,"status"?: string,"success_criteria"?: string,"success_criteria_result"?: string | null,"title"?: string,"updated_at"?: string,"why_it_matters"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "community_challenges_area_node_id_fkey"
      columns: ["area_node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_challenges_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_challenges_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "contribution_programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_challenges_publisher_profile_id_fkey"
      columns: ["publisher_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_challenges_selected_proposal_id_fkey"
      columns: ["selected_proposal_id"]
isOneToOne: false
      referencedRelation: "challenge_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "community_challenges_source_matter_id_fkey"
      columns: ["source_matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    }
                  ]
                },"constitutional_offices": {
                  Row: {
                    "assigned_at": string,"assigned_by": string | null,"created_at": string,"ended_at": string | null,"id": string,"is_active": boolean,"metadata": NonNullable<Json>,"notes": string | null,"office_key": Database["public"]['Enums']["constitutional_office_key"],"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"created_at"?: string,"ended_at"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"notes"?: string | null,"office_key": Database["public"]['Enums']["constitutional_office_key"],"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"created_at"?: string,"ended_at"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"notes"?: string | null,"office_key"?: Database["public"]['Enums']["constitutional_office_key"],"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "constitutional_offices_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "constitutional_offices_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"content_categories": {
                  Row: {
                    "allowed_professions": (string)[],"contribution_policy": string,"created_at": string,"default_content_types": (string)[],"default_moderation_lane": Database["public"]['Enums']["content_moderation_lane"],"description": string,"id": string,"label": string,"required_contribution_permission": Database["public"]['Enums']["app_permission"],"required_review_permission": Database["public"]['Enums']["app_permission"],"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allowed_professions"?: (string)[],"contribution_policy": string,"created_at"?: string,"default_content_types"?: (string)[],"default_moderation_lane": Database["public"]['Enums']["content_moderation_lane"],"description": string,"id": string,"label": string,"required_contribution_permission": Database["public"]['Enums']["app_permission"],"required_review_permission": Database["public"]['Enums']["app_permission"],"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "allowed_professions"?: (string)[],"contribution_policy"?: string,"created_at"?: string,"default_content_types"?: (string)[],"default_moderation_lane"?: Database["public"]['Enums']["content_moderation_lane"],"description"?: string,"id"?: string,"label"?: string,"required_contribution_permission"?: Database["public"]['Enums']["app_permission"],"required_review_permission"?: Database["public"]['Enums']["app_permission"],"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"content_contribution_rules": {
                  Row: {
                    "allowed_professions": (string)[],"allowed_roles": (Database["public"]['Enums']["app_role"])[],"category_id": string,"content_type": string,"created_at": string,"moderation_lane": Database["public"]['Enums']["content_moderation_lane"],"required_permission": Database["public"]['Enums']["app_permission"],"requires_approved_profession": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allowed_professions"?: (string)[],"allowed_roles"?: (Database["public"]['Enums']["app_role"])[],"category_id": string,"content_type"?: string,"created_at"?: string,"moderation_lane": Database["public"]['Enums']["content_moderation_lane"],"required_permission": Database["public"]['Enums']["app_permission"],"requires_approved_profession"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "allowed_professions"?: (string)[],"allowed_roles"?: (Database["public"]['Enums']["app_role"])[],"category_id"?: string,"content_type"?: string,"created_at"?: string,"moderation_lane"?: Database["public"]['Enums']["content_moderation_lane"],"required_permission"?: Database["public"]['Enums']["app_permission"],"requires_approved_profession"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_contribution_rules_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "content_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"content_items": {
                  Row: {
                    "author_id": string | null,"body_preview": string | null,"category_id": string,"classification_confidence": number,"classification_method": string,"classification_reasons": NonNullable<Json>,"content_type": string,"contribution_policy": string,"created_at": string,"id": string,"metadata": NonNullable<Json>,"moderation_lane": Database["public"]['Enums']["content_moderation_lane"],"professional_domain": string,"review_status": Database["public"]['Enums']["content_review_status"],"reviewed_at": string | null,"reviewer_id": string | null,"source_id": string | null,"source_table": string | null,"submitted_at": string | null,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body_preview"?: string | null,"category_id"?: string,"classification_confidence"?: number,"classification_method"?: string,"classification_reasons"?: NonNullable<Json>,"content_type"?: string,"contribution_policy"?: string,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"moderation_lane"?: Database["public"]['Enums']["content_moderation_lane"],"professional_domain"?: string,"review_status"?: Database["public"]['Enums']["content_review_status"],"reviewed_at"?: string | null,"reviewer_id"?: string | null,"source_id"?: string | null,"source_table"?: string | null,"submitted_at"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body_preview"?: string | null,"category_id"?: string,"classification_confidence"?: number,"classification_method"?: string,"classification_reasons"?: NonNullable<Json>,"content_type"?: string,"contribution_policy"?: string,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"moderation_lane"?: Database["public"]['Enums']["content_moderation_lane"],"professional_domain"?: string,"review_status"?: Database["public"]['Enums']["content_review_status"],"reviewed_at"?: string | null,"reviewer_id"?: string | null,"source_id"?: string | null,"source_table"?: string | null,"submitted_at"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_items_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "content_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_items_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contribution_evaluation_history": {
                  Row: {
                    "cause": string,"contribution_source_id": string,"contribution_source_table": string,"created_at": string,"evidence_record_id": string | null,"id": string,"model_version": string,"observation": number | null,"profile_id": string,"realized_impact": number | null,"snapshot": NonNullable<Json>,"stage": string | null,"verification_kind": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cause": string,"contribution_source_id": string,"contribution_source_table": string,"created_at"?: string,"evidence_record_id"?: string | null,"id"?: string,"model_version": string,"observation"?: number | null,"profile_id": string,"realized_impact"?: number | null,"snapshot"?: NonNullable<Json>,"stage"?: string | null,"verification_kind"?: string | null
                  }
                  Update: {
                    "cause"?: string,"contribution_source_id"?: string,"contribution_source_table"?: string,"created_at"?: string,"evidence_record_id"?: string | null,"id"?: string,"model_version"?: string,"observation"?: number | null,"profile_id"?: string,"realized_impact"?: number | null,"snapshot"?: NonNullable<Json>,"stage"?: string | null,"verification_kind"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_evaluation_history_evidence_record_id_fkey"
      columns: ["evidence_record_id"]
isOneToOne: false
      referencedRelation: "contribution_evidence_records"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_evaluation_history_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contribution_evidence_records": {
                  Row: {
                    "affected": boolean,"conflict_disclosed": boolean,"conflict_type": string | null,"contribution_source_id": string,"contribution_source_table": string,"created_at": string,"evaluator_profile_id": string,"evaluator_role": string,"id": string,"kind": string,"occurred_at": string,"payload": NonNullable<Json>,"ratings": NonNullable<Json>,"reason": string | null,"relationship_context": string | null,"reweight_reason": string | null,"subject_profile_id": string,"validation_status": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "affected"?: boolean,"conflict_disclosed"?: boolean,"conflict_type"?: string | null,"contribution_source_id": string,"contribution_source_table": string,"created_at"?: string,"evaluator_profile_id": string,"evaluator_role": string,"id"?: string,"kind": string,"occurred_at"?: string,"payload"?: NonNullable<Json>,"ratings"?: NonNullable<Json>,"reason"?: string | null,"relationship_context"?: string | null,"reweight_reason"?: string | null,"subject_profile_id": string,"validation_status"?: string | null
                  }
                  Update: {
                    "affected"?: boolean,"conflict_disclosed"?: boolean,"conflict_type"?: string | null,"contribution_source_id"?: string,"contribution_source_table"?: string,"created_at"?: string,"evaluator_profile_id"?: string,"evaluator_role"?: string,"id"?: string,"kind"?: string,"occurred_at"?: string,"payload"?: NonNullable<Json>,"ratings"?: NonNullable<Json>,"reason"?: string | null,"relationship_context"?: string | null,"reweight_reason"?: string | null,"subject_profile_id"?: string,"validation_status"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_evidence_records_evaluator_profile_id_fkey"
      columns: ["evaluator_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_evidence_records_subject_profile_id_fkey"
      columns: ["subject_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contribution_opportunities": {
                  Row: {
                    "application_deadline": string | null,"area_node_id": string | null,"compensation_status": string,"created_at": string,"description": string | null,"estimated_effort": string | null,"evaluation_criteria": string | null,"evaluation_dimensions": (string)[],"evidence_requirements": string | null,"expected_outcome": string | null,"id": string,"implementation_project_id": string | null,"is_demo": boolean,"is_remote": boolean,"knowledge_gap_id": string | null,"knowledge_space_id": string | null,"location_text": string | null,"opportunity_kind": string,"optional_skills": (string)[],"program_id": string | null,"publisher_profile_id": string,"required_skills": (string)[],"status": string,"summary": string,"title": string,"updated_at": string,"work_ends_at": string | null,"work_starts_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "application_deadline"?: string | null,"area_node_id"?: string | null,"compensation_status"?: string,"created_at"?: string,"description"?: string | null,"estimated_effort"?: string | null,"evaluation_criteria"?: string | null,"evaluation_dimensions"?: (string)[],"evidence_requirements"?: string | null,"expected_outcome"?: string | null,"id"?: string,"implementation_project_id"?: string | null,"is_demo"?: boolean,"is_remote"?: boolean,"knowledge_gap_id"?: string | null,"knowledge_space_id"?: string | null,"location_text"?: string | null,"opportunity_kind"?: string,"optional_skills"?: (string)[],"program_id"?: string | null,"publisher_profile_id": string,"required_skills"?: (string)[],"status"?: string,"summary": string,"title": string,"updated_at"?: string,"work_ends_at"?: string | null,"work_starts_at"?: string | null
                  }
                  Update: {
                    "application_deadline"?: string | null,"area_node_id"?: string | null,"compensation_status"?: string,"created_at"?: string,"description"?: string | null,"estimated_effort"?: string | null,"evaluation_criteria"?: string | null,"evaluation_dimensions"?: (string)[],"evidence_requirements"?: string | null,"expected_outcome"?: string | null,"id"?: string,"implementation_project_id"?: string | null,"is_demo"?: boolean,"is_remote"?: boolean,"knowledge_gap_id"?: string | null,"knowledge_space_id"?: string | null,"location_text"?: string | null,"opportunity_kind"?: string,"optional_skills"?: (string)[],"program_id"?: string | null,"publisher_profile_id"?: string,"required_skills"?: (string)[],"status"?: string,"summary"?: string,"title"?: string,"updated_at"?: string,"work_ends_at"?: string | null,"work_starts_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_opportunities_area_node_id_fkey"
      columns: ["area_node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_opportunities_implementation_project_id_fkey"
      columns: ["implementation_project_id"]
isOneToOne: false
      referencedRelation: "implementation_projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_opportunities_knowledge_gap_id_fkey"
      columns: ["knowledge_gap_id"]
isOneToOne: false
      referencedRelation: "knowledge_gaps"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_opportunities_knowledge_space_id_fkey"
      columns: ["knowledge_space_id"]
isOneToOne: false
      referencedRelation: "knowledge_spaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_opportunities_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "contribution_programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_opportunities_publisher_profile_id_fkey"
      columns: ["publisher_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contribution_programs": {
                  Row: {
                    "area_node_id": string | null,"created_at": string,"description": string | null,"id": string,"is_demo": boolean,"program_kind": string,"publisher_profile_id": string,"seed_key": string | null,"status": string,"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_node_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_demo"?: boolean,"program_kind"?: string,"publisher_profile_id": string,"seed_key"?: string | null,"status"?: string,"summary": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "area_node_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_demo"?: boolean,"program_kind"?: string,"publisher_profile_id"?: string,"seed_key"?: string | null,"status"?: string,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_programs_area_node_id_fkey"
      columns: ["area_node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_programs_publisher_profile_id_fkey"
      columns: ["publisher_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contribution_records": {
                  Row: {
                    "contributor_id": string,"created_at": string,"created_by": string | null,"evidence_url": string | null,"id": string,"impact_score": number | null,"notes": string | null,"quality_score": number | null,"reviewer_user_id": string | null,"status": string,"updated_at": string,"verified_points": number,"work_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contributor_id": string,"created_at"?: string,"created_by"?: string | null,"evidence_url"?: string | null,"id"?: string,"impact_score"?: number | null,"notes"?: string | null,"quality_score"?: number | null,"reviewer_user_id"?: string | null,"status"?: string,"updated_at"?: string,"verified_points"?: number,"work_type": string
                  }
                  Update: {
                    "contributor_id"?: string,"created_at"?: string,"created_by"?: string | null,"evidence_url"?: string | null,"id"?: string,"impact_score"?: number | null,"notes"?: string | null,"quality_score"?: number | null,"reviewer_user_id"?: string | null,"status"?: string,"updated_at"?: string,"verified_points"?: number,"work_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_records_contributor_id_fkey"
      columns: ["contributor_id"]
isOneToOne: false
      referencedRelation: "contributor_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"contributor_profiles": {
                  Row: {
                    "contributor_type": string,"created_at": string,"created_by": string | null,"display_name": string,"id": string,"payout_status": string,"tax_status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contributor_type"?: string,"created_at"?: string,"created_by"?: string | null,"display_name": string,"id"?: string,"payout_status"?: string,"tax_status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "contributor_type"?: string,"created_at"?: string,"created_by"?: string | null,"display_name"?: string,"id"?: string,"payout_status"?: string,"tax_status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"development_stories": {
                  Row: {
                    "area": string,"author_id": string,"chat_id": string | null,"commit_sha": string | null,"confidence_score": number | null,"created_at": string,"created_features": (string)[],"expected_behavior": string,"id": string,"metadata": NonNullable<Json>,"original_instruction": string,"pr_number": number | null,"published_at": string | null,"rephrased_description": string,"requested_at": string,"reviewed_at": string | null,"reviewed_by": string | null,"section": string,"source": string,"source_id": string | null,"source_story_key": string | null,"source_type": string,"source_url": string | null,"status": string,"story_kind": string,"title": string,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area": string,"author_id": string,"chat_id"?: string | null,"commit_sha"?: string | null,"confidence_score"?: number | null,"created_at"?: string,"created_features"?: (string)[],"expected_behavior": string,"id"?: string,"metadata"?: NonNullable<Json>,"original_instruction": string,"pr_number"?: number | null,"published_at"?: string | null,"rephrased_description": string,"requested_at"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"section": string,"source"?: string,"source_id"?: string | null,"source_story_key"?: string | null,"source_type"?: string,"source_url"?: string | null,"status"?: string,"story_kind"?: string,"title": string,"visibility"?: string
                  }
                  Update: {
                    "area"?: string,"author_id"?: string,"chat_id"?: string | null,"commit_sha"?: string | null,"confidence_score"?: number | null,"created_at"?: string,"created_features"?: (string)[],"expected_behavior"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"original_instruction"?: string,"pr_number"?: number | null,"published_at"?: string | null,"rephrased_description"?: string,"requested_at"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"section"?: string,"source"?: string,"source_id"?: string | null,"source_story_key"?: string | null,"source_type"?: string,"source_url"?: string | null,"status"?: string,"story_kind"?: string,"title"?: string,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "development_stories_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "development_stories_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"distribution_periods": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"civizen_shared_proceeds_usd": number,"contributor_pool_usd": number,"contributor_share": number,"created_at": string,"created_by": string | null,"founder_reserve_usd": number,"founder_share": number,"id": string,"investor_pool_usd": number,"investor_share": number,"label": string,"mission_reserve_usd": number,"notes": string | null,"period_end": string,"period_start": string,"project_servicing_pool_usd": number,"project_servicing_share": number,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"civizen_shared_proceeds_usd": number,"contributor_pool_usd"?: number,"contributor_share"?: number,"created_at"?: string,"created_by"?: string | null,"founder_reserve_usd"?: number,"founder_share"?: number,"id"?: string,"investor_pool_usd"?: number,"investor_share"?: number,"label": string,"mission_reserve_usd"?: number,"notes"?: string | null,"period_end": string,"period_start": string,"project_servicing_pool_usd"?: number,"project_servicing_share"?: number,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"civizen_shared_proceeds_usd"?: number,"contributor_pool_usd"?: number,"contributor_share"?: number,"created_at"?: string,"created_by"?: string | null,"founder_reserve_usd"?: number,"founder_share"?: number,"id"?: string,"investor_pool_usd"?: number,"investor_share"?: number,"label"?: string,"mission_reserve_usd"?: number,"notes"?: string | null,"period_end"?: string,"period_start"?: string,"project_servicing_pool_usd"?: number,"project_servicing_share"?: number,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"endorsements": {
                  Row: {
                    "comment": string | null,"created_at": string,"endorsed_id": string,"endorser_id": string,"id": string,"is_hidden": boolean | null,"pillar": Database["public"]['Enums']["pillar_type"],"stars": number
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"endorsed_id": string,"endorser_id": string,"id"?: string,"is_hidden"?: boolean | null,"pillar": Database["public"]['Enums']["pillar_type"],"stars": number
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"endorsed_id"?: string,"endorser_id"?: string,"id"?: string,"is_hidden"?: boolean | null,"pillar"?: Database["public"]['Enums']["pillar_type"],"stars"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "endorsements_endorsed_id_fkey"
      columns: ["endorsed_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "endorsements_endorser_id_fkey"
      columns: ["endorser_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"evidence": {
                  Row: {
                    "created_at": string,"description": string | null,"endorsement_id": string,"file_type": string | null,"file_url": string,"id": string,"uploader_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"endorsement_id": string,"file_type"?: string | null,"file_url": string,"id"?: string,"uploader_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"endorsement_id"?: string,"file_type"?: string | null,"file_url"?: string,"id"?: string,"uploader_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evidence_endorsement_id_fkey"
      columns: ["endorsement_id"]
isOneToOne: false
      referencedRelation: "endorsements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_uploader_id_fkey"
      columns: ["uploader_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"finance_allocations": {
                  Row: {
                    "actor_user_id": string | null,"allocated_at": string,"amount_minor": number,"created_at": string,"currency": string,"id": string,"line_item_id": string,"override_reason": string | null,"purpose_note": string | null,"receipt_id": string,"reverses_allocation_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_user_id"?: string | null,"allocated_at"?: string,"amount_minor": number,"created_at"?: string,"currency"?: string,"id"?: string,"line_item_id": string,"override_reason"?: string | null,"purpose_note"?: string | null,"receipt_id": string,"reverses_allocation_id"?: string | null
                  }
                  Update: {
                    "actor_user_id"?: string | null,"allocated_at"?: string,"amount_minor"?: number,"created_at"?: string,"currency"?: string,"id"?: string,"line_item_id"?: string,"override_reason"?: string | null,"purpose_note"?: string | null,"receipt_id"?: string,"reverses_allocation_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "finance_allocations_line_item_id_fkey"
      columns: ["line_item_id"]
isOneToOne: false
      referencedRelation: "budget_line_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_allocations_receipt_id_fkey"
      columns: ["receipt_id"]
isOneToOne: false
      referencedRelation: "finance_receipts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_allocations_reverses_allocation_id_fkey"
      columns: ["reverses_allocation_id"]
isOneToOne: false
      referencedRelation: "finance_allocations"
      referencedColumns: ["id"]
    }
                  ]
                },"finance_audit_events": {
                  Row: {
                    "actor_user_id": string | null,"created_at": string,"entity_id": string,"entity_type": string,"event_type": string,"id": string,"payload": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_user_id"?: string | null,"created_at"?: string,"entity_id": string,"entity_type": string,"event_type": string,"id"?: string,"payload"?: NonNullable<Json>
                  }
                  Update: {
                    "actor_user_id"?: string | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"finance_commitments": {
                  Row: {
                    "amount_minor": number,"commitment_date": string,"conditional": boolean,"conditions": string | null,"created_at": string,"created_by": string | null,"currency": string,"evidence_ref": string | null,"id": string,"intended_period": string | null,"restrictions": string | null,"source_id": string,"status": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"commitment_date"?: string,"conditional"?: boolean,"conditions"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"evidence_ref"?: string | null,"id"?: string,"intended_period"?: string | null,"restrictions"?: string | null,"source_id": string,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "amount_minor"?: number,"commitment_date"?: string,"conditional"?: boolean,"conditions"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"evidence_ref"?: string | null,"id"?: string,"intended_period"?: string | null,"restrictions"?: string | null,"source_id"?: string,"status"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "finance_commitments_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "finance_funding_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"finance_cost_assessments": {
                  Row: {
                    "actor_user_id": string | null,"adjustment_minor": number,"assessed_user_fee_minor": number,"audit_cost_minor": number,"calculation_note": string,"created_at": string,"currency": string,"id": string,"liable_legal_entity_name": string | null,"liable_party_type": string,"other_allowed_cost_minor": number,"processor_cost_minor": number,"reason": string | null,"related_receipt_id": string | null,"related_transaction_ref": string | null,"rule_version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_user_id"?: string | null,"adjustment_minor"?: number,"assessed_user_fee_minor": number,"audit_cost_minor"?: number,"calculation_note": string,"created_at"?: string,"currency"?: string,"id"?: string,"liable_legal_entity_name"?: string | null,"liable_party_type": string,"other_allowed_cost_minor"?: number,"processor_cost_minor"?: number,"reason"?: string | null,"related_receipt_id"?: string | null,"related_transaction_ref"?: string | null,"rule_version"?: string
                  }
                  Update: {
                    "actor_user_id"?: string | null,"adjustment_minor"?: number,"assessed_user_fee_minor"?: number,"audit_cost_minor"?: number,"calculation_note"?: string,"created_at"?: string,"currency"?: string,"id"?: string,"liable_legal_entity_name"?: string | null,"liable_party_type"?: string,"other_allowed_cost_minor"?: number,"processor_cost_minor"?: number,"reason"?: string | null,"related_receipt_id"?: string | null,"related_transaction_ref"?: string | null,"rule_version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "finance_cost_assessments_related_receipt_id_fkey"
      columns: ["related_receipt_id"]
isOneToOne: false
      referencedRelation: "finance_receipts"
      referencedColumns: ["id"]
    }
                  ]
                },"finance_funding_sources": {
                  Row: {
                    "category": string,"created_at": string,"created_by": string | null,"currency": string,"display_name": string,"id": string,"internal_notes": string | null,"internal_owner": string | null,"jurisdiction": string | null,"priority": number | null,"probability_pct": number | null,"public_display_name": string | null,"publish_requested_amount": boolean,"publish_source": boolean,"relationship_status": string,"requested_minor": number | null,"updated_at": string,"updated_by": string | null,"website": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"display_name": string,"id"?: string,"internal_notes"?: string | null,"internal_owner"?: string | null,"jurisdiction"?: string | null,"priority"?: number | null,"probability_pct"?: number | null,"public_display_name"?: string | null,"publish_requested_amount"?: boolean,"publish_source"?: boolean,"relationship_status"?: string,"requested_minor"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"website"?: string | null
                  }
                  Update: {
                    "category"?: string,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"display_name"?: string,"id"?: string,"internal_notes"?: string | null,"internal_owner"?: string | null,"jurisdiction"?: string | null,"priority"?: number | null,"probability_pct"?: number | null,"public_display_name"?: string | null,"publish_requested_amount"?: boolean,"publish_source"?: boolean,"relationship_status"?: string,"requested_minor"?: number | null,"updated_at"?: string,"updated_by"?: string | null,"website"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"finance_receipts": {
                  Row: {
                    "amount_minor": number,"commitment_id": string | null,"created_at": string,"created_by": string | null,"currency": string,"evidence_ref": string | null,"external_reference": string | null,"id": string,"received_date": string,"restriction_tag": string | null,"reverses_receipt_id": string | null,"source_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"commitment_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"evidence_ref"?: string | null,"external_reference"?: string | null,"id"?: string,"received_date"?: string,"restriction_tag"?: string | null,"reverses_receipt_id"?: string | null,"source_id": string
                  }
                  Update: {
                    "amount_minor"?: number,"commitment_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"evidence_ref"?: string | null,"external_reference"?: string | null,"id"?: string,"received_date"?: string,"restriction_tag"?: string | null,"reverses_receipt_id"?: string | null,"source_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "finance_receipts_commitment_id_fkey"
      columns: ["commitment_id"]
isOneToOne: false
      referencedRelation: "finance_commitments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_receipts_reverses_receipt_id_fkey"
      columns: ["reverses_receipt_id"]
isOneToOne: false
      referencedRelation: "finance_receipts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_receipts_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "finance_funding_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"finance_source_events": {
                  Row: {
                    "actor_user_id": string | null,"corrects_event_id": string | null,"created_at": string,"event_at": string,"event_type": string,"evidence_ref": string | null,"id": string,"next_action": string | null,"next_action_at": string | null,"private_notes": string | null,"source_id": string,"summary": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_user_id"?: string | null,"corrects_event_id"?: string | null,"created_at"?: string,"event_at"?: string,"event_type": string,"evidence_ref"?: string | null,"id"?: string,"next_action"?: string | null,"next_action_at"?: string | null,"private_notes"?: string | null,"source_id": string,"summary": string
                  }
                  Update: {
                    "actor_user_id"?: string | null,"corrects_event_id"?: string | null,"created_at"?: string,"event_at"?: string,"event_type"?: string,"evidence_ref"?: string | null,"id"?: string,"next_action"?: string | null,"next_action_at"?: string | null,"private_notes"?: string | null,"source_id"?: string,"summary"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "finance_source_events_corrects_event_id_fkey"
      columns: ["corrects_event_id"]
isOneToOne: false
      referencedRelation: "finance_source_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "finance_source_events_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "finance_funding_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"fulfillment_plan_factors": {
                  Row: {
                    "certainty_type": string,"created_at": string,"factor_key": string,"id": string,"note": string | null,"plan_id": string,"profile_id": string,"source_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "certainty_type": string,"created_at"?: string,"factor_key": string,"id"?: string,"note"?: string | null,"plan_id": string,"profile_id": string,"source_type": string
                  }
                  Update: {
                    "certainty_type"?: string,"created_at"?: string,"factor_key"?: string,"id"?: string,"note"?: string | null,"plan_id"?: string,"profile_id"?: string,"source_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fulfillment_plan_factors_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "fulfillment_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fulfillment_plan_factors_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fulfillment_plan_interventions": {
                  Row: {
                    "action_id": string | null,"created_at": string,"id": string,"intervention_key": string,"library_version": string,"plan_id": string,"profile_id": string,"recommendation_model": string,"why_shown": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id"?: string | null,"created_at"?: string,"id"?: string,"intervention_key": string,"library_version": string,"plan_id": string,"profile_id": string,"recommendation_model": string,"why_shown"?: string | null
                  }
                  Update: {
                    "action_id"?: string | null,"created_at"?: string,"id"?: string,"intervention_key"?: string,"library_version"?: string,"plan_id"?: string,"profile_id"?: string,"recommendation_model"?: string,"why_shown"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fulfillment_plan_interventions_action_id_fkey"
      columns: ["action_id"]
isOneToOne: false
      referencedRelation: "happiness_actions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fulfillment_plan_interventions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "fulfillment_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fulfillment_plan_interventions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fulfillment_plan_outcomes": {
                  Row: {
                    "created_at": string,"helped": string | null,"id": string,"plan_id": string,"profile_id": string,"qualitative_state": string,"summary_note": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"helped"?: string | null,"id"?: string,"plan_id": string,"profile_id": string,"qualitative_state": string,"summary_note"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"helped"?: string | null,"id"?: string,"plan_id"?: string,"profile_id"?: string,"qualitative_state"?: string,"summary_note"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fulfillment_plan_outcomes_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "fulfillment_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fulfillment_plan_outcomes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fulfillment_plan_support": {
                  Row: {
                    "created_at": string,"id": string,"note": string | null,"path": string | null,"plan_id": string,"profile_id": string,"support_key": string,"support_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"path"?: string | null,"plan_id": string,"profile_id": string,"support_key": string,"support_type": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"path"?: string | null,"plan_id"?: string,"profile_id"?: string,"support_key"?: string,"support_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fulfillment_plan_support_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "fulfillment_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fulfillment_plan_support_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"fulfillment_plans": {
                  Row: {
                    "completed_at": string | null,"concern": string | null,"created_at": string,"desired_outcome": string | null,"domain_key": string,"follow_up_at": string | null,"id": string,"profile_id": string,"reminder_pref": string,"status": string,"title": string,"updated_at": string,"work_intervention_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"concern"?: string | null,"created_at"?: string,"desired_outcome"?: string | null,"domain_key": string,"follow_up_at"?: string | null,"id"?: string,"profile_id": string,"reminder_pref"?: string,"status"?: string,"title": string,"updated_at"?: string,"work_intervention_id"?: string | null
                  }
                  Update: {
                    "completed_at"?: string | null,"concern"?: string | null,"created_at"?: string,"desired_outcome"?: string | null,"domain_key"?: string,"follow_up_at"?: string | null,"id"?: string,"profile_id"?: string,"reminder_pref"?: string,"status"?: string,"title"?: string,"updated_at"?: string,"work_intervention_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "fulfillment_plans_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fulfillment_plans_work_intervention_id_fkey"
      columns: ["work_intervention_id"]
isOneToOne: false
      referencedRelation: "work_interventions"
      referencedColumns: ["id"]
    }
                  ]
                },"fulfillment_recommendation_feedback": {
                  Row: {
                    "created_at": string,"feedback": string,"id": string,"intervention_key": string,"plan_id": string | null,"profile_id": string,"recommendation_model": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback": string,"id"?: string,"intervention_key": string,"plan_id"?: string | null,"profile_id": string,"recommendation_model"?: string
                  }
                  Update: {
                    "created_at"?: string,"feedback"?: string,"id"?: string,"intervention_key"?: string,"plan_id"?: string | null,"profile_id"?: string,"recommendation_model"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "fulfillment_recommendation_feedback_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "fulfillment_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "fulfillment_recommendation_feedback_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"funders": {
                  Row: {
                    "accredited_investor_status": string,"country": string | null,"created_at": string,"created_by": string | null,"email": string | null,"funder_type": string,"id": string,"kyc_status": string,"legal_name": string,"notes": string | null,"public_display_name": string | null,"sanctions_status": string,"tax_profile_status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accredited_investor_status"?: string,"country"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"funder_type": string,"id"?: string,"kyc_status"?: string,"legal_name": string,"notes"?: string | null,"public_display_name"?: string | null,"sanctions_status"?: string,"tax_profile_status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "accredited_investor_status"?: string,"country"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"funder_type"?: string,"id"?: string,"kyc_status"?: string,"legal_name"?: string,"notes"?: string | null,"public_display_name"?: string | null,"sanctions_status"?: string,"tax_profile_status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"funding_commitments": {
                  Row: {
                    "agreement_id": string | null,"amount_original": number,"amount_usd": number | null,"created_at": string,"created_by": string | null,"currency": string,"date_pledged": string | null,"date_received": string | null,"funder_id": string,"id": string,"interest_inquiry_id": string | null,"lane": string,"notes": string | null,"payment_method": string | null,"receipt_id": string | null,"restriction_code": string | null,"restrictions": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreement_id"?: string | null,"amount_original": number,"amount_usd"?: number | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"date_pledged"?: string | null,"date_received"?: string | null,"funder_id": string,"id"?: string,"interest_inquiry_id"?: string | null,"lane": string,"notes"?: string | null,"payment_method"?: string | null,"receipt_id"?: string | null,"restriction_code"?: string | null,"restrictions"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "agreement_id"?: string | null,"amount_original"?: number,"amount_usd"?: number | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"date_pledged"?: string | null,"date_received"?: string | null,"funder_id"?: string,"id"?: string,"interest_inquiry_id"?: string | null,"lane"?: string,"notes"?: string | null,"payment_method"?: string | null,"receipt_id"?: string | null,"restriction_code"?: string | null,"restrictions"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "funding_commitments_funder_id_fkey"
      columns: ["funder_id"]
isOneToOne: false
      referencedRelation: "funders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "funding_commitments_interest_inquiry_id_fkey"
      columns: ["interest_inquiry_id"]
isOneToOne: false
      referencedRelation: "funding_interest_inquiries"
      referencedColumns: ["id"]
    }
                  ]
                },"funding_compliance_cases": {
                  Row: {
                    "case_type": string,"created_at": string,"created_by": string | null,"funder_id": string | null,"funding_commitment_id": string | null,"id": string,"notes": string | null,"priority": string,"resolved_at": string | null,"resolved_by": string | null,"status": string,"summary": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_type": string,"created_at"?: string,"created_by"?: string | null,"funder_id"?: string | null,"funding_commitment_id"?: string | null,"id"?: string,"notes"?: string | null,"priority"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"summary": string,"updated_at"?: string
                  }
                  Update: {
                    "case_type"?: string,"created_at"?: string,"created_by"?: string | null,"funder_id"?: string | null,"funding_commitment_id"?: string | null,"id"?: string,"notes"?: string | null,"priority"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"summary"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "funding_compliance_cases_funder_id_fkey"
      columns: ["funder_id"]
isOneToOne: false
      referencedRelation: "funders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "funding_compliance_cases_funding_commitment_id_fkey"
      columns: ["funding_commitment_id"]
isOneToOne: false
      referencedRelation: "funding_commitments"
      referencedColumns: ["id"]
    }
                  ]
                },"funding_interest_inquiries": {
                  Row: {
                    "accept_risk_disclosure": boolean,"accredited_investor_interest": boolean | null,"converted_commitment_id": string | null,"country": string | null,"created_at": string,"currency": string | null,"email": string,"full_name": string,"id": string,"indicated_amount_usd": number | null,"lane": string,"message": string | null,"organization": string | null,"status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accept_risk_disclosure"?: boolean,"accredited_investor_interest"?: boolean | null,"converted_commitment_id"?: string | null,"country"?: string | null,"created_at"?: string,"currency"?: string | null,"email": string,"full_name": string,"id"?: string,"indicated_amount_usd"?: number | null,"lane": string,"message"?: string | null,"organization"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "accept_risk_disclosure"?: boolean,"accredited_investor_interest"?: boolean | null,"converted_commitment_id"?: string | null,"country"?: string | null,"created_at"?: string,"currency"?: string | null,"email"?: string,"full_name"?: string,"id"?: string,"indicated_amount_usd"?: number | null,"lane"?: string,"message"?: string | null,"organization"?: string | null,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "funding_interest_inquiries_converted_commitment_id_fkey"
      columns: ["converted_commitment_id"]
isOneToOne: false
      referencedRelation: "funding_commitments"
      referencedColumns: ["id"]
    }
                  ]
                },"funding_ledger_audit_events": {
                  Row: {
                    "actor_user_id": string | null,"created_at": string,"entity_id": string,"entity_type": string,"event_type": string,"id": string,"payload": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_user_id"?: string | null,"created_at"?: string,"entity_id": string,"entity_type": string,"event_type": string,"id"?: string,"payload"?: NonNullable<Json>
                  }
                  Update: {
                    "actor_user_id"?: string | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"funding_ledger_entries": {
                  Row: {
                    "amount_usd": number,"audit_status": string,"bank_reference": string | null,"created_at": string,"created_by": string | null,"credit_account": string,"currency_original": string | null,"debit_account": string,"id": string,"memo": string | null,"restriction_code": string | null,"source_id": string,"source_type": string,"transaction_hash": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_usd": number,"audit_status"?: string,"bank_reference"?: string | null,"created_at"?: string,"created_by"?: string | null,"credit_account": string,"currency_original"?: string | null,"debit_account": string,"id"?: string,"memo"?: string | null,"restriction_code"?: string | null,"source_id": string,"source_type": string,"transaction_hash"?: string | null
                  }
                  Update: {
                    "amount_usd"?: number,"audit_status"?: string,"bank_reference"?: string | null,"created_at"?: string,"created_by"?: string | null,"credit_account"?: string,"currency_original"?: string | null,"debit_account"?: string,"id"?: string,"memo"?: string | null,"restriction_code"?: string | null,"source_id"?: string,"source_type"?: string,"transaction_hash"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"funding_payment_receipts": {
                  Row: {
                    "amount_usd": number,"created_at": string,"created_by": string | null,"currency": string,"external_reference": string | null,"funding_commitment_id": string,"id": string,"notes": string | null,"provider": string,"received_at": string,"reconciliation_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_usd": number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"external_reference"?: string | null,"funding_commitment_id": string,"id"?: string,"notes"?: string | null,"provider"?: string,"received_at"?: string,"reconciliation_status"?: string
                  }
                  Update: {
                    "amount_usd"?: number,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"external_reference"?: string | null,"funding_commitment_id"?: string,"id"?: string,"notes"?: string | null,"provider"?: string,"received_at"?: string,"reconciliation_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "funding_payment_receipts_funding_commitment_id_fkey"
      columns: ["funding_commitment_id"]
isOneToOne: false
      referencedRelation: "funding_commitments"
      referencedColumns: ["id"]
    }
                  ]
                },"funding_payouts": {
                  Row: {
                    "amount_usd": number,"contributor_id": string | null,"created_at": string,"distribution_period_id": string,"funder_id": string | null,"id": string,"notes": string | null,"payment_method": string | null,"recipient_id": string | null,"recipient_type": string,"status": string,"tax_document_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_usd": number,"contributor_id"?: string | null,"created_at"?: string,"distribution_period_id": string,"funder_id"?: string | null,"id"?: string,"notes"?: string | null,"payment_method"?: string | null,"recipient_id"?: string | null,"recipient_type": string,"status"?: string,"tax_document_status"?: string
                  }
                  Update: {
                    "amount_usd"?: number,"contributor_id"?: string | null,"created_at"?: string,"distribution_period_id"?: string,"funder_id"?: string | null,"id"?: string,"notes"?: string | null,"payment_method"?: string | null,"recipient_id"?: string | null,"recipient_type"?: string,"status"?: string,"tax_document_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "funding_payouts_contributor_id_fkey"
      columns: ["contributor_id"]
isOneToOne: false
      referencedRelation: "contributor_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "funding_payouts_distribution_period_id_fkey"
      columns: ["distribution_period_id"]
isOneToOne: false
      referencedRelation: "distribution_periods"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "funding_payouts_funder_id_fkey"
      columns: ["funder_id"]
isOneToOne: false
      referencedRelation: "funders"
      referencedColumns: ["id"]
    }
                  ]
                },"funding_transparency_publish": {
                  Row: {
                    "id": number,"is_published": boolean,"note": string | null,"published_at": string | null,"published_by": string | null,"unpublished_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"is_published"?: boolean,"note"?: string | null,"published_at"?: string | null,"published_by"?: string | null,"unpublished_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "id"?: number,"is_published"?: boolean,"note"?: string | null,"published_at"?: string | null,"published_by"?: string | null,"unpublished_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"governance_action_intents": {
                  Row: {
                    "action_scope": string,"actor_id": string,"client_created_at": string,"created_at": string,"id": string,"key_algorithm": string,"payload": NonNullable<Json>,"payload_hash": string,"public_key": string,"signature": string,"target_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action_scope": string,"actor_id": string,"client_created_at": string,"created_at"?: string,"id"?: string,"key_algorithm": string,"payload"?: NonNullable<Json>,"payload_hash": string,"public_key": string,"signature": string,"target_id"?: string | null
                  }
                  Update: {
                    "action_scope"?: string,"actor_id"?: string,"client_created_at"?: string,"created_at"?: string,"id"?: string,"key_algorithm"?: string,"payload"?: NonNullable<Json>,"payload_hash"?: string,"public_key"?: string,"signature"?: string,"target_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_action_intents_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_domain_maturity_snapshots": {
                  Row: {
                    "created_at": string,"domain_key": string,"id": string,"is_mature": boolean,"measured_at": string,"measured_by": string | null,"metadata": NonNullable<Json>,"notes": string | null,"source": string,"threshold_count": number,"threshold_results": NonNullable<Json>,"thresholds_met_count": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain_key": string,"id"?: string,"is_mature": boolean,"measured_at"?: string,"measured_by"?: string | null,"metadata"?: NonNullable<Json>,"notes"?: string | null,"source"?: string,"threshold_count"?: number,"threshold_results"?: NonNullable<Json>,"thresholds_met_count"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"domain_key"?: string,"id"?: string,"is_mature"?: boolean,"measured_at"?: string,"measured_by"?: string | null,"metadata"?: NonNullable<Json>,"notes"?: string | null,"source"?: string,"threshold_count"?: number,"threshold_results"?: NonNullable<Json>,"thresholds_met_count"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_domain_maturity_snapshots_domain_key_fkey"
      columns: ["domain_key"]
isOneToOne: false
      referencedRelation: "governance_domains"
      referencedColumns: ["domain_key"]
    },{
      foreignKeyName: "governance_domain_maturity_snapshots_measured_by_fkey"
      columns: ["measured_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_domain_maturity_thresholds": {
                  Row: {
                    "created_at": string,"description": string,"domain_key": string,"effective_from": string,"effective_until": string | null,"id": string,"is_active": boolean,"metadata": NonNullable<Json>,"required_count": number,"role_keys": (string)[],"threshold_key": string,"threshold_name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"domain_key": string,"effective_from"?: string,"effective_until"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"required_count": number,"role_keys"?: (string)[],"threshold_key": string,"threshold_name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"domain_key"?: string,"effective_from"?: string,"effective_until"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"required_count"?: number,"role_keys"?: (string)[],"threshold_key"?: string,"threshold_name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_domain_maturity_thresholds_domain_key_fkey"
      columns: ["domain_key"]
isOneToOne: false
      referencedRelation: "governance_domains"
      referencedColumns: ["domain_key"]
    }
                  ]
                },"governance_domain_maturity_transitions": {
                  Row: {
                    "created_at": string,"current_is_mature": boolean,"current_snapshot_id": string,"current_threshold_count": number,"current_thresholds_met_count": number,"domain_key": string,"id": string,"metadata": NonNullable<Json>,"previous_is_mature": boolean | null,"previous_snapshot_id": string | null,"previous_threshold_count": number | null,"previous_thresholds_met_count": number | null,"transition_type": string,"trigger_source": string,"triggered_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"current_is_mature": boolean,"current_snapshot_id": string,"current_threshold_count": number,"current_thresholds_met_count": number,"domain_key": string,"id"?: string,"metadata"?: NonNullable<Json>,"previous_is_mature"?: boolean | null,"previous_snapshot_id"?: string | null,"previous_threshold_count"?: number | null,"previous_thresholds_met_count"?: number | null,"transition_type": string,"trigger_source"?: string,"triggered_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"current_is_mature"?: boolean,"current_snapshot_id"?: string,"current_threshold_count"?: number,"current_thresholds_met_count"?: number,"domain_key"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"previous_is_mature"?: boolean | null,"previous_snapshot_id"?: string | null,"previous_threshold_count"?: number | null,"previous_thresholds_met_count"?: number | null,"transition_type"?: string,"trigger_source"?: string,"triggered_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_domain_maturity_transition_previous_snapshot_id_fkey"
      columns: ["previous_snapshot_id"]
isOneToOne: false
      referencedRelation: "governance_domain_maturity_snapshots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_domain_maturity_transitions_current_snapshot_id_fkey"
      columns: ["current_snapshot_id"]
isOneToOne: true
      referencedRelation: "governance_domain_maturity_snapshots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_domain_maturity_transitions_domain_key_fkey"
      columns: ["domain_key"]
isOneToOne: false
      referencedRelation: "governance_domains"
      referencedColumns: ["domain_key"]
    },{
      foreignKeyName: "governance_domain_maturity_transitions_triggered_by_fkey"
      columns: ["triggered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_domain_roles": {
                  Row: {
                    "created_at": string,"description": string,"domain_key": string,"is_system_role": boolean,"name": string,"role_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"domain_key": string,"is_system_role"?: boolean,"name": string,"role_key": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"domain_key"?: string,"is_system_role"?: boolean,"name"?: string,"role_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_domain_roles_domain_key_fkey"
      columns: ["domain_key"]
isOneToOne: false
      referencedRelation: "governance_domains"
      referencedColumns: ["domain_key"]
    }
                  ]
                },"governance_domains": {
                  Row: {
                    "created_at": string,"description": string,"domain_key": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"domain_key": string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"domain_key"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"governance_eligibility_snapshots": {
                  Row: {
                    "calculated_at": string,"calculation_version": string,"citizenship_status": Database["public"]['Enums']["citizenship_status"],"civizen_score": number,"created_at": string,"eligible": boolean,"governance_score": number,"id": string,"influence_weight": number,"is_active_citizen": boolean,"is_verified": boolean,"profile_id": string,"reason_codes": (string)[],"source": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calculated_at"?: string,"calculation_version"?: string,"citizenship_status": Database["public"]['Enums']["citizenship_status"],"civizen_score"?: number,"created_at"?: string,"eligible"?: boolean,"governance_score"?: number,"id"?: string,"influence_weight"?: number,"is_active_citizen"?: boolean,"is_verified"?: boolean,"profile_id": string,"reason_codes"?: (string)[],"source"?: string,"updated_at"?: string
                  }
                  Update: {
                    "calculated_at"?: string,"calculation_version"?: string,"citizenship_status"?: Database["public"]['Enums']["citizenship_status"],"civizen_score"?: number,"created_at"?: string,"eligible"?: boolean,"governance_score"?: number,"id"?: string,"influence_weight"?: number,"is_active_citizen"?: boolean,"is_verified"?: boolean,"profile_id"?: string,"reason_codes"?: (string)[],"source"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_eligibility_snapshots_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_emergency_access_ops_policies": {
                  Row: {
                    "approved_max_age_minutes": number,"created_at": string,"escalation_enabled": boolean,"metadata": NonNullable<Json>,"near_expiry_window_minutes": number,"oncall_channel": string,"pending_max_age_hours": number,"policy_key": string,"policy_name": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_max_age_minutes"?: number,"created_at"?: string,"escalation_enabled"?: boolean,"metadata"?: NonNullable<Json>,"near_expiry_window_minutes"?: number,"oncall_channel"?: string,"pending_max_age_hours"?: number,"policy_key": string,"policy_name": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "approved_max_age_minutes"?: number,"created_at"?: string,"escalation_enabled"?: boolean,"metadata"?: NonNullable<Json>,"near_expiry_window_minutes"?: number,"oncall_channel"?: string,"pending_max_age_hours"?: number,"policy_key"?: string,"policy_name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_emergency_access_ops_policies_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_emergency_access_ops_policy_events": {
                  Row: {
                    "actor_profile_id": string | null,"created_at": string,"event_message": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"policy_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"event_message": string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"policy_key": string
                  }
                  Update: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"event_message"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"policy_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_emergency_access_ops_policy_ev_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_emergency_access_request_events": {
                  Row: {
                    "actor_profile_id": string | null,"created_at": string,"event_message": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"request_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"event_message": string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"request_id": string
                  }
                  Update: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"event_message"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"request_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_emergency_access_request_event_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_emergency_access_request_events_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "governance_emergency_access_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_emergency_access_requests": {
                  Row: {
                    "approved_expires_at": string | null,"consumed_at": string | null,"consumed_by": string | null,"created_at": string,"id": string,"request_reason": string,"request_status": string,"requested_by": string,"review_notes": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"target_profile_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_expires_at"?: string | null,"consumed_at"?: string | null,"consumed_by"?: string | null,"created_at"?: string,"id"?: string,"request_reason": string,"request_status"?: string,"requested_by": string,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"target_profile_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "approved_expires_at"?: string | null,"consumed_at"?: string | null,"consumed_by"?: string | null,"created_at"?: string,"id"?: string,"request_reason"?: string,"request_status"?: string,"requested_by"?: string,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"target_profile_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_emergency_access_requests_consumed_by_fkey"
      columns: ["consumed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_emergency_access_requests_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_emergency_access_requests_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_emergency_access_requests_target_profile_id_fkey"
      columns: ["target_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_emergency_access_requests_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_execution_threshold_rules": {
                  Row: {
                    "action_type": string,"approval_class": Database["public"]['Enums']["governance_threshold_approval_class"],"created_at": string,"decision_class": Database["public"]['Enums']["governance_decision_class"] | null,"id": string,"is_active": boolean,"metadata": NonNullable<Json>,"min_approval_share": number,"min_approval_votes": number,"min_decisive_votes": number,"min_quorum": number,"notes": string | null,"requires_window_close": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_type": string,"approval_class"?: Database["public"]['Enums']["governance_threshold_approval_class"],"created_at"?: string,"decision_class"?: Database["public"]['Enums']["governance_decision_class"] | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"min_approval_share"?: number,"min_approval_votes"?: number,"min_decisive_votes"?: number,"min_quorum"?: number,"notes"?: string | null,"requires_window_close"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "action_type"?: string,"approval_class"?: Database["public"]['Enums']["governance_threshold_approval_class"],"created_at"?: string,"decision_class"?: Database["public"]['Enums']["governance_decision_class"] | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"min_approval_share"?: number,"min_approval_votes"?: number,"min_decisive_votes"?: number,"min_quorum"?: number,"notes"?: string | null,"requires_window_close"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"governance_execution_unit_memberships": {
                  Row: {
                    "assigned_at": string,"assigned_by": string | null,"created_at": string,"id": string,"is_active": boolean,"membership_role": Database["public"]['Enums']["governance_unit_membership_role"],"notes": string | null,"profile_id": string,"unit_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"membership_role"?: Database["public"]['Enums']["governance_unit_membership_role"],"notes"?: string | null,"profile_id": string,"unit_id": string
                  }
                  Update: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"membership_role"?: Database["public"]['Enums']["governance_unit_membership_role"],"notes"?: string | null,"profile_id"?: string,"unit_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_execution_unit_memberships_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_execution_unit_memberships_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_execution_unit_memberships_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "governance_execution_units"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_execution_units": {
                  Row: {
                    "created_at": string,"description": string,"domain_key": string,"id": string,"is_active": boolean,"is_system_unit": boolean,"name": string,"unit_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"domain_key": string,"id"?: string,"is_active"?: boolean,"is_system_unit"?: boolean,"name": string,"unit_key": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"domain_key"?: string,"id"?: string,"is_active"?: boolean,"is_system_unit"?: boolean,"name"?: string,"unit_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_execution_units_domain_key_fkey"
      columns: ["domain_key"]
isOneToOne: false
      referencedRelation: "governance_domains"
      referencedColumns: ["domain_key"]
    }
                  ]
                },"governance_guardian_external_signers": {
                  Row: {
                    "activated_at": string,"added_by": string | null,"created_at": string,"custody_provider": string | null,"deactivated_at": string | null,"id": string,"is_active": boolean,"key_algorithm": string,"metadata": NonNullable<Json>,"signer_key": string,"signer_label": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activated_at"?: string,"added_by"?: string | null,"created_at"?: string,"custody_provider"?: string | null,"deactivated_at"?: string | null,"id"?: string,"is_active"?: boolean,"key_algorithm"?: string,"metadata"?: NonNullable<Json>,"signer_key": string,"signer_label"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "activated_at"?: string,"added_by"?: string | null,"created_at"?: string,"custody_provider"?: string | null,"deactivated_at"?: string | null,"id"?: string,"is_active"?: boolean,"key_algorithm"?: string,"metadata"?: NonNullable<Json>,"signer_key"?: string,"signer_label"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_guardian_external_signers_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_guardian_multisig_policies": {
                  Row: {
                    "contract_reference": string | null,"created_at": string,"id": string,"is_enabled": boolean,"metadata": NonNullable<Json>,"network": string | null,"notes": string | null,"policy_key": string,"policy_name": string,"required_external_approvals": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contract_reference"?: string | null,"created_at"?: string,"id"?: string,"is_enabled"?: boolean,"metadata"?: NonNullable<Json>,"network"?: string | null,"notes"?: string | null,"policy_key": string,"policy_name": string,"required_external_approvals"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "contract_reference"?: string | null,"created_at"?: string,"id"?: string,"is_enabled"?: boolean,"metadata"?: NonNullable<Json>,"network"?: string | null,"notes"?: string | null,"policy_key"?: string,"policy_name"?: string,"required_external_approvals"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_guardian_multisig_policies_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_guardian_relay_alerts": {
                  Row: {
                    "acknowledged_at": string | null,"alert_key": string,"alert_message": string,"alert_scope": string,"alert_status": string,"created_at": string,"created_by": string | null,"id": string,"metadata": NonNullable<Json>,"opened_at": string,"proposal_id": string,"resolved_at": string | null,"resolved_by": string | null,"severity": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"alert_key": string,"alert_message": string,"alert_scope": string,"alert_status"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opened_at"?: string,"proposal_id": string,"resolved_at"?: string | null,"resolved_by"?: string | null,"severity": string,"updated_at"?: string
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"alert_key"?: string,"alert_message"?: string,"alert_scope"?: string,"alert_status"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opened_at"?: string,"proposal_id"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"severity"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_guardian_relay_alerts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_guardian_relay_alerts_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_guardian_relay_alerts_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_guardian_relay_audit_reports": {
                  Row: {
                    "audit_metadata": NonNullable<Json>,"audit_notes": string | null,"captured_at": string,"captured_by": string | null,"chain_proof_match_met": boolean,"created_at": string,"distinct_operators_count": number,"distinct_providers_count": number,"distinct_regions_count": number,"id": string,"min_distinct_relay_operators": number,"min_distinct_relay_providers": number,"min_distinct_relay_regions": number,"overall_diversity_met": boolean,"policy_enabled": boolean,"proposal_id": string,"relay_quorum_met": boolean,"required_relay_attestations": number,"verified_relay_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "audit_metadata"?: NonNullable<Json>,"audit_notes"?: string | null,"captured_at"?: string,"captured_by"?: string | null,"chain_proof_match_met"?: boolean,"created_at"?: string,"distinct_operators_count"?: number,"distinct_providers_count"?: number,"distinct_regions_count"?: number,"id"?: string,"min_distinct_relay_operators"?: number,"min_distinct_relay_providers"?: number,"min_distinct_relay_regions"?: number,"overall_diversity_met"?: boolean,"policy_enabled"?: boolean,"proposal_id": string,"relay_quorum_met"?: boolean,"required_relay_attestations"?: number,"verified_relay_count"?: number
                  }
                  Update: {
                    "audit_metadata"?: NonNullable<Json>,"audit_notes"?: string | null,"captured_at"?: string,"captured_by"?: string | null,"chain_proof_match_met"?: boolean,"created_at"?: string,"distinct_operators_count"?: number,"distinct_providers_count"?: number,"distinct_regions_count"?: number,"id"?: string,"min_distinct_relay_operators"?: number,"min_distinct_relay_providers"?: number,"min_distinct_relay_regions"?: number,"overall_diversity_met"?: boolean,"policy_enabled"?: boolean,"proposal_id"?: string,"relay_quorum_met"?: boolean,"required_relay_attestations"?: number,"verified_relay_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_guardian_relay_audit_reports_captured_by_fkey"
      columns: ["captured_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_guardian_relay_audit_reports_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_guardian_relay_nodes": {
                  Row: {
                    "added_by": string | null,"created_at": string,"endpoint_url": string | null,"id": string,"is_active": boolean,"key_algorithm": string,"metadata": NonNullable<Json>,"relay_infrastructure_provider": string,"relay_jurisdiction_country_code": string,"relay_key": string,"relay_label": string | null,"relay_operator_label": string,"relay_operator_uri": string | null,"relay_region_code": string,"relay_trust_domain": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"endpoint_url"?: string | null,"id"?: string,"is_active"?: boolean,"key_algorithm"?: string,"metadata"?: NonNullable<Json>,"relay_infrastructure_provider"?: string,"relay_jurisdiction_country_code"?: string,"relay_key": string,"relay_label"?: string | null,"relay_operator_label"?: string,"relay_operator_uri"?: string | null,"relay_region_code"?: string,"relay_trust_domain"?: string,"updated_at"?: string
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"endpoint_url"?: string | null,"id"?: string,"is_active"?: boolean,"key_algorithm"?: string,"metadata"?: NonNullable<Json>,"relay_infrastructure_provider"?: string,"relay_jurisdiction_country_code"?: string,"relay_key"?: string,"relay_label"?: string | null,"relay_operator_label"?: string,"relay_operator_uri"?: string | null,"relay_region_code"?: string,"relay_trust_domain"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_guardian_relay_nodes_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_guardian_relay_policies": {
                  Row: {
                    "created_at": string,"id": string,"is_enabled": boolean,"max_dominant_relay_jurisdiction_share_percent": number,"max_dominant_relay_operator_share_percent": number,"max_dominant_relay_provider_share_percent": number,"max_dominant_relay_region_share_percent": number,"max_dominant_relay_trust_domain_share_percent": number,"max_open_critical_relay_alerts": number,"metadata": NonNullable<Json>,"min_distinct_relay_jurisdictions": number,"min_distinct_relay_operators": number,"min_distinct_relay_providers": number,"min_distinct_relay_regions": number,"min_distinct_relay_trust_domains": number,"notes": string | null,"policy_key": string,"policy_name": string,"relay_attestation_sla_minutes": number,"require_chain_proof_match": boolean,"require_relay_ops_readiness": boolean,"require_trust_minimized_quorum": boolean,"required_relay_attestations": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_enabled"?: boolean,"max_dominant_relay_jurisdiction_share_percent"?: number,"max_dominant_relay_operator_share_percent"?: number,"max_dominant_relay_provider_share_percent"?: number,"max_dominant_relay_region_share_percent"?: number,"max_dominant_relay_trust_domain_share_percent"?: number,"max_open_critical_relay_alerts"?: number,"metadata"?: NonNullable<Json>,"min_distinct_relay_jurisdictions"?: number,"min_distinct_relay_operators"?: number,"min_distinct_relay_providers"?: number,"min_distinct_relay_regions"?: number,"min_distinct_relay_trust_domains"?: number,"notes"?: string | null,"policy_key": string,"policy_name": string,"relay_attestation_sla_minutes"?: number,"require_chain_proof_match"?: boolean,"require_relay_ops_readiness"?: boolean,"require_trust_minimized_quorum"?: boolean,"required_relay_attestations"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_enabled"?: boolean,"max_dominant_relay_jurisdiction_share_percent"?: number,"max_dominant_relay_operator_share_percent"?: number,"max_dominant_relay_provider_share_percent"?: number,"max_dominant_relay_region_share_percent"?: number,"max_dominant_relay_trust_domain_share_percent"?: number,"max_open_critical_relay_alerts"?: number,"metadata"?: NonNullable<Json>,"min_distinct_relay_jurisdictions"?: number,"min_distinct_relay_operators"?: number,"min_distinct_relay_providers"?: number,"min_distinct_relay_regions"?: number,"min_distinct_relay_trust_domains"?: number,"notes"?: string | null,"policy_key"?: string,"policy_name"?: string,"relay_attestation_sla_minutes"?: number,"require_chain_proof_match"?: boolean,"require_relay_ops_readiness"?: boolean,"require_trust_minimized_quorum"?: boolean,"required_relay_attestations"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_guardian_relay_policies_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_guardian_relay_worker_runs": {
                  Row: {
                    "created_at": string,"created_by": string | null,"error_message": string | null,"id": string,"observed_at": string,"open_alert_count": number,"processed_signer_count": number,"proposal_id": string,"run_payload": NonNullable<Json>,"run_scope": string,"run_status": string,"stale_signer_count": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"error_message"?: string | null,"id"?: string,"observed_at"?: string,"open_alert_count"?: number,"processed_signer_count"?: number,"proposal_id": string,"run_payload"?: NonNullable<Json>,"run_scope": string,"run_status": string,"stale_signer_count"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"error_message"?: string | null,"id"?: string,"observed_at"?: string,"open_alert_count"?: number,"processed_signer_count"?: number,"proposal_id"?: string,"run_payload"?: NonNullable<Json>,"run_scope"?: string,"run_status"?: string,"stale_signer_count"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_guardian_relay_worker_runs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_guardian_relay_worker_runs_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_implementation_logs": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"execution_status": Database["public"]['Enums']["governance_implementation_status"],"execution_summary": string,"id": string,"implementation_id": string,"proposal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"execution_status": Database["public"]['Enums']["governance_implementation_status"],"execution_summary"?: string,"id"?: string,"implementation_id": string,"proposal_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"execution_status"?: Database["public"]['Enums']["governance_implementation_status"],"execution_summary"?: string,"id"?: string,"implementation_id"?: string,"proposal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_implementation_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_implementation_logs_implementation_id_fkey"
      columns: ["implementation_id"]
isOneToOne: false
      referencedRelation: "governance_proposal_implementations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_implementation_logs_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_client_verification_manifests": {
                  Row: {
                    "captured_at": string,"captured_by": string | null,"created_at": string,"id": string,"manifest_hash": string,"manifest_payload": NonNullable<Json>,"manifest_scope": string,"manifest_version": string,"metadata": NonNullable<Json>,"proposal_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_at"?: string,"captured_by"?: string | null,"created_at"?: string,"id"?: string,"manifest_hash": string,"manifest_payload"?: NonNullable<Json>,"manifest_scope": string,"manifest_version": string,"metadata"?: NonNullable<Json>,"proposal_id": string,"updated_at"?: string
                  }
                  Update: {
                    "captured_at"?: string,"captured_by"?: string | null,"created_at"?: string,"id"?: string,"manifest_hash"?: string,"manifest_payload"?: NonNullable<Json>,"manifest_scope"?: string,"manifest_version"?: string,"metadata"?: NonNullable<Json>,"proposal_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_client_verification_manife_captured_by_fkey"
      columns: ["captured_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_client_verification_manife_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_client_verification_package_signatures": {
                  Row: {
                    "created_at": string,"created_by": string | null,"distribution_channel": string,"id": string,"metadata": NonNullable<Json>,"package_id": string,"package_scope": string,"proposal_id": string,"signature": string,"signature_algorithm": string,"signed_at": string,"signer_identity_uri": string | null,"signer_jurisdiction_country_code": string | null,"signer_key": string,"signer_trust_domain": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"distribution_channel"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"package_id": string,"package_scope": string,"proposal_id": string,"signature": string,"signature_algorithm": string,"signed_at"?: string,"signer_identity_uri"?: string | null,"signer_jurisdiction_country_code"?: string | null,"signer_key": string,"signer_trust_domain"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"distribution_channel"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"package_id"?: string,"package_scope"?: string,"proposal_id"?: string,"signature"?: string,"signature_algorithm"?: string,"signed_at"?: string,"signer_identity_uri"?: string | null,"signer_jurisdiction_country_code"?: string | null,"signer_key"?: string,"signer_trust_domain"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_client_verification_packa_proposal_id_fkey1"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_client_verification_package_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_client_verification_package_package_id_fkey"
      columns: ["package_id"]
isOneToOne: false
      referencedRelation: "governance_proposal_client_verification_packages"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_client_verification_packages": {
                  Row: {
                    "captured_at": string,"captured_by": string | null,"created_at": string,"id": string,"metadata": NonNullable<Json>,"package_hash": string,"package_payload": NonNullable<Json>,"package_scope": string,"package_version": string,"proposal_id": string,"source_manifest_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_at"?: string,"captured_by"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"package_hash": string,"package_payload"?: NonNullable<Json>,"package_scope": string,"package_version": string,"proposal_id": string,"source_manifest_id": string,"updated_at"?: string
                  }
                  Update: {
                    "captured_at"?: string,"captured_by"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"package_hash"?: string,"package_payload"?: NonNullable<Json>,"package_scope"?: string,"package_version"?: string,"proposal_id"?: string,"source_manifest_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_client_verification_packag_captured_by_fkey"
      columns: ["captured_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_client_verification_packag_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_client_verification_source_manifest_id_fkey"
      columns: ["source_manifest_id"]
isOneToOne: false
      referencedRelation: "governance_proposal_client_verification_manifests"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"event_type": string,"id": string,"payload": NonNullable<Json>,"proposal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"event_type": string,"id"?: string,"payload"?: NonNullable<Json>,"proposal_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>,"proposal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_events_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_guardian_approvals": {
                  Row: {
                    "created_at": string,"decision": Database["public"]['Enums']["governance_guardian_decision"],"id": string,"proposal_id": string,"rationale": string | null,"signed_at": string,"signer_profile_id": string,"snapshot": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decision": Database["public"]['Enums']["governance_guardian_decision"],"id"?: string,"proposal_id": string,"rationale"?: string | null,"signed_at"?: string,"signer_profile_id": string,"snapshot"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"decision"?: Database["public"]['Enums']["governance_guardian_decision"],"id"?: string,"proposal_id"?: string,"rationale"?: string | null,"signed_at"?: string,"signer_profile_id"?: string,"snapshot"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_guardian_approvals_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_guardian_approvals_signer_profile_id_fkey"
      columns: ["signer_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_guardian_external_signatures": {
                  Row: {
                    "created_at": string,"decision": Database["public"]['Enums']["governance_guardian_decision"],"external_signer_id": string,"id": string,"payload_hash": string | null,"proposal_id": string,"rationale": string | null,"signature": string | null,"signature_reference": string | null,"signed_at": string,"signed_message": string | null,"snapshot": NonNullable<Json>,"updated_at": string,"verification_method": string,"verified_at": string,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decision": Database["public"]['Enums']["governance_guardian_decision"],"external_signer_id": string,"id"?: string,"payload_hash"?: string | null,"proposal_id": string,"rationale"?: string | null,"signature"?: string | null,"signature_reference"?: string | null,"signed_at"?: string,"signed_message"?: string | null,"snapshot"?: NonNullable<Json>,"updated_at"?: string,"verification_method"?: string,"verified_at"?: string,"verified_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"decision"?: Database["public"]['Enums']["governance_guardian_decision"],"external_signer_id"?: string,"id"?: string,"payload_hash"?: string | null,"proposal_id"?: string,"rationale"?: string | null,"signature"?: string | null,"signature_reference"?: string | null,"signed_at"?: string,"signed_message"?: string | null,"snapshot"?: NonNullable<Json>,"updated_at"?: string,"verification_method"?: string,"verified_at"?: string,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_guardian_external_s_external_signer_id_fkey"
      columns: ["external_signer_id"]
isOneToOne: false
      referencedRelation: "governance_guardian_external_signers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_guardian_external_signatur_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_guardian_external_signatur_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_guardian_relay_attestations": {
                  Row: {
                    "attestation_metadata": NonNullable<Json>,"chain_network": string | null,"chain_reference": string | null,"created_at": string,"decision": Database["public"]['Enums']["governance_guardian_decision"],"external_signer_id": string,"id": string,"payload_hash": string | null,"proposal_id": string,"relay_id": string,"relay_reference": string | null,"status": Database["public"]['Enums']["governance_guardian_relay_attestation_status"],"updated_at": string,"verified_at": string,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attestation_metadata"?: NonNullable<Json>,"chain_network"?: string | null,"chain_reference"?: string | null,"created_at"?: string,"decision": Database["public"]['Enums']["governance_guardian_decision"],"external_signer_id": string,"id"?: string,"payload_hash"?: string | null,"proposal_id": string,"relay_id": string,"relay_reference"?: string | null,"status"?: Database["public"]['Enums']["governance_guardian_relay_attestation_status"],"updated_at"?: string,"verified_at"?: string,"verified_by"?: string | null
                  }
                  Update: {
                    "attestation_metadata"?: NonNullable<Json>,"chain_network"?: string | null,"chain_reference"?: string | null,"created_at"?: string,"decision"?: Database["public"]['Enums']["governance_guardian_decision"],"external_signer_id"?: string,"id"?: string,"payload_hash"?: string | null,"proposal_id"?: string,"relay_id"?: string,"relay_reference"?: string | null,"status"?: Database["public"]['Enums']["governance_guardian_relay_attestation_status"],"updated_at"?: string,"verified_at"?: string,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_guardian_relay_atte_external_signer_id_fkey"
      columns: ["external_signer_id"]
isOneToOne: false
      referencedRelation: "governance_guardian_external_signers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_guardian_relay_attestation_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_guardian_relay_attestation_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_guardian_relay_attestations_relay_id_fkey"
      columns: ["relay_id"]
isOneToOne: false
      referencedRelation: "governance_guardian_relay_nodes"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_implementations": {
                  Row: {
                    "assigned_at": string,"completed_at": string | null,"created_at": string,"created_by": string | null,"id": string,"implementation_summary": string,"metadata": NonNullable<Json>,"proposal_id": string,"started_at": string | null,"status": Database["public"]['Enums']["governance_implementation_status"],"unit_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"implementation_summary"?: string,"metadata"?: NonNullable<Json>,"proposal_id": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["governance_implementation_status"],"unit_id": string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_at"?: string,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"implementation_summary"?: string,"metadata"?: NonNullable<Json>,"proposal_id"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["governance_implementation_status"],"unit_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_implementations_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_implementations_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_implementations_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "governance_execution_units"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposal_votes": {
                  Row: {
                    "choice": Database["public"]['Enums']["governance_vote_choice"],"created_at": string,"id": string,"proposal_id": string,"rationale": string | null,"snapshot": NonNullable<Json>,"updated_at": string,"voter_id": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "choice": Database["public"]['Enums']["governance_vote_choice"],"created_at"?: string,"id"?: string,"proposal_id": string,"rationale"?: string | null,"snapshot"?: NonNullable<Json>,"updated_at"?: string,"voter_id": string,"weight"?: number
                  }
                  Update: {
                    "choice"?: Database["public"]['Enums']["governance_vote_choice"],"created_at"?: string,"id"?: string,"proposal_id"?: string,"rationale"?: string | null,"snapshot"?: NonNullable<Json>,"updated_at"?: string,"voter_id"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposal_votes_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "governance_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_proposal_votes_voter_id_fkey"
      columns: ["voter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_proposals": {
                  Row: {
                    "approval_threshold": number,"body": string,"bootstrap_mode": boolean,"closes_at": string,"created_at": string,"decision_class": Database["public"]['Enums']["governance_decision_class"],"eligible_voter_count_snapshot": number,"final_decision_summary": string | null,"id": string,"metadata": NonNullable<Json>,"opens_at": string,"proposal_type": string,"proposer_id": string,"required_quorum": number,"resolved_at": string | null,"status": Database["public"]['Enums']["governance_proposal_status"],"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approval_threshold"?: number,"body"?: string,"bootstrap_mode"?: boolean,"closes_at"?: string,"created_at"?: string,"decision_class"?: Database["public"]['Enums']["governance_decision_class"],"eligible_voter_count_snapshot"?: number,"final_decision_summary"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opens_at"?: string,"proposal_type"?: string,"proposer_id": string,"required_quorum"?: number,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["governance_proposal_status"],"summary"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "approval_threshold"?: number,"body"?: string,"bootstrap_mode"?: boolean,"closes_at"?: string,"created_at"?: string,"decision_class"?: Database["public"]['Enums']["governance_decision_class"],"eligible_voter_count_snapshot"?: number,"final_decision_summary"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opens_at"?: string,"proposal_type"?: string,"proposer_id"?: string,"required_quorum"?: number,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["governance_proposal_status"],"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_proposals_proposer_id_fkey"
      columns: ["proposer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_anchor_adapters": {
                  Row: {
                    "adapter_key": string,"adapter_name": string,"added_by": string | null,"attestation_scheme": string,"created_at": string,"endpoint_url": string | null,"id": string,"is_active": boolean,"metadata": NonNullable<Json>,"network": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter_key": string,"adapter_name": string,"added_by"?: string | null,"attestation_scheme"?: string,"created_at"?: string,"endpoint_url"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"network": string,"updated_at"?: string
                  }
                  Update: {
                    "adapter_key"?: string,"adapter_name"?: string,"added_by"?: string | null,"attestation_scheme"?: string,"created_at"?: string,"endpoint_url"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"network"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_anchor_adapters_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_anchor_execution_jobs": {
                  Row: {
                    "adapter_id": string,"attempt_count": number,"batch_id": string,"block_height": number | null,"claim_expires_at": string | null,"claimed_at": string | null,"claimed_by": string | null,"completed_at": string | null,"created_at": string,"error_message": string | null,"id": string,"immutable_reference": string | null,"max_attempts": number,"metadata": NonNullable<Json>,"network": string,"next_attempt_at": string,"scheduled_at": string,"scheduled_by": string | null,"started_at": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter_id": string,"attempt_count"?: number,"batch_id": string,"block_height"?: number | null,"claim_expires_at"?: string | null,"claimed_at"?: string | null,"claimed_by"?: string | null,"completed_at"?: string | null,"created_at"?: string,"error_message"?: string | null,"id"?: string,"immutable_reference"?: string | null,"max_attempts"?: number,"metadata"?: NonNullable<Json>,"network": string,"next_attempt_at"?: string,"scheduled_at"?: string,"scheduled_by"?: string | null,"started_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "adapter_id"?: string,"attempt_count"?: number,"batch_id"?: string,"block_height"?: number | null,"claim_expires_at"?: string | null,"claimed_at"?: string | null,"claimed_by"?: string | null,"completed_at"?: string | null,"created_at"?: string,"error_message"?: string | null,"id"?: string,"immutable_reference"?: string | null,"max_attempts"?: number,"metadata"?: NonNullable<Json>,"network"?: string,"next_attempt_at"?: string,"scheduled_at"?: string,"scheduled_by"?: string | null,"started_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_anchor_execution_jobs_adapter_id_fkey"
      columns: ["adapter_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_anchor_adapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_anchor_execution_jobs_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_anchor_execution_jobs_scheduled_by_fkey"
      columns: ["scheduled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_batch_items": {
                  Row: {
                    "batch_id": string,"created_at": string,"event_actor_id": string | null,"event_created_at": string,"event_digest": string,"event_id": string,"event_payload": NonNullable<Json>,"event_position": number,"event_source": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"event_actor_id"?: string | null,"event_created_at": string,"event_digest": string,"event_id": string,"event_payload"?: NonNullable<Json>,"event_position": number,"event_source": string,"id"?: string
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"event_actor_id"?: string | null,"event_created_at"?: string,"event_digest"?: string,"event_id"?: string,"event_payload"?: NonNullable<Json>,"event_position"?: number,"event_source"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_batch_items_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_batch_items_event_actor_id_fkey"
      columns: ["event_actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_batch_verifications": {
                  Row: {
                    "batch_id": string,"created_at": string,"id": string,"proof_payload": NonNullable<Json>,"proof_reference": string | null,"status": Database["public"]['Enums']["governance_public_audit_verification_status"],"updated_at": string,"verification_hash": string | null,"verified_at": string,"verified_by": string | null,"verifier_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"id"?: string,"proof_payload"?: NonNullable<Json>,"proof_reference"?: string | null,"status": Database["public"]['Enums']["governance_public_audit_verification_status"],"updated_at"?: string,"verification_hash"?: string | null,"verified_at"?: string,"verified_by"?: string | null,"verifier_id": string
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"id"?: string,"proof_payload"?: NonNullable<Json>,"proof_reference"?: string | null,"status"?: Database["public"]['Enums']["governance_public_audit_verification_status"],"updated_at"?: string,"verification_hash"?: string | null,"verified_at"?: string,"verified_by"?: string | null,"verifier_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_batch_verifications_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_batch_verifications_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_batch_verifications_verifier_id_fkey"
      columns: ["verifier_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_nodes"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_batches": {
                  Row: {
                    "anchor_network": string | null,"anchor_proof": Json | null,"anchor_reference": string | null,"anchored_at": string | null,"batch_hash": string,"batch_index": number,"batch_scope": string,"batch_source": string,"created_at": string,"created_by": string | null,"event_count": number,"from_created_at": string | null,"id": string,"metadata": NonNullable<Json>,"previous_batch_hash": string | null,"previous_batch_id": string | null,"to_created_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anchor_network"?: string | null,"anchor_proof"?: Json | null,"anchor_reference"?: string | null,"anchored_at"?: string | null,"batch_hash": string,"batch_index"?: never,"batch_scope"?: string,"batch_source"?: string,"created_at"?: string,"created_by"?: string | null,"event_count"?: number,"from_created_at"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"previous_batch_hash"?: string | null,"previous_batch_id"?: string | null,"to_created_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "anchor_network"?: string | null,"anchor_proof"?: Json | null,"anchor_reference"?: string | null,"anchored_at"?: string | null,"batch_hash"?: string,"batch_index"?: never,"batch_scope"?: string,"batch_source"?: string,"created_at"?: string,"created_by"?: string | null,"event_count"?: number,"from_created_at"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"previous_batch_hash"?: string | null,"previous_batch_id"?: string | null,"to_created_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_batches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_batches_previous_batch_id_fkey"
      columns: ["previous_batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_external_execution_pages": {
                  Row: {
                    "acknowledged_at": string | null,"batch_id": string | null,"created_at": string,"created_by": string | null,"id": string,"oncall_channel": string,"opened_at": string,"page_key": string,"page_message": string,"page_payload": NonNullable<Json>,"page_status": string,"resolved_at": string | null,"resolved_by": string | null,"severity": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"batch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"oncall_channel": string,"opened_at"?: string,"page_key": string,"page_message": string,"page_payload"?: NonNullable<Json>,"page_status"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"severity": string,"updated_at"?: string
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"batch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"oncall_channel"?: string,"opened_at"?: string,"page_key"?: string,"page_message"?: string,"page_payload"?: NonNullable<Json>,"page_status"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"severity"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_external_execution_pag_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_external_execution_page_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_external_execution_pages_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_external_execution_policies": {
                  Row: {
                    "anchor_max_attempts": number,"claim_ttl_minutes": number,"created_at": string,"is_active": boolean,"metadata": NonNullable<Json>,"oncall_channel": string,"paging_enabled": boolean,"paging_failure_share_percent": number,"paging_stale_pending_minutes": number,"policy_key": string,"policy_name": string,"retry_base_delay_minutes": number,"retry_max_delay_minutes": number,"updated_at": string,"updated_by": string | null,"verifier_max_attempts": number
                  }
                  ComputedFields: never
                  Insert: {
                    "anchor_max_attempts"?: number,"claim_ttl_minutes"?: number,"created_at"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"oncall_channel"?: string,"paging_enabled"?: boolean,"paging_failure_share_percent"?: number,"paging_stale_pending_minutes"?: number,"policy_key": string,"policy_name": string,"retry_base_delay_minutes"?: number,"retry_max_delay_minutes"?: number,"updated_at"?: string,"updated_by"?: string | null,"verifier_max_attempts"?: number
                  }
                  Update: {
                    "anchor_max_attempts"?: number,"claim_ttl_minutes"?: number,"created_at"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"oncall_channel"?: string,"paging_enabled"?: boolean,"paging_failure_share_percent"?: number,"paging_stale_pending_minutes"?: number,"policy_key"?: string,"policy_name"?: string,"retry_base_delay_minutes"?: number,"retry_max_delay_minutes"?: number,"updated_at"?: string,"updated_by"?: string | null,"verifier_max_attempts"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_external_execution_poli_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_immutable_anchors": {
                  Row: {
                    "adapter_id": string | null,"anchored_at": string,"anchored_by": string | null,"batch_id": string,"block_height": number | null,"created_at": string,"id": string,"immutable_reference": string,"network": string,"proof_payload": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "adapter_id"?: string | null,"anchored_at"?: string,"anchored_by"?: string | null,"batch_id": string,"block_height"?: number | null,"created_at"?: string,"id"?: string,"immutable_reference": string,"network": string,"proof_payload"?: NonNullable<Json>
                  }
                  Update: {
                    "adapter_id"?: string | null,"anchored_at"?: string,"anchored_by"?: string | null,"batch_id"?: string,"block_height"?: number | null,"created_at"?: string,"id"?: string,"immutable_reference"?: string,"network"?: string,"proof_payload"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_immutable_anchors_adapter_id_fkey"
      columns: ["adapter_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_anchor_adapters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_immutable_anchors_anchored_by_fkey"
      columns: ["anchored_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_immutable_anchors_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_network_proofs": {
                  Row: {
                    "batch_id": string,"block_height": number | null,"created_at": string,"id": string,"network": string,"proof_payload": NonNullable<Json>,"proof_reference": string,"recorded_at": string,"recorded_by": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"block_height"?: number | null,"created_at"?: string,"id"?: string,"network": string,"proof_payload"?: NonNullable<Json>,"proof_reference": string,"recorded_at"?: string,"recorded_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string,"block_height"?: number | null,"created_at"?: string,"id"?: string,"network"?: string,"proof_payload"?: NonNullable<Json>,"proof_reference"?: string,"recorded_at"?: string,"recorded_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_network_proofs_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_network_proofs_recorded_by_fkey"
      columns: ["recorded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_replication_policies": {
                  Row: {
                    "created_at": string,"id": string,"is_enabled": boolean,"metadata": NonNullable<Json>,"notes": string | null,"policy_key": string,"policy_name": string,"required_network_proof_count": number,"required_verified_count": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_enabled"?: boolean,"metadata"?: NonNullable<Json>,"notes"?: string | null,"policy_key": string,"policy_name": string,"required_network_proof_count"?: number,"required_verified_count"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_enabled"?: boolean,"metadata"?: NonNullable<Json>,"notes"?: string | null,"policy_key"?: string,"policy_name"?: string,"required_network_proof_count"?: number,"required_verified_count"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_replication_policies_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_federation_exchange_attestatio": {
                  Row: {
                    "attestation_metadata": NonNullable<Json>,"attestation_notes": string | null,"attestation_verdict": string,"attested_at": string,"attested_by": string,"batch_id": string,"exchange_channel": string,"id": string,"operator_identity_uri": string | null,"operator_jurisdiction_country_code": string | null,"operator_label": string,"operator_trust_domain": string,"package_hash": string,"package_id": string,"receipt_payload": Json | null,"receipt_signature": string | null,"receipt_signature_algorithm": string | null,"receipt_signer_key": string | null,"receipt_verification_notes": string | null,"receipt_verified": boolean | null,"receipt_verified_at": string | null,"receipt_verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attestation_metadata"?: NonNullable<Json>,"attestation_notes"?: string | null,"attestation_verdict"?: string,"attested_at"?: string,"attested_by": string,"batch_id": string,"exchange_channel"?: string,"id"?: string,"operator_identity_uri"?: string | null,"operator_jurisdiction_country_code"?: string | null,"operator_label": string,"operator_trust_domain"?: string,"package_hash": string,"package_id": string,"receipt_payload"?: Json | null,"receipt_signature"?: string | null,"receipt_signature_algorithm"?: string | null,"receipt_signer_key"?: string | null,"receipt_verification_notes"?: string | null,"receipt_verified"?: boolean | null,"receipt_verified_at"?: string | null,"receipt_verified_by"?: string | null
                  }
                  Update: {
                    "attestation_metadata"?: NonNullable<Json>,"attestation_notes"?: string | null,"attestation_verdict"?: string,"attested_at"?: string,"attested_by"?: string,"batch_id"?: string,"exchange_channel"?: string,"id"?: string,"operator_identity_uri"?: string | null,"operator_jurisdiction_country_code"?: string | null,"operator_label"?: string,"operator_trust_domain"?: string,"package_hash"?: string,"package_id"?: string,"receipt_payload"?: Json | null,"receipt_signature"?: string | null,"receipt_signature_algorithm"?: string | null,"receipt_signer_key"?: string | null,"receipt_verification_notes"?: string | null,"receipt_verified"?: boolean | null,"receipt_verified_at"?: string | null,"receipt_verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_feder_receipt_verified_by_fkey"
      columns: ["receipt_verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_federation_ex_attested_by_fkey"
      columns: ["attested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_federation_exc_package_id_fkey"
      columns: ["package_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_federation_packages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_federation_excha_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_federation_package_signatures": {
                  Row: {
                    "batch_id": string,"created_at": string,"created_by": string | null,"distribution_channel": string,"id": string,"metadata": NonNullable<Json>,"package_id": string,"package_scope": string,"signature": string,"signature_algorithm": string,"signed_at": string,"signer_identity_uri": string | null,"signer_jurisdiction_country_code": string | null,"signer_key": string,"signer_trust_domain": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"created_at"?: string,"created_by"?: string | null,"distribution_channel"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"package_id": string,"package_scope": string,"signature": string,"signature_algorithm": string,"signed_at"?: string,"signer_identity_uri"?: string | null,"signer_jurisdiction_country_code"?: string | null,"signer_key": string,"signer_trust_domain"?: string,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string,"created_at"?: string,"created_by"?: string | null,"distribution_channel"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"package_id"?: string,"package_scope"?: string,"signature"?: string,"signature_algorithm"?: string,"signed_at"?: string,"signer_identity_uri"?: string | null,"signer_jurisdiction_country_code"?: string | null,"signer_key"?: string,"signer_trust_domain"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_federation_pac_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_federation_pac_package_id_fkey"
      columns: ["package_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_federation_packages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_federation_pack_batch_id_fkey1"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_federation_packages": {
                  Row: {
                    "batch_id": string,"captured_at": string,"captured_by": string | null,"created_at": string,"id": string,"metadata": NonNullable<Json>,"package_hash": string,"package_payload": NonNullable<Json>,"package_scope": string,"package_version": string,"source_directory_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id": string,"captured_at"?: string,"captured_by"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"package_hash": string,"package_payload"?: NonNullable<Json>,"package_scope": string,"package_version": string,"source_directory_id": string,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string,"captured_at"?: string,"captured_by"?: string | null,"created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"package_hash"?: string,"package_payload"?: NonNullable<Json>,"package_scope"?: string,"package_version"?: string,"source_directory_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_feder_source_directory_id_fkey"
      columns: ["source_directory_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_directories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_federation_pa_captured_by_fkey"
      columns: ["captured_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_federation_packa_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_jobs": {
                  Row: {
                    "attempt_count": number,"batch_id": string,"claim_expires_at": string | null,"claimed_at": string | null,"claimed_by": string | null,"completed_at": string | null,"created_at": string,"error_message": string | null,"id": string,"max_attempts": number,"metadata": NonNullable<Json>,"next_attempt_at": string,"result_reference": string | null,"scheduled_at": string,"scheduled_by": string | null,"started_at": string | null,"status": Database["public"]['Enums']["governance_public_audit_verifier_job_status"],"updated_at": string,"verifier_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_count"?: number,"batch_id": string,"claim_expires_at"?: string | null,"claimed_at"?: string | null,"claimed_by"?: string | null,"completed_at"?: string | null,"created_at"?: string,"error_message"?: string | null,"id"?: string,"max_attempts"?: number,"metadata"?: NonNullable<Json>,"next_attempt_at"?: string,"result_reference"?: string | null,"scheduled_at"?: string,"scheduled_by"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["governance_public_audit_verifier_job_status"],"updated_at"?: string,"verifier_id": string
                  }
                  Update: {
                    "attempt_count"?: number,"batch_id"?: string,"claim_expires_at"?: string | null,"claimed_at"?: string | null,"claimed_by"?: string | null,"completed_at"?: string | null,"created_at"?: string,"error_message"?: string | null,"id"?: string,"max_attempts"?: number,"metadata"?: NonNullable<Json>,"next_attempt_at"?: string,"result_reference"?: string | null,"scheduled_at"?: string,"scheduled_by"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["governance_public_audit_verifier_job_status"],"updated_at"?: string,"verifier_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_jobs_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_jobs_scheduled_by_fkey"
      columns: ["scheduled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_jobs_verifier_id_fkey"
      columns: ["verifier_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_nodes"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_checks": {
                  Row: {
                    "batch_id": string | null,"check_payload": NonNullable<Json>,"check_status": string,"checked_at": string,"checked_by": string | null,"created_at": string,"error_message": string | null,"id": string,"latency_ms": number | null,"mirror_id": string,"observed_batch_hash": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id"?: string | null,"check_payload"?: NonNullable<Json>,"check_status": string,"checked_at"?: string,"checked_by"?: string | null,"created_at"?: string,"error_message"?: string | null,"id"?: string,"latency_ms"?: number | null,"mirror_id": string,"observed_batch_hash"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string | null,"check_payload"?: NonNullable<Json>,"check_status"?: string,"checked_at"?: string,"checked_by"?: string | null,"created_at"?: string,"error_message"?: string | null,"id"?: string,"latency_ms"?: number | null,"mirror_id"?: string,"observed_batch_hash"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_checks_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_checks_checked_by_fkey"
      columns: ["checked_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_checks_mirror_id_fkey"
      columns: ["mirror_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirrors"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_directories": {
                  Row: {
                    "batch_id": string | null,"created_at": string,"directory_hash": string,"directory_payload": NonNullable<Json>,"directory_version": string,"id": string,"metadata": NonNullable<Json>,"published_at": string,"published_by": string | null,"signature": string,"signature_algorithm": string,"signer_id": string,"signer_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "batch_id"?: string | null,"created_at"?: string,"directory_hash": string,"directory_payload"?: NonNullable<Json>,"directory_version"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"published_at"?: string,"published_by"?: string | null,"signature": string,"signature_algorithm"?: string,"signer_id": string,"signer_key": string,"updated_at"?: string
                  }
                  Update: {
                    "batch_id"?: string | null,"created_at"?: string,"directory_hash"?: string,"directory_payload"?: NonNullable<Json>,"directory_version"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"published_at"?: string,"published_by"?: string | null,"signature"?: string,"signature_algorithm"?: string,"signer_id"?: string,"signer_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_direc_published_by_fkey"
      columns: ["published_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_director_signer_id_fkey"
      columns: ["signer_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_directory_signers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_directori_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_directory_attestations": {
                  Row: {
                    "attestation_decision": string,"attestation_payload": NonNullable<Json>,"attestation_signature": string,"attested_at": string,"attested_by": string | null,"created_at": string,"directory_id": string,"id": string,"signer_id": string,"signer_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attestation_decision": string,"attestation_payload"?: NonNullable<Json>,"attestation_signature": string,"attested_at"?: string,"attested_by"?: string | null,"created_at"?: string,"directory_id": string,"id"?: string,"signer_id": string,"signer_key": string,"updated_at"?: string
                  }
                  Update: {
                    "attestation_decision"?: string,"attestation_payload"?: NonNullable<Json>,"attestation_signature"?: string,"attested_at"?: string,"attested_by"?: string | null,"created_at"?: string,"directory_id"?: string,"id"?: string,"signer_id"?: string,"signer_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_direc_directory_id_fkey"
      columns: ["directory_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_directories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_direct_attested_by_fkey"
      columns: ["attested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_directo_signer_id_fkey1"
      columns: ["signer_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_directory_signers"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_directory_signers": {
                  Row: {
                    "added_by": string | null,"created_at": string,"governance_last_reviewed_at": string | null,"governance_status": string,"id": string,"is_active": boolean,"metadata": NonNullable<Json>,"public_key": string,"signer_key": string,"signer_label": string | null,"signing_algorithm": string,"trust_tier": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"governance_last_reviewed_at"?: string | null,"governance_status"?: string,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"public_key": string,"signer_key": string,"signer_label"?: string | null,"signing_algorithm"?: string,"trust_tier"?: string,"updated_at"?: string
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"governance_last_reviewed_at"?: string | null,"governance_status"?: string,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"public_key"?: string,"signer_key"?: string,"signer_label"?: string | null,"signing_algorithm"?: string,"trust_tier"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_directory_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_discovered_candidates": {
                  Row: {
                    "candidate_key": string,"candidate_label": string | null,"candidate_status": string,"created_at": string,"discovery_confidence": number,"discovery_run_id": string | null,"endpoint_url": string,"first_seen_at": string,"id": string,"jurisdiction_country_code": string,"last_seen_at": string,"metadata": NonNullable<Json>,"mirror_type": string,"operator_label": string,"region_code": string,"source_id": string,"trust_domain": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_key": string,"candidate_label"?: string | null,"candidate_status"?: string,"created_at"?: string,"discovery_confidence"?: number,"discovery_run_id"?: string | null,"endpoint_url": string,"first_seen_at"?: string,"id"?: string,"jurisdiction_country_code"?: string,"last_seen_at"?: string,"metadata"?: NonNullable<Json>,"mirror_type"?: string,"operator_label"?: string,"region_code"?: string,"source_id": string,"trust_domain"?: string,"updated_at"?: string
                  }
                  Update: {
                    "candidate_key"?: string,"candidate_label"?: string | null,"candidate_status"?: string,"created_at"?: string,"discovery_confidence"?: number,"discovery_run_id"?: string | null,"endpoint_url"?: string,"first_seen_at"?: string,"id"?: string,"jurisdiction_country_code"?: string,"last_seen_at"?: string,"metadata"?: NonNullable<Json>,"mirror_type"?: string,"operator_label"?: string,"region_code"?: string,"source_id"?: string,"trust_domain"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_d_discovery_run_id_fkey"
      columns: ["discovery_run_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_discovery_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_discove_source_id_fkey1"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_discovery_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_discovery_runs": {
                  Row: {
                    "accepted_candidate_count": number,"batch_id": string | null,"created_at": string,"created_by": string | null,"discovered_count": number,"error_message": string | null,"id": string,"observed_at": string,"run_payload": NonNullable<Json>,"run_status": string,"source_id": string,"stale_candidate_count": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_candidate_count"?: number,"batch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"discovered_count"?: number,"error_message"?: string | null,"id"?: string,"observed_at"?: string,"run_payload"?: NonNullable<Json>,"run_status": string,"source_id": string,"stale_candidate_count"?: number,"updated_at"?: string
                  }
                  Update: {
                    "accepted_candidate_count"?: number,"batch_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"discovered_count"?: number,"error_message"?: string | null,"id"?: string,"observed_at"?: string,"run_payload"?: NonNullable<Json>,"run_status"?: string,"source_id"?: string,"stale_candidate_count"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_discove_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_discover_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_discovery_sources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_discovery_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_discovery_sources": {
                  Row: {
                    "added_by": string | null,"created_at": string,"discovery_scope": string,"endpoint_url": string,"id": string,"is_active": boolean,"metadata": NonNullable<Json>,"source_key": string,"source_label": string | null,"trust_tier": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"discovery_scope"?: string,"endpoint_url": string,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"source_key": string,"source_label"?: string | null,"trust_tier"?: string,"updated_at"?: string
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"discovery_scope"?: string,"endpoint_url"?: string,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"source_key"?: string,"source_label"?: string | null,"trust_tier"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_discovery_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_failover_policies": {
                  Row: {
                    "cooldown_minutes": number,"created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"max_failures_before_cooldown": number,"max_mirror_candidates": number,"max_mirror_latency_ms": number,"max_open_critical_federation_alerts": number,"metadata": NonNullable<Json>,"min_healthy_mirrors": number,"min_independent_directory_signers": number,"min_onboarded_federation_operators": number,"min_policy_ratification_approvals": number,"min_signer_governance_independent_approvals": number,"mirror_selection_strategy": string,"policy_key": string,"policy_name": string,"prefer_same_region": boolean,"require_federation_ops_readiness": boolean,"require_policy_ratification": boolean,"require_signer_governance_approval": boolean,"required_distinct_operators": number,"required_distinct_regions": number,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cooldown_minutes"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"max_failures_before_cooldown"?: number,"max_mirror_candidates"?: number,"max_mirror_latency_ms"?: number,"max_open_critical_federation_alerts"?: number,"metadata"?: NonNullable<Json>,"min_healthy_mirrors"?: number,"min_independent_directory_signers"?: number,"min_onboarded_federation_operators"?: number,"min_policy_ratification_approvals"?: number,"min_signer_governance_independent_approvals"?: number,"mirror_selection_strategy"?: string,"policy_key": string,"policy_name": string,"prefer_same_region"?: boolean,"require_federation_ops_readiness"?: boolean,"require_policy_ratification"?: boolean,"require_signer_governance_approval"?: boolean,"required_distinct_operators"?: number,"required_distinct_regions"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "cooldown_minutes"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"max_failures_before_cooldown"?: number,"max_mirror_candidates"?: number,"max_mirror_latency_ms"?: number,"max_open_critical_federation_alerts"?: number,"metadata"?: NonNullable<Json>,"min_healthy_mirrors"?: number,"min_independent_directory_signers"?: number,"min_onboarded_federation_operators"?: number,"min_policy_ratification_approvals"?: number,"min_signer_governance_independent_approvals"?: number,"mirror_selection_strategy"?: string,"policy_key"?: string,"policy_name"?: string,"prefer_same_region"?: boolean,"require_federation_ops_readiness"?: boolean,"require_policy_ratification"?: boolean,"require_signer_governance_approval"?: boolean,"required_distinct_operators"?: number,"required_distinct_regions"?: number,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_failove_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_failove_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_federation_alerts": {
                  Row: {
                    "acknowledged_at": string | null,"alert_key": string,"alert_message": string,"alert_scope": string,"alert_status": string,"created_at": string,"created_by": string | null,"id": string,"metadata": NonNullable<Json>,"opened_at": string,"resolved_at": string | null,"resolved_by": string | null,"severity": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged_at"?: string | null,"alert_key": string,"alert_message": string,"alert_scope": string,"alert_status"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opened_at"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"severity": string,"updated_at"?: string
                  }
                  Update: {
                    "acknowledged_at"?: string | null,"alert_key"?: string,"alert_message"?: string,"alert_scope"?: string,"alert_status"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opened_at"?: string,"resolved_at"?: string | null,"resolved_by"?: string | null,"severity"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_federa_created_by_fkey2"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_federa_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_federation_onboarding_r": {
                  Row: {
                    "created_at": string,"id": string,"metadata": NonNullable<Json>,"onboarded_mirror_id": string | null,"operator_id": string,"operator_key": string,"request_status": string,"requested_by": string | null,"requested_endpoint_url": string,"requested_jurisdiction_country_code": string,"requested_mirror_key": string,"requested_mirror_label": string | null,"requested_mirror_type": string,"requested_region_code": string,"requested_trust_domain": string,"review_notes": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"onboarded_mirror_id"?: string | null,"operator_id": string,"operator_key": string,"request_status"?: string,"requested_by"?: string | null,"requested_endpoint_url": string,"requested_jurisdiction_country_code"?: string,"requested_mirror_key": string,"requested_mirror_label"?: string | null,"requested_mirror_type"?: string,"requested_region_code"?: string,"requested_trust_domain"?: string,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"onboarded_mirror_id"?: string | null,"operator_id"?: string,"operator_key"?: string,"request_status"?: string,"requested_by"?: string | null,"requested_endpoint_url"?: string,"requested_jurisdiction_country_code"?: string,"requested_mirror_key"?: string,"requested_mirror_label"?: string | null,"requested_mirror_type"?: string,"requested_region_code"?: string,"requested_trust_domain"?: string,"review_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirro_onboarded_mirror_id_fkey"
      columns: ["onboarded_mirror_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirrors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_feder_requested_by_fkey"
      columns: ["requested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_federa_operator_id_fkey"
      columns: ["operator_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_federation_operators"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_federa_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_federation_operators": {
                  Row: {
                    "contact_endpoint": string | null,"created_at": string,"created_by": string | null,"id": string,"jurisdiction_country_code": string,"metadata": NonNullable<Json>,"onboarding_status": string,"operator_key": string,"operator_label": string | null,"trust_domain": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_endpoint"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"jurisdiction_country_code"?: string,"metadata"?: NonNullable<Json>,"onboarding_status"?: string,"operator_key": string,"operator_label"?: string | null,"trust_domain"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "contact_endpoint"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"jurisdiction_country_code"?: string,"metadata"?: NonNullable<Json>,"onboarding_status"?: string,"operator_key"?: string,"operator_label"?: string | null,"trust_domain"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_federat_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_federat_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_federation_worker_runs": {
                  Row: {
                    "approved_request_count": number,"created_at": string,"created_by": string | null,"discovered_request_count": number,"error_message": string | null,"id": string,"observed_at": string,"onboarded_request_count": number,"open_alert_count": number,"run_payload": NonNullable<Json>,"run_scope": string,"run_status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_request_count"?: number,"created_at"?: string,"created_by"?: string | null,"discovered_request_count"?: number,"error_message"?: string | null,"id"?: string,"observed_at"?: string,"onboarded_request_count"?: number,"open_alert_count"?: number,"run_payload"?: NonNullable<Json>,"run_scope": string,"run_status": string,"updated_at"?: string
                  }
                  Update: {
                    "approved_request_count"?: number,"created_at"?: string,"created_by"?: string | null,"discovered_request_count"?: number,"error_message"?: string | null,"id"?: string,"observed_at"?: string,"onboarded_request_count"?: number,"open_alert_count"?: number,"run_payload"?: NonNullable<Json>,"run_scope"?: string,"run_status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_federa_created_by_fkey1"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_policy_ratifications": {
                  Row: {
                    "created_at": string,"id": string,"policy_hash": string,"policy_key": string,"ratification_decision": string,"ratification_payload": NonNullable<Json>,"ratification_signature": string,"ratified_at": string,"ratified_by": string | null,"signer_id": string,"signer_key": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"policy_hash": string,"policy_key": string,"ratification_decision": string,"ratification_payload"?: NonNullable<Json>,"ratification_signature": string,"ratified_at"?: string,"ratified_by"?: string | null,"signer_id": string,"signer_key": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"policy_hash"?: string,"policy_key"?: string,"ratification_decision"?: string,"ratification_payload"?: NonNullable<Json>,"ratification_signature"?: string,"ratified_at"?: string,"ratified_by"?: string | null,"signer_id"?: string,"signer_key"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_policy_r_signer_id_fkey"
      columns: ["signer_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_directory_signers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_policy_ratified_by_fkey"
      columns: ["ratified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_probe_jobs": {
                  Row: {
                    "attempt_count": number,"batch_id": string | null,"completed_at": string | null,"completed_by": string | null,"created_at": string,"created_by": string | null,"error_message": string | null,"id": string,"max_attempts": number,"metadata": NonNullable<Json>,"mirror_id": string,"observed_batch_hash": string | null,"observed_check_status": string | null,"observed_latency_ms": number | null,"probe_timeout_ms": number,"scheduled_at": string,"started_at": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_count"?: number,"batch_id"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"error_message"?: string | null,"id"?: string,"max_attempts"?: number,"metadata"?: NonNullable<Json>,"mirror_id": string,"observed_batch_hash"?: string | null,"observed_check_status"?: string | null,"observed_latency_ms"?: number | null,"probe_timeout_ms"?: number,"scheduled_at"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "attempt_count"?: number,"batch_id"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"error_message"?: string | null,"id"?: string,"max_attempts"?: number,"metadata"?: NonNullable<Json>,"mirror_id"?: string,"observed_batch_hash"?: string | null,"observed_check_status"?: string | null,"observed_latency_ms"?: number | null,"probe_timeout_ms"?: number,"scheduled_at"?: string,"started_at"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_probe_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_probe_j_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_probe_jo_mirror_id_fkey"
      columns: ["mirror_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirrors"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_probe_job_batch_id_fkey"
      columns: ["batch_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_batches"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirror_signer_governance_attes": {
                  Row: {
                    "attestation_decision": string,"attestation_payload": NonNullable<Json>,"attestation_signature": string,"attested_at": string,"attested_by": string | null,"attestor_signer_id": string,"attestor_signer_key": string,"created_at": string,"id": string,"target_signer_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attestation_decision": string,"attestation_payload"?: NonNullable<Json>,"attestation_signature": string,"attested_at"?: string,"attested_by"?: string | null,"attestor_signer_id": string,"attestor_signer_key": string,"created_at"?: string,"id"?: string,"target_signer_id": string,"updated_at"?: string
                  }
                  Update: {
                    "attestation_decision"?: string,"attestation_payload"?: NonNullable<Json>,"attestation_signature"?: string,"attested_at"?: string,"attested_by"?: string | null,"attestor_signer_id"?: string,"attestor_signer_key"?: string,"created_at"?: string,"id"?: string,"target_signer_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirror_attestor_signer_id_fkey"
      columns: ["attestor_signer_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_directory_signers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_s_target_signer_id_fkey"
      columns: ["target_signer_id"]
isOneToOne: false
      referencedRelation: "governance_public_audit_verifier_mirror_directory_signers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_public_audit_verifier_mirror_signer_attested_by_fkey"
      columns: ["attested_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_mirrors": {
                  Row: {
                    "added_by": string | null,"created_at": string,"endpoint_url": string,"id": string,"is_active": boolean,"jurisdiction_country_code": string,"metadata": NonNullable<Json>,"mirror_key": string,"mirror_label": string | null,"mirror_type": string,"operator_label": string,"region_code": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"endpoint_url": string,"id"?: string,"is_active"?: boolean,"jurisdiction_country_code"?: string,"metadata"?: NonNullable<Json>,"mirror_key": string,"mirror_label"?: string | null,"mirror_type"?: string,"operator_label"?: string,"region_code"?: string,"updated_at"?: string
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"endpoint_url"?: string,"id"?: string,"is_active"?: boolean,"jurisdiction_country_code"?: string,"metadata"?: NonNullable<Json>,"mirror_key"?: string,"mirror_label"?: string | null,"mirror_type"?: string,"operator_label"?: string,"region_code"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_mirrors_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_public_audit_verifier_nodes": {
                  Row: {
                    "added_by": string | null,"created_at": string,"endpoint_url": string | null,"id": string,"is_active": boolean,"key_algorithm": string,"metadata": NonNullable<Json>,"updated_at": string,"verifier_key": string,"verifier_label": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"endpoint_url"?: string | null,"id"?: string,"is_active"?: boolean,"key_algorithm"?: string,"metadata"?: NonNullable<Json>,"updated_at"?: string,"verifier_key": string,"verifier_label"?: string | null
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"endpoint_url"?: string | null,"id"?: string,"is_active"?: boolean,"key_algorithm"?: string,"metadata"?: NonNullable<Json>,"updated_at"?: string,"verifier_key"?: string,"verifier_label"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_public_audit_verifier_nodes_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_sanction_appeals": {
                  Row: {
                    "appeal_reason": string,"created_at": string,"evidence_notes": string | null,"id": string,"metadata": NonNullable<Json>,"opened_at": string,"profile_id": string,"resolution_notes": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"sanction_id": string,"status": Database["public"]['Enums']["governance_sanction_appeal_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appeal_reason"?: string,"created_at"?: string,"evidence_notes"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opened_at"?: string,"profile_id": string,"resolution_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"sanction_id": string,"status"?: Database["public"]['Enums']["governance_sanction_appeal_status"],"updated_at"?: string
                  }
                  Update: {
                    "appeal_reason"?: string,"created_at"?: string,"evidence_notes"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"opened_at"?: string,"profile_id"?: string,"resolution_notes"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"sanction_id"?: string,"status"?: Database["public"]['Enums']["governance_sanction_appeal_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_sanction_appeals_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_sanction_appeals_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_sanction_appeals_sanction_id_fkey"
      columns: ["sanction_id"]
isOneToOne: false
      referencedRelation: "governance_sanctions"
      referencedColumns: ["id"]
    }
                  ]
                },"governance_sanctions": {
                  Row: {
                    "blocks_execution": boolean,"blocks_governance_all": boolean,"blocks_proposal_creation": boolean,"blocks_verification_review": boolean,"blocks_voting": boolean,"created_at": string,"ends_at": string | null,"id": string,"is_active": boolean,"issued_by": string | null,"lifted_at": string | null,"lifted_by": string | null,"metadata": NonNullable<Json>,"notes": string | null,"profile_id": string,"reason": string,"starts_at": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocks_execution"?: boolean,"blocks_governance_all"?: boolean,"blocks_proposal_creation"?: boolean,"blocks_verification_review"?: boolean,"blocks_voting"?: boolean,"created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"issued_by"?: string | null,"lifted_at"?: string | null,"lifted_by"?: string | null,"metadata"?: NonNullable<Json>,"notes"?: string | null,"profile_id": string,"reason"?: string,"starts_at"?: string,"updated_at"?: string
                  }
                  Update: {
                    "blocks_execution"?: boolean,"blocks_governance_all"?: boolean,"blocks_proposal_creation"?: boolean,"blocks_verification_review"?: boolean,"blocks_voting"?: boolean,"created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_active"?: boolean,"issued_by"?: string | null,"lifted_at"?: string | null,"lifted_by"?: string | null,"metadata"?: NonNullable<Json>,"notes"?: string | null,"profile_id"?: string,"reason"?: string,"starts_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "governance_sanctions_issued_by_fkey"
      columns: ["issued_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_sanctions_lifted_by_fkey"
      columns: ["lifted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "governance_sanctions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gpav_fed_exchange_receipt_automation_runs": {
                  Row: {
                    "created_at": string,"critical_backlog": boolean,"id": string,"metadata": NonNullable<Json>,"open_or_ack_page_count": number,"receipt_pending_count": number,"requested_lookback_hours": number | null,"run_finished_at": string | null,"run_message": string | null,"run_started_at": string,"run_status": string,"stale_receipt_count": number,"trigger_source": string,"triggered_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"critical_backlog"?: boolean,"id"?: string,"metadata"?: NonNullable<Json>,"open_or_ack_page_count"?: number,"receipt_pending_count"?: number,"requested_lookback_hours"?: number | null,"run_finished_at"?: string | null,"run_message"?: string | null,"run_started_at"?: string,"run_status": string,"stale_receipt_count"?: number,"trigger_source": string,"triggered_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"critical_backlog"?: boolean,"id"?: string,"metadata"?: NonNullable<Json>,"open_or_ack_page_count"?: number,"receipt_pending_count"?: number,"requested_lookback_hours"?: number | null,"run_finished_at"?: string | null,"run_message"?: string | null,"run_started_at"?: string,"run_status"?: string,"stale_receipt_count"?: number,"trigger_source"?: string,"triggered_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gpav_fed_exchange_receipt_automation_runs_triggered_by_fkey"
      columns: ["triggered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gpav_fed_exchange_receipt_policies": {
                  Row: {
                    "created_at": string,"critical_pending_threshold": number,"critical_stale_receipt_count_threshold": number,"escalation_enabled": boolean,"id": string,"lookback_hours": number,"metadata": NonNullable<Json>,"oncall_channel": string,"policy_key": string,"policy_name": string,"receipt_max_verification_age_hours": number,"updated_at": string,"updated_by": string | null,"warning_pending_threshold": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"critical_pending_threshold"?: number,"critical_stale_receipt_count_threshold"?: number,"escalation_enabled"?: boolean,"id"?: string,"lookback_hours"?: number,"metadata"?: NonNullable<Json>,"oncall_channel"?: string,"policy_key": string,"policy_name": string,"receipt_max_verification_age_hours"?: number,"updated_at"?: string,"updated_by"?: string | null,"warning_pending_threshold"?: number
                  }
                  Update: {
                    "created_at"?: string,"critical_pending_threshold"?: number,"critical_stale_receipt_count_threshold"?: number,"escalation_enabled"?: boolean,"id"?: string,"lookback_hours"?: number,"metadata"?: NonNullable<Json>,"oncall_channel"?: string,"policy_key"?: string,"policy_name"?: string,"receipt_max_verification_age_hours"?: number,"updated_at"?: string,"updated_by"?: string | null,"warning_pending_threshold"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "gpav_fed_exchange_receipt_policies_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"gpav_fed_exchange_receipt_policy_events": {
                  Row: {
                    "actor_profile_id": string | null,"created_at": string,"event_message": string,"event_type": string,"id": string,"metadata": NonNullable<Json>,"policy_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"event_message": string,"event_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"policy_key": string
                  }
                  Update: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"event_message"?: string,"event_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"policy_key"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gpav_fed_exchange_receipt_policy_events_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_action_outcomes": {
                  Row: {
                    "action_id": string,"comment": string | null,"created_at": string,"helped": string,"id": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id": string,"comment"?: string | null,"created_at"?: string,"helped": string,"id"?: string,"profile_id": string
                  }
                  Update: {
                    "action_id"?: string,"comment"?: string | null,"created_at"?: string,"helped"?: string,"id"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_action_outcomes_action_id_fkey"
      columns: ["action_id"]
isOneToOne: false
      referencedRelation: "happiness_actions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "happiness_action_outcomes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_actions": {
                  Row: {
                    "created_at": string,"dismissed": boolean,"domain": string,"follow_up_at": string | null,"id": string,"intervention_key": string | null,"kind": string,"library_version": string | null,"member_note": string | null,"not_relevant": boolean,"plan_id": string | null,"profile_id": string,"recommendation_model": string | null,"related_path": string | null,"selection_id": string | null,"status": string,"target_date": string | null,"title": string,"why": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dismissed"?: boolean,"domain": string,"follow_up_at"?: string | null,"id"?: string,"intervention_key"?: string | null,"kind": string,"library_version"?: string | null,"member_note"?: string | null,"not_relevant"?: boolean,"plan_id"?: string | null,"profile_id": string,"recommendation_model"?: string | null,"related_path"?: string | null,"selection_id"?: string | null,"status"?: string,"target_date"?: string | null,"title": string,"why": string
                  }
                  Update: {
                    "created_at"?: string,"dismissed"?: boolean,"domain"?: string,"follow_up_at"?: string | null,"id"?: string,"intervention_key"?: string | null,"kind"?: string,"library_version"?: string | null,"member_note"?: string | null,"not_relevant"?: boolean,"plan_id"?: string | null,"profile_id"?: string,"recommendation_model"?: string | null,"related_path"?: string | null,"selection_id"?: string | null,"status"?: string,"target_date"?: string | null,"title"?: string,"why"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_actions_plan_fk"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "fulfillment_plans"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "happiness_actions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "happiness_actions_selection_id_fkey"
      columns: ["selection_id"]
isOneToOne: false
      referencedRelation: "happiness_improvement_selections"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_assessment_instruments": {
                  Row: {
                    "allowed_use": string,"created_at": string,"id": string,"instrument_references": Json | null,"interpretation_rules": NonNullable<Json>,"language": string,"license": string | null,"name": string,"publisher": string | null,"questions": NonNullable<Json>,"scoring_logic": NonNullable<Json>,"slug": string,"source_url": string | null,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allowed_use"?: string,"created_at"?: string,"id"?: string,"instrument_references"?: Json | null,"interpretation_rules"?: NonNullable<Json>,"language"?: string,"license"?: string | null,"name": string,"publisher"?: string | null,"questions"?: NonNullable<Json>,"scoring_logic"?: NonNullable<Json>,"slug": string,"source_url"?: string | null,"version": string
                  }
                  Update: {
                    "allowed_use"?: string,"created_at"?: string,"id"?: string,"instrument_references"?: Json | null,"interpretation_rules"?: NonNullable<Json>,"language"?: string,"license"?: string | null,"name"?: string,"publisher"?: string | null,"questions"?: NonNullable<Json>,"scoring_logic"?: NonNullable<Json>,"slug"?: string,"source_url"?: string | null,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"happiness_assessment_responses": {
                  Row: {
                    "answers": NonNullable<Json>,"created_at": string,"id": string,"instrument_id": string,"internal_score": Json | null,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"instrument_id": string,"internal_score"?: Json | null,"profile_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"instrument_id"?: string,"internal_score"?: Json | null,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_assessment_responses_instrument_id_fkey"
      columns: ["instrument_id"]
isOneToOne: false
      referencedRelation: "happiness_assessment_instruments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "happiness_assessment_responses_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_causes": {
                  Row: {
                    "category": string,"cause_group": string,"confirmed": boolean,"created_at": string,"domain": string | null,"id": string,"is_ai_suggestion": boolean,"note": string | null,"polarity": string,"profile_id": string,"source_id": string | null,"source_kind": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"cause_group": string,"confirmed"?: boolean,"created_at"?: string,"domain"?: string | null,"id"?: string,"is_ai_suggestion"?: boolean,"note"?: string | null,"polarity"?: string,"profile_id": string,"source_id"?: string | null,"source_kind": string
                  }
                  Update: {
                    "category"?: string,"cause_group"?: string,"confirmed"?: boolean,"created_at"?: string,"domain"?: string | null,"id"?: string,"is_ai_suggestion"?: boolean,"note"?: string | null,"polarity"?: string,"profile_id"?: string,"source_id"?: string | null,"source_kind"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_causes_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_checkins": {
                  Row: {
                    "affecting_most": string | null,"areas": NonNullable<Json>,"created_at": string,"feeling": string,"id": string,"note": string | null,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "affecting_most"?: string | null,"areas"?: NonNullable<Json>,"created_at"?: string,"feeling": string,"id"?: string,"note"?: string | null,"profile_id": string
                  }
                  Update: {
                    "affecting_most"?: string | null,"areas"?: NonNullable<Json>,"created_at"?: string,"feeling"?: string,"id"?: string,"note"?: string | null,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_checkins_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_improvement_selections": {
                  Row: {
                    "created_at": string,"domain": string,"id": string,"profile_id": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain": string,"id"?: string,"profile_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"domain"?: string,"id"?: string,"profile_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_improvement_selections_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_monthly_reviews": {
                  Row: {
                    "created_at": string,"domain_answers": NonNullable<Json>,"help_areas": (string)[],"id": string,"instrument_slug": string | null,"month_start": string,"profile_id": string,"updated_at": string,"wants_help": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain_answers"?: NonNullable<Json>,"help_areas"?: (string)[],"id"?: string,"instrument_slug"?: string | null,"month_start": string,"profile_id": string,"updated_at"?: string,"wants_help"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"domain_answers"?: NonNullable<Json>,"help_areas"?: (string)[],"id"?: string,"instrument_slug"?: string | null,"month_start"?: string,"profile_id"?: string,"updated_at"?: string,"wants_help"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_monthly_reviews_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_privacy_config": {
                  Row: {
                    "id": string,"min_cohort_size": number,"notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"min_cohort_size"?: number,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "id"?: string,"min_cohort_size"?: number,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"happiness_privacy_settings": {
                  Row: {
                    "checkins_enabled": boolean,"created_at": string,"optional_sharing_enabled": boolean,"profile_id": string,"recommendations_enabled": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "checkins_enabled"?: boolean,"created_at"?: string,"optional_sharing_enabled"?: boolean,"profile_id": string,"recommendations_enabled"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "checkins_enabled"?: boolean,"created_at"?: string,"optional_sharing_enabled"?: boolean,"profile_id"?: string,"recommendations_enabled"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_privacy_settings_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_state_snapshots": {
                  Row: {
                    "computed_at": string,"confidence": string,"domain_internal": NonNullable<Json>,"domain_levels": NonNullable<Json>,"high_priority_domains": (string)[],"id": string,"model_version": string,"overall_internal": number | null,"overall_level": string | null,"profile_id": string,"strongest_domains": (string)[],"trend": string
                  }
                  ComputedFields: never
                  Insert: {
                    "computed_at"?: string,"confidence"?: string,"domain_internal"?: NonNullable<Json>,"domain_levels"?: NonNullable<Json>,"high_priority_domains"?: (string)[],"id"?: string,"model_version"?: string,"overall_internal"?: number | null,"overall_level"?: string | null,"profile_id": string,"strongest_domains"?: (string)[],"trend"?: string
                  }
                  Update: {
                    "computed_at"?: string,"confidence"?: string,"domain_internal"?: NonNullable<Json>,"domain_levels"?: NonNullable<Json>,"high_priority_domains"?: (string)[],"id"?: string,"model_version"?: string,"overall_internal"?: number | null,"overall_level"?: string | null,"profile_id"?: string,"strongest_domains"?: (string)[],"trend"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_state_snapshots_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"happiness_weekly_pulses": {
                  Row: {
                    "created_at": string,"domain_answers": NonNullable<Json>,"id": string,"profile_id": string,"updated_at": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain_answers"?: NonNullable<Json>,"id"?: string,"profile_id": string,"updated_at"?: string,"week_start": string
                  }
                  Update: {
                    "created_at"?: string,"domain_answers"?: NonNullable<Json>,"id"?: string,"profile_id"?: string,"updated_at"?: string,"week_start"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "happiness_weekly_pulses_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"human_outcome_public_lessons": {
                  Row: {
                    "domain": string,"evidence_strength": string,"factor_category": string | null,"human_outcome": string,"id": string,"intervention": string,"intervention_category": string | null,"limitations": string,"operational_outcome": string,"problem": string,"published_at": string,"published_by": string,"replication_notes": string | null,"review_id": string,"solution_record_id": string | null,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "domain": string,"evidence_strength": string,"factor_category"?: string | null,"human_outcome": string,"id"?: string,"intervention": string,"intervention_category"?: string | null,"limitations": string,"operational_outcome": string,"problem": string,"published_at"?: string,"published_by": string,"replication_notes"?: string | null,"review_id": string,"solution_record_id"?: string | null,"status": string,"title": string
                  }
                  Update: {
                    "domain"?: string,"evidence_strength"?: string,"factor_category"?: string | null,"human_outcome"?: string,"id"?: string,"intervention"?: string,"intervention_category"?: string | null,"limitations"?: string,"operational_outcome"?: string,"problem"?: string,"published_at"?: string,"published_by"?: string,"replication_notes"?: string | null,"review_id"?: string,"solution_record_id"?: string | null,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "human_outcome_public_lessons_published_by_fkey"
      columns: ["published_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_public_lessons_review_id_fkey"
      columns: ["review_id"]
isOneToOne: true
      referencedRelation: "human_outcome_reviews"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_public_lessons_solution_record_id_fkey"
      columns: ["solution_record_id"]
isOneToOne: false
      referencedRelation: "solution_records"
      referencedColumns: ["id"]
    }
                  ]
                },"human_outcome_review_audit": {
                  Row: {
                    "action": string,"actor_profile_id": string,"created_at": string,"id": string,"review_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_profile_id": string,"created_at"?: string,"id"?: string,"review_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_profile_id"?: string,"created_at"?: string,"id"?: string,"review_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "human_outcome_review_audit_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_review_audit_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "human_outcome_reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"human_outcome_review_events": {
                  Row: {
                    "created_at": string,"created_by": string,"event_type": string,"id": string,"note": string | null,"occurred_at": string,"review_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"event_type": string,"id"?: string,"note"?: string | null,"occurred_at"?: string,"review_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"event_type"?: string,"id"?: string,"note"?: string | null,"occurred_at"?: string,"review_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "human_outcome_review_events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_review_events_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "human_outcome_reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"human_outcome_review_evidence": {
                  Row: {
                    "aggregate_snapshot_id": string,"created_at": string,"evidence_role": string,"id": string,"period_order": number,"review_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aggregate_snapshot_id": string,"created_at"?: string,"evidence_role": string,"id"?: string,"period_order"?: number,"review_id": string
                  }
                  Update: {
                    "aggregate_snapshot_id"?: string,"created_at"?: string,"evidence_role"?: string,"id"?: string,"period_order"?: number,"review_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "human_outcome_review_evidence_aggregate_snapshot_id_fkey"
      columns: ["aggregate_snapshot_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_snapshots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_review_evidence_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "human_outcome_reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"human_outcome_review_factors": {
                  Row: {
                    "created_at": string,"created_by": string,"factor_kind": string,"id": string,"note": string,"review_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"factor_kind": string,"id"?: string,"note": string,"review_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"factor_kind"?: string,"id"?: string,"note"?: string,"review_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "human_outcome_review_factors_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_review_factors_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "human_outcome_reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"human_outcome_reviews": {
                  Row: {
                    "challenge_id": string | null,"closed_at": string | null,"closed_reason": string | null,"comparison_model_version": string,"composition_caveat": boolean,"created_at": string,"created_by": string,"evaluation_planned": boolean,"evidence_model_version": string,"evidence_strength": string,"governance_solution_id": string | null,"id": string,"interpretation": string | null,"intervention_action_id": string | null,"intervention_started_at": string | null,"intervention_title": string,"next_review_window": string | null,"objective": string,"operational_outcome": string | null,"overlapping_interventions": boolean,"project_id": string | null,"published_public": boolean,"research_reference": string | null,"scope_id": string,"solution_record_id": string | null,"status": string,"systemic_issue_candidate_id": string | null,"target_domain": string,"target_factor": string | null,"uncertainty_note": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id"?: string | null,"closed_at"?: string | null,"closed_reason"?: string | null,"comparison_model_version"?: string,"composition_caveat"?: boolean,"created_at"?: string,"created_by": string,"evaluation_planned"?: boolean,"evidence_model_version"?: string,"evidence_strength"?: string,"governance_solution_id"?: string | null,"id"?: string,"interpretation"?: string | null,"intervention_action_id"?: string | null,"intervention_started_at"?: string | null,"intervention_title": string,"next_review_window"?: string | null,"objective": string,"operational_outcome"?: string | null,"overlapping_interventions"?: boolean,"project_id"?: string | null,"published_public"?: boolean,"research_reference"?: string | null,"scope_id": string,"solution_record_id"?: string | null,"status"?: string,"systemic_issue_candidate_id"?: string | null,"target_domain": string,"target_factor"?: string | null,"uncertainty_note"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "challenge_id"?: string | null,"closed_at"?: string | null,"closed_reason"?: string | null,"comparison_model_version"?: string,"composition_caveat"?: boolean,"created_at"?: string,"created_by"?: string,"evaluation_planned"?: boolean,"evidence_model_version"?: string,"evidence_strength"?: string,"governance_solution_id"?: string | null,"id"?: string,"interpretation"?: string | null,"intervention_action_id"?: string | null,"intervention_started_at"?: string | null,"intervention_title"?: string,"next_review_window"?: string | null,"objective"?: string,"operational_outcome"?: string | null,"overlapping_interventions"?: boolean,"project_id"?: string | null,"published_public"?: boolean,"research_reference"?: string | null,"scope_id"?: string,"solution_record_id"?: string | null,"status"?: string,"systemic_issue_candidate_id"?: string | null,"target_domain"?: string,"target_factor"?: string | null,"uncertainty_note"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "human_outcome_reviews_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "community_challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_reviews_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_reviews_governance_solution_id_fkey"
      columns: ["governance_solution_id"]
isOneToOne: false
      referencedRelation: "solution_problems"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_reviews_intervention_action_id_fkey"
      columns: ["intervention_action_id"]
isOneToOne: false
      referencedRelation: "wellbeing_insight_actions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_reviews_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "implementation_projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_reviews_scope_id_fkey"
      columns: ["scope_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_scopes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_reviews_solution_record_id_fkey"
      columns: ["solution_record_id"]
isOneToOne: false
      referencedRelation: "solution_records"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "human_outcome_reviews_systemic_issue_candidate_id_fkey"
      columns: ["systemic_issue_candidate_id"]
isOneToOne: false
      referencedRelation: "systemic_issue_candidates"
      referencedColumns: ["id"]
    }
                  ]
                },"identity_verification_artifacts": {
                  Row: {
                    "artifact_hash": string | null,"artifact_kind": Database["public"]['Enums']["identity_verification_artifact_kind"],"case_id": string,"created_at": string,"created_by": string | null,"id": string,"metadata": NonNullable<Json>,"storage_path": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "artifact_hash"?: string | null,"artifact_kind": Database["public"]['Enums']["identity_verification_artifact_kind"],"case_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"storage_path"?: string | null
                  }
                  Update: {
                    "artifact_hash"?: string | null,"artifact_kind"?: Database["public"]['Enums']["identity_verification_artifact_kind"],"case_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"storage_path"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "identity_verification_artifacts_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "identity_verification_cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "identity_verification_artifacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"identity_verification_cases": {
                  Row: {
                    "contact_info_completed": boolean,"created_at": string,"discrepancy_flags": (string)[],"id": string,"last_reviewed_by": string | null,"live_verification_completed": boolean,"metadata": NonNullable<Json>,"notes": string | null,"personal_info_completed": boolean,"profile_id": string,"resolved_at": string | null,"reviewed_at": string | null,"status": Database["public"]['Enums']["identity_verification_case_status"],"submitted_at": string | null,"updated_at": string,"verification_method": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_info_completed"?: boolean,"created_at"?: string,"discrepancy_flags"?: (string)[],"id"?: string,"last_reviewed_by"?: string | null,"live_verification_completed"?: boolean,"metadata"?: NonNullable<Json>,"notes"?: string | null,"personal_info_completed"?: boolean,"profile_id": string,"resolved_at"?: string | null,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["identity_verification_case_status"],"submitted_at"?: string | null,"updated_at"?: string,"verification_method"?: string
                  }
                  Update: {
                    "contact_info_completed"?: boolean,"created_at"?: string,"discrepancy_flags"?: (string)[],"id"?: string,"last_reviewed_by"?: string | null,"live_verification_completed"?: boolean,"metadata"?: NonNullable<Json>,"notes"?: string | null,"personal_info_completed"?: boolean,"profile_id"?: string,"resolved_at"?: string | null,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["identity_verification_case_status"],"submitted_at"?: string | null,"updated_at"?: string,"verification_method"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "identity_verification_cases_last_reviewed_by_fkey"
      columns: ["last_reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "identity_verification_cases_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"identity_verification_overrides": {
                  Row: {
                    "actor_profile_id": string | null,"created_at": string,"id": string,"profile_id": string,"reason": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"id"?: string,"profile_id": string,"reason": string,"verified": boolean
                  }
                  Update: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"id"?: string,"profile_id"?: string,"reason"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "identity_verification_overrides_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "identity_verification_overrides_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"identity_verification_providers": {
                  Row: {
                    "id": string,"provider_key": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"provider_key": string
                  }
                  Update: {
                    "id"?: string,"provider_key"?: string
                  }
                  Relationships: [
                    
                  ]
                },"identity_verification_reviews": {
                  Row: {
                    "case_id": string,"created_at": string,"decision": Database["public"]['Enums']["identity_verification_decision"],"id": string,"notes": string | null,"reviewer_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"created_at"?: string,"decision": Database["public"]['Enums']["identity_verification_decision"],"id"?: string,"notes"?: string | null,"reviewer_id"?: string | null
                  }
                  Update: {
                    "case_id"?: string,"created_at"?: string,"decision"?: Database["public"]['Enums']["identity_verification_decision"],"id"?: string,"notes"?: string | null,"reviewer_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "identity_verification_reviews_case_id_fkey"
      columns: ["case_id"]
isOneToOne: false
      referencedRelation: "identity_verification_cases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "identity_verification_reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"implementation_projects": {
                  Row: {
                    "challenge_id": string,"created_at": string,"id": string,"key_steps": string | null,"outcome_evidence": string | null,"proposal_id": string,"publisher_profile_id": string,"status": string,"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id": string,"created_at"?: string,"id"?: string,"key_steps"?: string | null,"outcome_evidence"?: string | null,"proposal_id": string,"publisher_profile_id": string,"status"?: string,"summary": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "challenge_id"?: string,"created_at"?: string,"id"?: string,"key_steps"?: string | null,"outcome_evidence"?: string | null,"proposal_id"?: string,"publisher_profile_id"?: string,"status"?: string,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "implementation_projects_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: true
      referencedRelation: "community_challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "implementation_projects_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "challenge_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "implementation_projects_publisher_profile_id_fkey"
      columns: ["publisher_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"investor_positions": {
                  Row: {
                    "capital_points": number,"created_at": string,"created_by": string | null,"funder_id": string,"funding_commitment_id": string,"id": string,"legal_instrument_id": string | null,"round_id": string | null,"verified_capital_usd": number
                  }
                  ComputedFields: never
                  Insert: {
                    "capital_points": number,"created_at"?: string,"created_by"?: string | null,"funder_id": string,"funding_commitment_id": string,"id"?: string,"legal_instrument_id"?: string | null,"round_id"?: string | null,"verified_capital_usd": number
                  }
                  Update: {
                    "capital_points"?: number,"created_at"?: string,"created_by"?: string | null,"funder_id"?: string,"funding_commitment_id"?: string,"id"?: string,"legal_instrument_id"?: string | null,"round_id"?: string | null,"verified_capital_usd"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "investor_positions_funder_id_fkey"
      columns: ["funder_id"]
isOneToOne: false
      referencedRelation: "funders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "investor_positions_funding_commitment_id_fkey"
      columns: ["funding_commitment_id"]
isOneToOne: true
      referencedRelation: "funding_commitments"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_gaps": {
                  Row: {
                    "challenge_id": string | null,"created_at": string,"description": string,"gap_kind": string,"id": string,"opportunity_id": string | null,"program_id": string,"proposed_by_profile_id": string | null,"publisher_profile_id": string,"resolution_notes": string | null,"result_resource_id": string | null,"result_solution_record_id": string | null,"space_id": string,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id"?: string | null,"created_at"?: string,"description": string,"gap_kind"?: string,"id"?: string,"opportunity_id"?: string | null,"program_id": string,"proposed_by_profile_id"?: string | null,"publisher_profile_id": string,"resolution_notes"?: string | null,"result_resource_id"?: string | null,"result_solution_record_id"?: string | null,"space_id": string,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "challenge_id"?: string | null,"created_at"?: string,"description"?: string,"gap_kind"?: string,"id"?: string,"opportunity_id"?: string | null,"program_id"?: string,"proposed_by_profile_id"?: string | null,"publisher_profile_id"?: string,"resolution_notes"?: string | null,"result_resource_id"?: string | null,"result_solution_record_id"?: string | null,"space_id"?: string,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_gaps_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "community_challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_gaps_opportunity_id_fkey"
      columns: ["opportunity_id"]
isOneToOne: false
      referencedRelation: "contribution_opportunities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_gaps_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "contribution_programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_gaps_proposed_by_profile_id_fkey"
      columns: ["proposed_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_gaps_publisher_profile_id_fkey"
      columns: ["publisher_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_gaps_result_resource_id_fkey"
      columns: ["result_resource_id"]
isOneToOne: false
      referencedRelation: "knowledge_resources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_gaps_result_solution_record_id_fkey"
      columns: ["result_solution_record_id"]
isOneToOne: false
      referencedRelation: "solution_records"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_gaps_space_id_fkey"
      columns: ["space_id"]
isOneToOne: false
      referencedRelation: "knowledge_spaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_resource_attributions": {
                  Row: {
                    "attribution_kind": string,"created_at": string,"id": string,"organization_name": string | null,"profile_id": string | null,"resource_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attribution_kind": string,"created_at"?: string,"id"?: string,"organization_name"?: string | null,"profile_id"?: string | null,"resource_id": string
                  }
                  Update: {
                    "attribution_kind"?: string,"created_at"?: string,"id"?: string,"organization_name"?: string | null,"profile_id"?: string | null,"resource_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_resource_attributions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_resource_attributions_resource_id_fkey"
      columns: ["resource_id"]
isOneToOne: false
      referencedRelation: "knowledge_resources"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_resources": {
                  Row: {
                    "body_text": string | null,"challenge_id": string | null,"created_at": string,"external_url": string | null,"id": string,"opportunity_id": string | null,"pathway_order": number | null,"program_id": string,"proposed_by_profile_id": string | null,"publisher_profile_id": string,"related_skills": (string)[],"resource_type": string,"reviewer_notes": string | null,"solution_record_id": string | null,"source_evidence": string | null,"space_id": string,"status": string,"summary": string,"title": string,"uncertainty_notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_text"?: string | null,"challenge_id"?: string | null,"created_at"?: string,"external_url"?: string | null,"id"?: string,"opportunity_id"?: string | null,"pathway_order"?: number | null,"program_id": string,"proposed_by_profile_id"?: string | null,"publisher_profile_id": string,"related_skills"?: (string)[],"resource_type"?: string,"reviewer_notes"?: string | null,"solution_record_id"?: string | null,"source_evidence"?: string | null,"space_id": string,"status"?: string,"summary": string,"title": string,"uncertainty_notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "body_text"?: string | null,"challenge_id"?: string | null,"created_at"?: string,"external_url"?: string | null,"id"?: string,"opportunity_id"?: string | null,"pathway_order"?: number | null,"program_id"?: string,"proposed_by_profile_id"?: string | null,"publisher_profile_id"?: string,"related_skills"?: (string)[],"resource_type"?: string,"reviewer_notes"?: string | null,"solution_record_id"?: string | null,"source_evidence"?: string | null,"space_id"?: string,"status"?: string,"summary"?: string,"title"?: string,"uncertainty_notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_resources_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: false
      referencedRelation: "community_challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_resources_opportunity_id_fkey"
      columns: ["opportunity_id"]
isOneToOne: false
      referencedRelation: "contribution_opportunities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_resources_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "contribution_programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_resources_proposed_by_profile_id_fkey"
      columns: ["proposed_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_resources_publisher_profile_id_fkey"
      columns: ["publisher_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_resources_solution_record_id_fkey"
      columns: ["solution_record_id"]
isOneToOne: false
      referencedRelation: "solution_records"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_resources_space_id_fkey"
      columns: ["space_id"]
isOneToOne: false
      referencedRelation: "knowledge_spaces"
      referencedColumns: ["id"]
    }
                  ]
                },"knowledge_spaces": {
                  Row: {
                    "area_node_id": string | null,"created_at": string,"description": string | null,"id": string,"is_demo": boolean,"program_id": string,"publisher_profile_id": string,"status": string,"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_node_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_demo"?: boolean,"program_id": string,"publisher_profile_id": string,"status"?: string,"summary": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "area_node_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_demo"?: boolean,"program_id"?: string,"publisher_profile_id"?: string,"status"?: string,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "knowledge_spaces_area_node_id_fkey"
      columns: ["area_node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_spaces_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "contribution_programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "knowledge_spaces_publisher_profile_id_fkey"
      columns: ["publisher_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"language_packs": {
                  Row: {
                    "base_version": string,"built_at": string,"language": string,"pack": NonNullable<Json>,"string_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "base_version": string,"built_at"?: string,"language": string,"pack": NonNullable<Json>,"string_count"?: number
                  }
                  Update: {
                    "base_version"?: string,"built_at"?: string,"language"?: string,"pack"?: NonNullable<Json>,"string_count"?: number
                  }
                  Relationships: [
                    
                  ]
                },"law_articles": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"label": string,"section_id": string,"slug": string,"sort_order": number,"summary": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"label": string,"section_id": string,"slug": string,"sort_order"?: number,"summary": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"label"?: string,"section_id"?: string,"slug"?: string,"sort_order"?: number,"summary"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "law_articles_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "law_sections"
      referencedColumns: ["id"]
    }
                  ]
                },"law_contributions": {
                  Row: {
                    "author_id": string,"contribution_type": Database["public"]['Enums']["law_contribution_type"],"created_at": string,"id": string,"note": string,"reviewed_at": string | null,"reviewer_id": string | null,"reviewer_notes": string | null,"source_id": string | null,"source_reference": string | null,"status": Database["public"]['Enums']["law_contribution_status"],"title": string,"track": Database["public"]['Enums']["law_track"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"contribution_type": Database["public"]['Enums']["law_contribution_type"],"created_at"?: string,"id"?: string,"note": string,"reviewed_at"?: string | null,"reviewer_id"?: string | null,"reviewer_notes"?: string | null,"source_id"?: string | null,"source_reference"?: string | null,"status"?: Database["public"]['Enums']["law_contribution_status"],"title": string,"track": Database["public"]['Enums']["law_track"],"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"contribution_type"?: Database["public"]['Enums']["law_contribution_type"],"created_at"?: string,"id"?: string,"note"?: string,"reviewed_at"?: string | null,"reviewer_id"?: string | null,"reviewer_notes"?: string | null,"source_id"?: string | null,"source_reference"?: string | null,"status"?: Database["public"]['Enums']["law_contribution_status"],"title"?: string,"track"?: Database["public"]['Enums']["law_track"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "law_contributions_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "law_contributions_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "law_contributions_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "law_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"law_sections": {
                  Row: {
                    "created_at": string,"id": string,"slug": string,"sort_order": number,"source_id": string,"summary": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"slug": string,"sort_order"?: number,"source_id": string,"summary": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"slug"?: string,"sort_order"?: number,"source_id"?: string,"summary"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "law_sections_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "law_sources"
      referencedColumns: ["id"]
    }
                  ]
                },"law_sources": {
                  Row: {
                    "created_at": string,"domain": string,"id": string,"instrument": string,"is_published": boolean,"jurisdiction": string,"slug": string,"sort_order": number,"source_url": string | null,"summary": string,"title": string,"track": Database["public"]['Enums']["law_track"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain": string,"id"?: string,"instrument": string,"is_published"?: boolean,"jurisdiction": string,"slug": string,"sort_order"?: number,"source_url"?: string | null,"summary": string,"title": string,"track": Database["public"]['Enums']["law_track"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"domain"?: string,"id"?: string,"instrument"?: string,"is_published"?: boolean,"jurisdiction"?: string,"slug"?: string,"sort_order"?: number,"source_url"?: string | null,"summary"?: string,"title"?: string,"track"?: Database["public"]['Enums']["law_track"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"linked_accounts": {
                  Row: {
                    "business_name_normalized": string | null,"created_at": string,"established_at": string | null,"established_by_profile_id": string | null,"established_via": string | null,"id": string,"linked_profile_id": string,"owner_profile_id": string,"relationship_type": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_name_normalized"?: string | null,"created_at"?: string,"established_at"?: string | null,"established_by_profile_id"?: string | null,"established_via"?: string | null,"id"?: string,"linked_profile_id": string,"owner_profile_id": string,"relationship_type"?: string,"updated_at"?: string
                  }
                  Update: {
                    "business_name_normalized"?: string | null,"created_at"?: string,"established_at"?: string | null,"established_by_profile_id"?: string | null,"established_via"?: string | null,"id"?: string,"linked_profile_id"?: string,"owner_profile_id"?: string,"relationship_type"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "linked_accounts_established_by_profile_id_fkey"
      columns: ["established_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "linked_accounts_linked_profile_id_fkey"
      columns: ["linked_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "linked_accounts_owner_profile_id_fkey"
      columns: ["owner_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"luma_ledger_entries": {
                  Row: {
                    "amount_lumens": number,"created_at": string,"entry_kind": string,"from_profile_id": string | null,"id": string,"idempotency_key": string,"market_listing_id": string | null,"memo": string | null,"to_profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_lumens": number,"created_at"?: string,"entry_kind": string,"from_profile_id"?: string | null,"id"?: string,"idempotency_key": string,"market_listing_id"?: string | null,"memo"?: string | null,"to_profile_id": string
                  }
                  Update: {
                    "amount_lumens"?: number,"created_at"?: string,"entry_kind"?: string,"from_profile_id"?: string | null,"id"?: string,"idempotency_key"?: string,"market_listing_id"?: string | null,"memo"?: string | null,"to_profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "luma_ledger_entries_from_profile_id_fkey"
      columns: ["from_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "luma_ledger_entries_market_listing_id_fkey"
      columns: ["market_listing_id"]
isOneToOne: false
      referencedRelation: "market_listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "luma_ledger_entries_to_profile_id_fkey"
      columns: ["to_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"luma_wallet_balances": {
                  Row: {
                    "balance_lumens": number,"currency_code": string,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "balance_lumens"?: number,"currency_code"?: string,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "balance_lumens"?: number,"currency_code"?: string,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "luma_wallet_balances_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"market_job_interests": {
                  Row: {
                    "age": string | null,"city": string | null,"company_name": string | null,"country_code": string | null,"created_at": string,"days": (string)[],"full_name": string,"hours_from": string | null,"hours_to": string | null,"id": string,"job_types": (string)[],"languages": (string)[],"mode": string,"notes": string | null,"pay_amount": string | null,"pay_period": string | null,"phone_country_code": string | null,"phone_number": string | null,"profile_id": string | null,"region_code": string | null,"status": string,"terms": (string)[],"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "age"?: string | null,"city"?: string | null,"company_name"?: string | null,"country_code"?: string | null,"created_at"?: string,"days"?: (string)[],"full_name"?: string,"hours_from"?: string | null,"hours_to"?: string | null,"id"?: string,"job_types"?: (string)[],"languages"?: (string)[],"mode": string,"notes"?: string | null,"pay_amount"?: string | null,"pay_period"?: string | null,"phone_country_code"?: string | null,"phone_number"?: string | null,"profile_id"?: string | null,"region_code"?: string | null,"status"?: string,"terms"?: (string)[],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "age"?: string | null,"city"?: string | null,"company_name"?: string | null,"country_code"?: string | null,"created_at"?: string,"days"?: (string)[],"full_name"?: string,"hours_from"?: string | null,"hours_to"?: string | null,"id"?: string,"job_types"?: (string)[],"languages"?: (string)[],"mode"?: string,"notes"?: string | null,"pay_amount"?: string | null,"pay_period"?: string | null,"phone_country_code"?: string | null,"phone_number"?: string | null,"profile_id"?: string | null,"region_code"?: string | null,"status"?: string,"terms"?: (string)[],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "market_job_interests_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"market_listings": {
                  Row: {
                    "created_at": string,"description": string | null,"id": string,"listing_kind": string,"price_lumens": number,"remaining_quantity": number,"seller_profile_id": string,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"listing_kind"?: string,"price_lumens": number,"remaining_quantity"?: number,"seller_profile_id": string,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"id"?: string,"listing_kind"?: string,"price_lumens"?: number,"remaining_quantity"?: number,"seller_profile_id"?: string,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "market_listings_seller_profile_id_fkey"
      columns: ["seller_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_action_requirements": {
                  Row: {
                    "action_type": string,"assigned_agent_id": string | null,"assigned_kind": string,"assigned_profile_id": string | null,"assigned_unit_label": string | null,"completed_at": string | null,"completed_by_agent_id": string | null,"completed_by_kind": string | null,"completed_by_profile_id": string | null,"completion_action": string | null,"context_id": string | null,"context_kind": string,"created_at": string,"due_at": string,"escalation_policy_id": string | null,"id": string,"matter_id": string,"reminder_at": string,"status": string,"timeout_action": string,"timing_policy_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_type": string,"assigned_agent_id"?: string | null,"assigned_kind": string,"assigned_profile_id"?: string | null,"assigned_unit_label"?: string | null,"completed_at"?: string | null,"completed_by_agent_id"?: string | null,"completed_by_kind"?: string | null,"completed_by_profile_id"?: string | null,"completion_action"?: string | null,"context_id"?: string | null,"context_kind"?: string,"created_at"?: string,"due_at": string,"escalation_policy_id"?: string | null,"id"?: string,"matter_id": string,"reminder_at": string,"status"?: string,"timeout_action"?: string,"timing_policy_id": string
                  }
                  Update: {
                    "action_type"?: string,"assigned_agent_id"?: string | null,"assigned_kind"?: string,"assigned_profile_id"?: string | null,"assigned_unit_label"?: string | null,"completed_at"?: string | null,"completed_by_agent_id"?: string | null,"completed_by_kind"?: string | null,"completed_by_profile_id"?: string | null,"completion_action"?: string | null,"context_id"?: string | null,"context_kind"?: string,"created_at"?: string,"due_at"?: string,"escalation_policy_id"?: string | null,"id"?: string,"matter_id"?: string,"reminder_at"?: string,"status"?: string,"timeout_action"?: string,"timing_policy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_action_requirements_assigned_agent_id_fkey"
      columns: ["assigned_agent_id"]
isOneToOne: false
      referencedRelation: "ai_agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_action_requirements_assigned_profile_id_fkey"
      columns: ["assigned_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_action_requirements_completed_by_agent_id_fkey"
      columns: ["completed_by_agent_id"]
isOneToOne: false
      referencedRelation: "ai_agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_action_requirements_completed_by_profile_id_fkey"
      columns: ["completed_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_action_requirements_escalation_policy_id_fkey"
      columns: ["escalation_policy_id"]
isOneToOne: false
      referencedRelation: "matter_escalation_policies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_action_requirements_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_action_requirements_timing_policy_id_fkey"
      columns: ["timing_policy_id"]
isOneToOne: false
      referencedRelation: "matter_timing_policies"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_agent_artifacts": {
                  Row: {
                    "artifact_type": string,"assignment_id": string,"body": string,"created_at": string,"generated_by_agent_id": string,"id": string,"matter_id": string,"review_status": string,"run_id": string,"source_references": NonNullable<Json>,"title": string,"verification_state": string
                  }
                  ComputedFields: never
                  Insert: {
                    "artifact_type": string,"assignment_id": string,"body": string,"created_at"?: string,"generated_by_agent_id": string,"id"?: string,"matter_id": string,"review_status"?: string,"run_id": string,"source_references"?: NonNullable<Json>,"title": string,"verification_state"?: string
                  }
                  Update: {
                    "artifact_type"?: string,"assignment_id"?: string,"body"?: string,"created_at"?: string,"generated_by_agent_id"?: string,"id"?: string,"matter_id"?: string,"review_status"?: string,"run_id"?: string,"source_references"?: NonNullable<Json>,"title"?: string,"verification_state"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_agent_artifacts_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "matter_agent_assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_agent_artifacts_generated_by_agent_id_fkey"
      columns: ["generated_by_agent_id"]
isOneToOne: false
      referencedRelation: "ai_agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_agent_artifacts_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_agent_artifacts_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "ai_agent_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_agent_assignments": {
                  Row: {
                    "agent_id": string,"allowed_capabilities": (string)[],"allowed_context": (string)[],"assigned_at": string,"assigned_by_kind": string,"assigned_by_profile_id": string | null,"cancelled_at": string | null,"coding_policy": NonNullable<Json>,"completed_at": string | null,"id": string,"instructions": string,"matter_id": string,"max_run_attempts": number,"role_purpose": string | null,"started_at": string | null,"status": string,"supervising_kind": string,"supervising_profile_id": string,"task_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agent_id": string,"allowed_capabilities"?: (string)[],"allowed_context"?: (string)[],"assigned_at"?: string,"assigned_by_kind": string,"assigned_by_profile_id"?: string | null,"cancelled_at"?: string | null,"coding_policy"?: NonNullable<Json>,"completed_at"?: string | null,"id"?: string,"instructions": string,"matter_id": string,"max_run_attempts"?: number,"role_purpose"?: string | null,"started_at"?: string | null,"status"?: string,"supervising_kind": string,"supervising_profile_id": string,"task_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "agent_id"?: string,"allowed_capabilities"?: (string)[],"allowed_context"?: (string)[],"assigned_at"?: string,"assigned_by_kind"?: string,"assigned_by_profile_id"?: string | null,"cancelled_at"?: string | null,"coding_policy"?: NonNullable<Json>,"completed_at"?: string | null,"id"?: string,"instructions"?: string,"matter_id"?: string,"max_run_attempts"?: number,"role_purpose"?: string | null,"started_at"?: string | null,"status"?: string,"supervising_kind"?: string,"supervising_profile_id"?: string,"task_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_agent_assignments_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "ai_agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_agent_assignments_assigned_by_profile_id_fkey"
      columns: ["assigned_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_agent_assignments_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_agent_assignments_supervising_profile_id_fkey"
      columns: ["supervising_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_agent_assignments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_attachments": {
                  Row: {
                    "body_text": string | null,"byte_size": number | null,"comment_id": string | null,"content_type": string | null,"created_at": string,"decision_id": string | null,"file_name": string | null,"file_path": string | null,"id": string,"kind": string,"label": string | null,"matter_id": string,"resolution_id": string | null,"task_id": string | null,"uploaded_by_profile_id": string,"url": string | null,"visibility": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body_text"?: string | null,"byte_size"?: number | null,"comment_id"?: string | null,"content_type"?: string | null,"created_at"?: string,"decision_id"?: string | null,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"kind"?: string,"label"?: string | null,"matter_id": string,"resolution_id"?: string | null,"task_id"?: string | null,"uploaded_by_profile_id": string,"url"?: string | null,"visibility"?: string | null
                  }
                  Update: {
                    "body_text"?: string | null,"byte_size"?: number | null,"comment_id"?: string | null,"content_type"?: string | null,"created_at"?: string,"decision_id"?: string | null,"file_name"?: string | null,"file_path"?: string | null,"id"?: string,"kind"?: string,"label"?: string | null,"matter_id"?: string,"resolution_id"?: string | null,"task_id"?: string | null,"uploaded_by_profile_id"?: string,"url"?: string | null,"visibility"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_attachments_comment_id_fkey"
      columns: ["comment_id"]
isOneToOne: false
      referencedRelation: "matter_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_attachments_decision_id_fkey"
      columns: ["decision_id"]
isOneToOne: false
      referencedRelation: "matter_decisions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_attachments_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_attachments_resolution_id_fkey"
      columns: ["resolution_id"]
isOneToOne: false
      referencedRelation: "matter_resolutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_attachments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_attachments_uploaded_by_profile_id_fkey"
      columns: ["uploaded_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_coding_command_log": {
                  Row: {
                    "allowed": boolean,"category": string | null,"command_text": string,"created_at": string,"exit_code": number | null,"id": string,"output_excerpt": string | null,"reason": string | null,"run_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allowed": boolean,"category"?: string | null,"command_text": string,"created_at"?: string,"exit_code"?: number | null,"id"?: string,"output_excerpt"?: string | null,"reason"?: string | null,"run_id": string,"workspace_id": string
                  }
                  Update: {
                    "allowed"?: boolean,"category"?: string | null,"command_text"?: string,"created_at"?: string,"exit_code"?: number | null,"id"?: string,"output_excerpt"?: string | null,"reason"?: string | null,"run_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_coding_command_log_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "ai_agent_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_coding_command_log_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "matter_coding_workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_coding_workspaces": {
                  Row: {
                    "assignment_id": string,"base_commit_sha": string,"completed_at": string | null,"created_at": string,"id": string,"matter_id": string,"primary_dirty_summary": string | null,"repository_id": string,"run_id": string,"started_at": string | null,"status": string,"workspace_ref": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assignment_id": string,"base_commit_sha": string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"matter_id": string,"primary_dirty_summary"?: string | null,"repository_id": string,"run_id": string,"started_at"?: string | null,"status"?: string,"workspace_ref": string
                  }
                  Update: {
                    "assignment_id"?: string,"base_commit_sha"?: string,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"matter_id"?: string,"primary_dirty_summary"?: string | null,"repository_id"?: string,"run_id"?: string,"started_at"?: string | null,"status"?: string,"workspace_ref"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_coding_workspaces_assignment_id_fkey"
      columns: ["assignment_id"]
isOneToOne: false
      referencedRelation: "matter_agent_assignments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_coding_workspaces_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_coding_workspaces_repository_id_fkey"
      columns: ["repository_id"]
isOneToOne: false
      referencedRelation: "coding_repositories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_coding_workspaces_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "ai_agent_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_comments": {
                  Row: {
                    "agent_id": string | null,"author_kind": string,"author_profile_id": string | null,"body": string,"created_at": string,"id": string,"is_ai_agent": boolean,"matter_id": string,"mentioned_profile_ids": (string)[],"parent_id": string | null,"run_id": string | null,"task_id": string | null,"visibility": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "agent_id"?: string | null,"author_kind": string,"author_profile_id"?: string | null,"body": string,"created_at"?: string,"id"?: string,"is_ai_agent"?: boolean,"matter_id": string,"mentioned_profile_ids"?: (string)[],"parent_id"?: string | null,"run_id"?: string | null,"task_id"?: string | null,"visibility"?: string | null
                  }
                  Update: {
                    "agent_id"?: string | null,"author_kind"?: string,"author_profile_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"is_ai_agent"?: boolean,"matter_id"?: string,"mentioned_profile_ids"?: (string)[],"parent_id"?: string | null,"run_id"?: string | null,"task_id"?: string | null,"visibility"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_comments_agent_id_fkey"
      columns: ["agent_id"]
isOneToOne: false
      referencedRelation: "ai_agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_comments_author_profile_id_fkey"
      columns: ["author_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_comments_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "matter_comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_comments_run_id_fkey"
      columns: ["run_id"]
isOneToOne: false
      referencedRelation: "ai_agent_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_comments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_decision_tasks": {
                  Row: {
                    "decision_id": string,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "decision_id": string,"task_id": string
                  }
                  Update: {
                    "decision_id"?: string,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_decision_tasks_decision_id_fkey"
      columns: ["decision_id"]
isOneToOne: false
      referencedRelation: "matter_decisions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_decision_tasks_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_decisions": {
                  Row: {
                    "created_at": string,"decided_at": string | null,"decided_by_kind": string | null,"decided_by_profile_id": string | null,"id": string,"matter_id": string,"proposed_by_kind": string,"proposed_by_profile_id": string,"rationale": string | null,"statement": string,"status": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by_kind"?: string | null,"decided_by_profile_id"?: string | null,"id"?: string,"matter_id": string,"proposed_by_kind": string,"proposed_by_profile_id": string,"rationale"?: string | null,"statement": string,"status"?: string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"decided_at"?: string | null,"decided_by_kind"?: string | null,"decided_by_profile_id"?: string | null,"id"?: string,"matter_id"?: string,"proposed_by_kind"?: string,"proposed_by_profile_id"?: string,"rationale"?: string | null,"statement"?: string,"status"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_decisions_decided_by_profile_id_fkey"
      columns: ["decided_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_decisions_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_decisions_proposed_by_profile_id_fkey"
      columns: ["proposed_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_escalation_executions": {
                  Row: {
                    "action_id": string,"executed_at": string,"step_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id": string,"executed_at"?: string,"step_order": number
                  }
                  Update: {
                    "action_id"?: string,"executed_at"?: string,"step_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_escalation_executions_action_id_fkey"
      columns: ["action_id"]
isOneToOne: false
      referencedRelation: "matter_action_requirements"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_escalation_policies": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"max_depth": number,"notes": string | null,"timeout_behavior": string,"trigger_action_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"max_depth"?: number,"notes"?: string | null,"timeout_behavior": string,"trigger_action_type"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"max_depth"?: number,"notes"?: string | null,"timeout_behavior"?: string,"trigger_action_type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"matter_escalation_policy_defaults": {
                  Row: {
                    "action_type": string,"matter_type": string,"policy_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_type": string,"matter_type": string,"policy_id": string
                  }
                  Update: {
                    "action_type"?: string,"matter_type"?: string,"policy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_escalation_policy_defaults_policy_id_fkey"
      columns: ["policy_id"]
isOneToOne: false
      referencedRelation: "matter_escalation_policies"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_escalation_steps": {
                  Row: {
                    "after_hours": number,"id": string,"policy_id": string,"step_behavior": string,"step_order": number,"target_profile_id": string | null,"target_role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "after_hours": number,"id"?: string,"policy_id": string,"step_behavior": string,"step_order": number,"target_profile_id"?: string | null,"target_role": string
                  }
                  Update: {
                    "after_hours"?: number,"id"?: string,"policy_id"?: string,"step_behavior"?: string,"step_order"?: number,"target_profile_id"?: string | null,"target_role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_escalation_steps_policy_id_fkey"
      columns: ["policy_id"]
isOneToOne: false
      referencedRelation: "matter_escalation_policies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_escalation_steps_target_profile_id_fkey"
      columns: ["target_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_evaluations": {
                  Row: {
                    "comment": string | null,"created_at": string,"dimension": string,"evaluator_kind": string,"evaluator_profile_id": string,"evaluator_role": string,"id": string,"matter_id": string,"rating": string,"resolution_id": string | null,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"created_at"?: string,"dimension": string,"evaluator_kind": string,"evaluator_profile_id": string,"evaluator_role": string,"id"?: string,"matter_id": string,"rating": string,"resolution_id"?: string | null,"visibility"?: string
                  }
                  Update: {
                    "comment"?: string | null,"created_at"?: string,"dimension"?: string,"evaluator_kind"?: string,"evaluator_profile_id"?: string,"evaluator_role"?: string,"id"?: string,"matter_id"?: string,"rating"?: string,"resolution_id"?: string | null,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_evaluations_evaluator_profile_id_fkey"
      columns: ["evaluator_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_evaluations_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_evaluations_resolution_id_fkey"
      columns: ["resolution_id"]
isOneToOne: false
      referencedRelation: "matter_resolutions"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_events": {
                  Row: {
                    "actor_agent_id": string | null,"actor_kind": string,"actor_profile_id": string | null,"created_at": string,"event_type": string,"id": string,"is_system": boolean,"matter_id": string,"payload": NonNullable<Json>,"summary": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_agent_id"?: string | null,"actor_kind": string,"actor_profile_id"?: string | null,"created_at"?: string,"event_type": string,"id"?: string,"is_system"?: boolean,"matter_id": string,"payload"?: NonNullable<Json>,"summary": string
                  }
                  Update: {
                    "actor_agent_id"?: string | null,"actor_kind"?: string,"actor_profile_id"?: string | null,"created_at"?: string,"event_type"?: string,"id"?: string,"is_system"?: boolean,"matter_id"?: string,"payload"?: NonNullable<Json>,"summary"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_events_actor_agent_id_fkey"
      columns: ["actor_agent_id"]
isOneToOne: false
      referencedRelation: "ai_agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_events_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_events_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_outcome_followups": {
                  Row: {
                    "action_id": string | null,"completed_at": string | null,"created_at": string,"created_by_profile_id": string,"human_outcome_review_id": string | null,"id": string,"matter_id": string,"notes": string | null,"outcome_question": string,"resolution_id": string | null,"result": string | null,"review_due_at": string,"reviewer_kind": string,"reviewer_profile_id": string,"status": string,"target_indicator": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by_profile_id": string,"human_outcome_review_id"?: string | null,"id"?: string,"matter_id": string,"notes"?: string | null,"outcome_question": string,"resolution_id"?: string | null,"result"?: string | null,"review_due_at": string,"reviewer_kind": string,"reviewer_profile_id": string,"status"?: string,"target_indicator"?: string | null
                  }
                  Update: {
                    "action_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by_profile_id"?: string,"human_outcome_review_id"?: string | null,"id"?: string,"matter_id"?: string,"notes"?: string | null,"outcome_question"?: string,"resolution_id"?: string | null,"result"?: string | null,"review_due_at"?: string,"reviewer_kind"?: string,"reviewer_profile_id"?: string,"status"?: string,"target_indicator"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_outcome_followups_action_id_fkey"
      columns: ["action_id"]
isOneToOne: false
      referencedRelation: "matter_action_requirements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_outcome_followups_created_by_profile_id_fkey"
      columns: ["created_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_outcome_followups_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_outcome_followups_resolution_id_fkey"
      columns: ["resolution_id"]
isOneToOne: false
      referencedRelation: "matter_resolutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_outcome_followups_reviewer_profile_id_fkey"
      columns: ["reviewer_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_parties": {
                  Row: {
                    "actor_agent_id": string | null,"actor_kind": string,"actor_profile_id": string | null,"actor_unit_label": string | null,"added_at": string,"id": string,"matter_id": string,"role": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_agent_id"?: string | null,"actor_kind": string,"actor_profile_id"?: string | null,"actor_unit_label"?: string | null,"added_at"?: string,"id"?: string,"matter_id": string,"role": string
                  }
                  Update: {
                    "actor_agent_id"?: string | null,"actor_kind"?: string,"actor_profile_id"?: string | null,"actor_unit_label"?: string | null,"added_at"?: string,"id"?: string,"matter_id"?: string,"role"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_parties_actor_agent_id_fkey"
      columns: ["actor_agent_id"]
isOneToOne: false
      referencedRelation: "ai_agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_parties_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_parties_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_relationships": {
                  Row: {
                    "created_at": string,"created_by_profile_id": string,"from_matter_id": string,"id": string,"relationship_kind": string,"to_matter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by_profile_id": string,"from_matter_id": string,"id"?: string,"relationship_kind": string,"to_matter_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by_profile_id"?: string,"from_matter_id"?: string,"id"?: string,"relationship_kind"?: string,"to_matter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_relationships_created_by_profile_id_fkey"
      columns: ["created_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_relationships_from_matter_id_fkey"
      columns: ["from_matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_relationships_to_matter_id_fkey"
      columns: ["to_matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_reminders": {
                  Row: {
                    "action_id": string,"id": string,"reminder_kind": string,"sent_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id": string,"id"?: string,"reminder_kind": string,"sent_at"?: string
                  }
                  Update: {
                    "action_id"?: string,"id"?: string,"reminder_kind"?: string,"sent_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_reminders_action_id_fkey"
      columns: ["action_id"]
isOneToOne: false
      referencedRelation: "matter_action_requirements"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_resolutions": {
                  Row: {
                    "actions_taken": string | null,"attempt_number": number,"closed_at": string | null,"closure_kind": string | null,"created_at": string,"evaluator_position": string | null,"id": string,"initiator_position": string | null,"limitations": string | null,"matter_id": string,"outstanding_items": string | null,"proposed_at": string,"proposed_by_kind": string,"proposed_by_profile_id": string,"resolution_kind": string,"resolution_status": string,"responsible_party_position": string,"summary": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actions_taken"?: string | null,"attempt_number": number,"closed_at"?: string | null,"closure_kind"?: string | null,"created_at"?: string,"evaluator_position"?: string | null,"id"?: string,"initiator_position"?: string | null,"limitations"?: string | null,"matter_id": string,"outstanding_items"?: string | null,"proposed_at"?: string,"proposed_by_kind": string,"proposed_by_profile_id": string,"resolution_kind": string,"resolution_status"?: string,"responsible_party_position": string,"summary": string,"updated_at"?: string
                  }
                  Update: {
                    "actions_taken"?: string | null,"attempt_number"?: number,"closed_at"?: string | null,"closure_kind"?: string | null,"created_at"?: string,"evaluator_position"?: string | null,"id"?: string,"initiator_position"?: string | null,"limitations"?: string | null,"matter_id"?: string,"outstanding_items"?: string | null,"proposed_at"?: string,"proposed_by_kind"?: string,"proposed_by_profile_id"?: string,"resolution_kind"?: string,"resolution_status"?: string,"responsible_party_position"?: string,"summary"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_resolutions_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_resolutions_proposed_by_profile_id_fkey"
      columns: ["proposed_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_responsibilities": {
                  Row: {
                    "accepted_at": string | null,"actor_kind": string,"actor_profile_id": string,"actor_unit_label": string | null,"assigned_at": string,"assigned_by_kind": string | null,"assigned_by_profile_id": string | null,"declined_at": string | null,"ended_at": string | null,"id": string,"kind": string,"matter_id": string,"response_action": string | null,"response_reason": string | null,"status": string,"suggested_actor_kind": string | null,"suggested_actor_profile_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"actor_kind": string,"actor_profile_id": string,"actor_unit_label"?: string | null,"assigned_at"?: string,"assigned_by_kind"?: string | null,"assigned_by_profile_id"?: string | null,"declined_at"?: string | null,"ended_at"?: string | null,"id"?: string,"kind": string,"matter_id": string,"response_action"?: string | null,"response_reason"?: string | null,"status"?: string,"suggested_actor_kind"?: string | null,"suggested_actor_profile_id"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"actor_kind"?: string,"actor_profile_id"?: string,"actor_unit_label"?: string | null,"assigned_at"?: string,"assigned_by_kind"?: string | null,"assigned_by_profile_id"?: string | null,"declined_at"?: string | null,"ended_at"?: string | null,"id"?: string,"kind"?: string,"matter_id"?: string,"response_action"?: string | null,"response_reason"?: string | null,"status"?: string,"suggested_actor_kind"?: string | null,"suggested_actor_profile_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_responsibilities_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_responsibilities_assigned_by_profile_id_fkey"
      columns: ["assigned_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_responsibilities_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matter_responsibilities_suggested_actor_profile_id_fkey"
      columns: ["suggested_actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matter_timing_policies": {
                  Row: {
                    "created_at": string,"display_name": string,"duration_unit": string,"duration_value": number,"id": string,"notes": string | null,"reminder_unit": string,"reminder_value": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"duration_unit"?: string,"duration_value": number,"id": string,"notes"?: string | null,"reminder_unit"?: string,"reminder_value": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"duration_unit"?: string,"duration_value"?: number,"id"?: string,"notes"?: string | null,"reminder_unit"?: string,"reminder_value"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"matter_type_defaults": {
                  Row: {
                    "initial_action_type": string,"matter_type": string,"timeout_behavior": string,"timing_policy_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "initial_action_type": string,"matter_type": string,"timeout_behavior": string,"timing_policy_id": string
                  }
                  Update: {
                    "initial_action_type"?: string,"matter_type"?: string,"timeout_behavior"?: string,"timing_policy_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matter_type_defaults_timing_policy_id_fkey"
      columns: ["timing_policy_id"]
isOneToOne: false
      referencedRelation: "matter_timing_policies"
      referencedColumns: ["id"]
    }
                  ]
                },"matters": {
                  Row: {
                    "addressee_kind": string,"addressee_profile_id": string,"addressee_unit_label": string | null,"area_node_id": string | null,"close_kind": string | null,"close_reason": string | null,"closed_at": string | null,"collaborative_work_completed_at": string | null,"collaborative_work_completion_kind": string | null,"collaborative_work_completion_reason": string | null,"collaborative_work_started_at": string | null,"created_at": string,"created_by_profile_id": string,"current_action_id": string | null,"description": string,"id": string,"initiator_kind": string,"initiator_profile_id": string,"initiator_unit_label": string | null,"last_reopened_at": string | null,"latest_resolution_id": string | null,"lifecycle_status": string,"matter_type": string,"reopen_count": number,"resolution_attempt_count": number,"responsible_kind": string,"responsible_profile_id": string,"responsible_unit_label": string | null,"scope_country_code": string | null,"scope_kind": string,"scope_locality_code": string | null,"scope_region_code": string | null,"submitted_at": string | null,"title": string,"updated_at": string,"visibility": string,"waiting_condition": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "addressee_kind": string,"addressee_profile_id": string,"addressee_unit_label"?: string | null,"area_node_id"?: string | null,"close_kind"?: string | null,"close_reason"?: string | null,"closed_at"?: string | null,"collaborative_work_completed_at"?: string | null,"collaborative_work_completion_kind"?: string | null,"collaborative_work_completion_reason"?: string | null,"collaborative_work_started_at"?: string | null,"created_at"?: string,"created_by_profile_id": string,"current_action_id"?: string | null,"description": string,"id"?: string,"initiator_kind": string,"initiator_profile_id": string,"initiator_unit_label"?: string | null,"last_reopened_at"?: string | null,"latest_resolution_id"?: string | null,"lifecycle_status"?: string,"matter_type": string,"reopen_count"?: number,"resolution_attempt_count"?: number,"responsible_kind": string,"responsible_profile_id": string,"responsible_unit_label"?: string | null,"scope_country_code"?: string | null,"scope_kind"?: string,"scope_locality_code"?: string | null,"scope_region_code"?: string | null,"submitted_at"?: string | null,"title": string,"updated_at"?: string,"visibility"?: string,"waiting_condition"?: string | null
                  }
                  Update: {
                    "addressee_kind"?: string,"addressee_profile_id"?: string,"addressee_unit_label"?: string | null,"area_node_id"?: string | null,"close_kind"?: string | null,"close_reason"?: string | null,"closed_at"?: string | null,"collaborative_work_completed_at"?: string | null,"collaborative_work_completion_kind"?: string | null,"collaborative_work_completion_reason"?: string | null,"collaborative_work_started_at"?: string | null,"created_at"?: string,"created_by_profile_id"?: string,"current_action_id"?: string | null,"description"?: string,"id"?: string,"initiator_kind"?: string,"initiator_profile_id"?: string,"initiator_unit_label"?: string | null,"last_reopened_at"?: string | null,"latest_resolution_id"?: string | null,"lifecycle_status"?: string,"matter_type"?: string,"reopen_count"?: number,"resolution_attempt_count"?: number,"responsible_kind"?: string,"responsible_profile_id"?: string,"responsible_unit_label"?: string | null,"scope_country_code"?: string | null,"scope_kind"?: string,"scope_locality_code"?: string | null,"scope_region_code"?: string | null,"submitted_at"?: string | null,"title"?: string,"updated_at"?: string,"visibility"?: string,"waiting_condition"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matters_addressee_profile_id_fkey"
      columns: ["addressee_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matters_area_node_id_fkey"
      columns: ["area_node_id"]
isOneToOne: false
      referencedRelation: "classification_nodes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matters_created_by_profile_id_fkey"
      columns: ["created_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matters_initiator_profile_id_fkey"
      columns: ["initiator_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matters_latest_resolution_fk"
      columns: ["latest_resolution_id"]
isOneToOne: false
      referencedRelation: "matter_resolutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matters_responsible_profile_id_fkey"
      columns: ["responsible_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "content": string,"created_at": string,"edited_at": string | null,"id": string,"is_edited": boolean | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"is_edited"?: boolean | null,"sender_id": string
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"is_edited"?: boolean | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"monetary_policy_approvals": {
                  Row: {
                    "approval_class": string,"approver_id": string,"created_at": string,"decision": string,"id": string,"notes": string | null,"policy_profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approval_class": string,"approver_id": string,"created_at"?: string,"decision": string,"id"?: string,"notes"?: string | null,"policy_profile_id": string
                  }
                  Update: {
                    "approval_class"?: string,"approver_id"?: string,"created_at"?: string,"decision"?: string,"id"?: string,"notes"?: string | null,"policy_profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "monetary_policy_approvals_approver_id_fkey"
      columns: ["approver_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monetary_policy_approvals_policy_profile_id_fkey"
      columns: ["policy_profile_id"]
isOneToOne: false
      referencedRelation: "monetary_policy_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"monetary_policy_audit_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"event_type": string,"id": string,"payload": NonNullable<Json>,"policy_profile_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"event_type": string,"id"?: string,"payload"?: NonNullable<Json>,"policy_profile_id"?: string | null
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"event_type"?: string,"id"?: string,"payload"?: NonNullable<Json>,"policy_profile_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "monetary_policy_audit_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monetary_policy_audit_events_policy_profile_id_fkey"
      columns: ["policy_profile_id"]
isOneToOne: false
      referencedRelation: "monetary_policy_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"monetary_policy_profiles": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"is_active": boolean,"policy_json": NonNullable<Json>,"policy_name": string,"updated_at": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"policy_json"?: NonNullable<Json>,"policy_name"?: string,"updated_at"?: string,"version"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"is_active"?: boolean,"policy_json"?: NonNullable<Json>,"policy_name"?: string,"updated_at"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "monetary_policy_profiles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"nela_moderation_event_counts": {
                  Row: {
                    "category": string,"count": number,"event_date": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"count"?: number,"event_date"?: string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"count"?: number,"event_date"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"notification_digests": {
                  Row: {
                    "id": string,"item_count": number,"profile_id": string,"sent_at": string,"through": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"item_count": number,"profile_id": string,"sent_at"?: string,"through": string
                  }
                  Update: {
                    "id"?: string,"item_count"?: number,"profile_id"?: string,"sent_at"?: string,"through"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_digests_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_evaluations": {
                  Row: {
                    "created_at": string,"decision": string,"evaluator_profile_id": string,"feedback": string | null,"id": string,"impact_score": number | null,"participation_id": string,"quality_score": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decision": string,"evaluator_profile_id": string,"feedback"?: string | null,"id"?: string,"impact_score"?: number | null,"participation_id": string,"quality_score"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"decision"?: string,"evaluator_profile_id"?: string,"feedback"?: string | null,"id"?: string,"impact_score"?: number | null,"participation_id"?: string,"quality_score"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_evaluations_evaluator_profile_id_fkey"
      columns: ["evaluator_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_evaluations_participation_id_fkey"
      columns: ["participation_id"]
isOneToOne: false
      referencedRelation: "opportunity_participations"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_participation_evidence": {
                  Row: {
                    "created_at": string,"created_by": string,"description": string,"id": string,"participation_id": string,"reference_label": string | null,"reference_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"description": string,"id"?: string,"participation_id": string,"reference_label"?: string | null,"reference_url"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"description"?: string,"id"?: string,"participation_id"?: string,"reference_label"?: string | null,"reference_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_participation_evidence_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_participation_evidence_participation_id_fkey"
      columns: ["participation_id"]
isOneToOne: false
      referencedRelation: "opportunity_participations"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_participations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"activated_at": string | null,"application_message": string | null,"applied_at": string,"cancelled_at": string | null,"cancelled_by": string | null,"completed_at": string | null,"completed_by": string | null,"created_at": string,"decline_note": string | null,"declined_at": string | null,"declined_by": string | null,"id": string,"opportunity_id": string,"participant_profile_id": string,"status": string,"submitted_at": string | null,"updated_at": string,"verification_status": string,"withdrawn_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"activated_at"?: string | null,"application_message"?: string | null,"applied_at"?: string,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"decline_note"?: string | null,"declined_at"?: string | null,"declined_by"?: string | null,"id"?: string,"opportunity_id": string,"participant_profile_id": string,"status"?: string,"submitted_at"?: string | null,"updated_at"?: string,"verification_status"?: string,"withdrawn_at"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"activated_at"?: string | null,"application_message"?: string | null,"applied_at"?: string,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"completed_at"?: string | null,"completed_by"?: string | null,"created_at"?: string,"decline_note"?: string | null,"declined_at"?: string | null,"declined_by"?: string | null,"id"?: string,"opportunity_id"?: string,"participant_profile_id"?: string,"status"?: string,"submitted_at"?: string | null,"updated_at"?: string,"verification_status"?: string,"withdrawn_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_participations_accepted_by_fkey"
      columns: ["accepted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_participations_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_participations_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_participations_declined_by_fkey"
      columns: ["declined_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_participations_opportunity_id_fkey"
      columns: ["opportunity_id"]
isOneToOne: false
      referencedRelation: "contribution_opportunities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_participations_participant_profile_id_fkey"
      columns: ["participant_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_skill_evidence": {
                  Row: {
                    "created_at": string,"evaluation_id": string | null,"id": string,"participation_id": string,"skill_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evaluation_id"?: string | null,"id"?: string,"participation_id": string,"skill_name": string
                  }
                  Update: {
                    "created_at"?: string,"evaluation_id"?: string | null,"id"?: string,"participation_id"?: string,"skill_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_skill_evidence_evaluation_id_fkey"
      columns: ["evaluation_id"]
isOneToOne: false
      referencedRelation: "opportunity_evaluations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_skill_evidence_participation_id_fkey"
      columns: ["participation_id"]
isOneToOne: false
      referencedRelation: "opportunity_participations"
      referencedColumns: ["id"]
    }
                  ]
                },"opportunity_work_assessments": {
                  Row: {
                    "collaboration_score": number | null,"completion_score": number | null,"created_at": string,"evaluator_profile_id": string,"id": string,"impact_score": number | null,"notes": string | null,"outcome_score": number | null,"participation_id": string,"quality_score": number | null,"reliability_score": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "collaboration_score"?: number | null,"completion_score"?: number | null,"created_at"?: string,"evaluator_profile_id": string,"id"?: string,"impact_score"?: number | null,"notes"?: string | null,"outcome_score"?: number | null,"participation_id": string,"quality_score"?: number | null,"reliability_score"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "collaboration_score"?: number | null,"completion_score"?: number | null,"created_at"?: string,"evaluator_profile_id"?: string,"id"?: string,"impact_score"?: number | null,"notes"?: string | null,"outcome_score"?: number | null,"participation_id"?: string,"quality_score"?: number | null,"reliability_score"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_work_assessments_evaluator_profile_id_fkey"
      columns: ["evaluator_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_work_assessments_participation_id_fkey"
      columns: ["participation_id"]
isOneToOne: true
      referencedRelation: "opportunity_participations"
      referencedColumns: ["id"]
    }
                  ]
                },"post_comments": {
                  Row: {
                    "author_id": string,"content": string,"created_at": string,"edited_at": string | null,"id": string,"is_edited": boolean | null,"post_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"content": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"is_edited"?: boolean | null,"post_id": string
                  }
                  Update: {
                    "author_id"?: string,"content"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"is_edited"?: boolean | null,"post_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_comments_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_likes": {
                  Row: {
                    "created_at": string,"id": string,"post_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"post_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"post_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_likes_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_reposts": {
                  Row: {
                    "commentary_post_id": string | null,"created_at": string,"id": string,"original_post_id": string | null,"reposter_profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "commentary_post_id"?: string | null,"created_at"?: string,"id"?: string,"original_post_id"?: string | null,"reposter_profile_id": string
                  }
                  Update: {
                    "commentary_post_id"?: string | null,"created_at"?: string,"id"?: string,"original_post_id"?: string | null,"reposter_profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_reposts_commentary_post_id_fkey"
      columns: ["commentary_post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_reposts_original_post_id_fkey"
      columns: ["original_post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_reposts_reposter_profile_id_fkey"
      columns: ["reposter_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"post_revisions": {
                  Row: {
                    "content": string,"created_at": string,"editor_profile_id": string,"id": string,"post_id": string,"revision_number": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"editor_profile_id": string,"id"?: string,"post_id": string,"revision_number": number
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"editor_profile_id"?: string,"id"?: string,"post_id"?: string,"revision_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_revisions_editor_profile_id_fkey"
      columns: ["editor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_revisions_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_views": {
                  Row: {
                    "first_viewed_at": string,"id": string,"last_viewed_at": string,"post_id": string,"view_count": number,"viewer_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "first_viewed_at"?: string,"id"?: string,"last_viewed_at"?: string,"post_id": string,"view_count"?: number,"viewer_id": string
                  }
                  Update: {
                    "first_viewed_at"?: string,"id"?: string,"last_viewed_at"?: string,"post_id"?: string,"view_count"?: number,"viewer_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_views_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_views_viewer_id_fkey"
      columns: ["viewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"posts": {
                  Row: {
                    "author_id": string,"content": string,"created_at": string,"edited_at": string | null,"id": string,"is_edited": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"content": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"is_edited"?: boolean | null
                  }
                  Update: {
                    "author_id"?: string,"content"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"is_edited"?: boolean | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "posts_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"private_conversation_members": {
                  Row: {
                    "conversation_id": string,"hidden_at": string | null,"joined_at": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"hidden_at"?: string | null,"joined_at"?: string,"profile_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"hidden_at"?: string | null,"joined_at"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "private_conversation_members_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "private_conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "private_conversation_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"private_conversations": {
                  Row: {
                    "created_at": string,"disappearing_minutes": number,"disappearing_set_by": string | null,"disappearing_started_at": string | null,"id": string,"kind": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"disappearing_minutes"?: number,"disappearing_set_by"?: string | null,"disappearing_started_at"?: string | null,"id": string,"kind": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"disappearing_minutes"?: number,"disappearing_set_by"?: string | null,"disappearing_started_at"?: string | null,"id"?: string,"kind"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "private_conversations_disappearing_set_by_fkey"
      columns: ["disappearing_set_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"private_message_blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "private_message_blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "private_message_blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"private_messages": {
                  Row: {
                    "cipher_nonce": string | null,"cipher_text": string | null,"content": string | null,"conversation_id": string,"created_at": string,"edited_at": string | null,"id": string,"is_edited": boolean | null,"message_kind": string,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cipher_nonce"?: string | null,"cipher_text"?: string | null,"content"?: string | null,"conversation_id": string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"is_edited"?: boolean | null,"message_kind"?: string,"sender_id": string
                  }
                  Update: {
                    "cipher_nonce"?: string | null,"cipher_text"?: string | null,"content"?: string | null,"conversation_id"?: string,"created_at"?: string,"edited_at"?: string | null,"id"?: string,"is_edited"?: boolean | null,"message_kind"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "private_messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "private_conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "private_messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"professions": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"label": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description": string,"id": string,"label": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"label"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profile_contribution_events": {
                  Row: {
                    "beneficiary_estimate": number,"capacity_estimate": number,"collaboration_estimate": number,"created_at": string,"event_type": string,"id": string,"impact_estimate": number,"occurred_at": string,"profile_id": string,"raw_meta": NonNullable<Json>,"source_id": string,"source_table": string,"summary": string | null,"title": string,"updated_at": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "beneficiary_estimate"?: number,"capacity_estimate"?: number,"collaboration_estimate"?: number,"created_at"?: string,"event_type": string,"id"?: string,"impact_estimate"?: number,"occurred_at"?: string,"profile_id": string,"raw_meta"?: NonNullable<Json>,"source_id": string,"source_table": string,"summary"?: string | null,"title"?: string,"updated_at"?: string,"verified"?: boolean
                  }
                  Update: {
                    "beneficiary_estimate"?: number,"capacity_estimate"?: number,"collaboration_estimate"?: number,"created_at"?: string,"event_type"?: string,"id"?: string,"impact_estimate"?: number,"occurred_at"?: string,"profile_id"?: string,"raw_meta"?: NonNullable<Json>,"source_id"?: string,"source_table"?: string,"summary"?: string | null,"title"?: string,"updated_at"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_contribution_events_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_declared_context": {
                  Row: {
                    "contribution_interests": (string)[],"goals": (string)[],"interests": (string)[],"priorities": (string)[],"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contribution_interests"?: (string)[],"goals"?: (string)[],"interests"?: (string)[],"priorities"?: (string)[],"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "contribution_interests"?: (string)[],"goals"?: (string)[],"interests"?: (string)[],"priorities"?: (string)[],"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_declared_context_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_education_entries": {
                  Row: {
                    "certificate_path": string | null,"certificate_uploaded_at": string | null,"city": string | null,"country_code": string | null,"created_at": string,"department": string | null,"education_level": string | null,"id": string,"institution_name": string | null,"major": string | null,"profile_id": string,"region_code": string | null,"updated_at": string,"verification_status": string,"year_end": number | null,"year_start": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "certificate_path"?: string | null,"certificate_uploaded_at"?: string | null,"city"?: string | null,"country_code"?: string | null,"created_at"?: string,"department"?: string | null,"education_level"?: string | null,"id"?: string,"institution_name"?: string | null,"major"?: string | null,"profile_id": string,"region_code"?: string | null,"updated_at"?: string,"verification_status"?: string,"year_end"?: number | null,"year_start"?: number | null
                  }
                  Update: {
                    "certificate_path"?: string | null,"certificate_uploaded_at"?: string | null,"city"?: string | null,"country_code"?: string | null,"created_at"?: string,"department"?: string | null,"education_level"?: string | null,"id"?: string,"institution_name"?: string | null,"major"?: string | null,"profile_id"?: string,"region_code"?: string | null,"updated_at"?: string,"verification_status"?: string,"year_end"?: number | null,"year_start"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_education_entries_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_experience_entries": {
                  Row: {
                    "created_at": string,"experiences": NonNullable<Json>,"id": string,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"experiences"?: NonNullable<Json>,"id"?: string,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"experiences"?: NonNullable<Json>,"id"?: string,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_experience_entries_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_governance_roles": {
                  Row: {
                    "assigned_at": string,"assigned_by": string | null,"assignment_source": string,"created_at": string,"domain_key": string,"ended_at": string | null,"id": string,"is_active": boolean,"metadata": NonNullable<Json>,"notes": string | null,"profile_id": string,"role_key": string,"source_unit_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"assignment_source"?: string,"created_at"?: string,"domain_key": string,"ended_at"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"notes"?: string | null,"profile_id": string,"role_key": string,"source_unit_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"assignment_source"?: string,"created_at"?: string,"domain_key"?: string,"ended_at"?: string | null,"id"?: string,"is_active"?: boolean,"metadata"?: NonNullable<Json>,"notes"?: string | null,"profile_id"?: string,"role_key"?: string,"source_unit_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_governance_roles_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_governance_roles_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_governance_roles_role_fkey"
      columns: ["domain_key","role_key"]
isOneToOne: false
      referencedRelation: "governance_domain_roles"
      referencedColumns: ["domain_key","role_key"]
    },{
      foreignKeyName: "profile_governance_roles_source_unit_id_fkey"
      columns: ["source_unit_id"]
isOneToOne: false
      referencedRelation: "governance_execution_units"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_performance_ratings": {
                  Row: {
                    "comment": string | null,"contribution_event_id": string,"created_at": string,"id": string,"rater_profile_id": string,"score": number,"subject_profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comment"?: string | null,"contribution_event_id": string,"created_at"?: string,"id"?: string,"rater_profile_id": string,"score": number,"subject_profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "comment"?: string | null,"contribution_event_id"?: string,"created_at"?: string,"id"?: string,"rater_profile_id"?: string,"score"?: number,"subject_profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_performance_ratings_contribution_event_id_fkey"
      columns: ["contribution_event_id"]
isOneToOne: false
      referencedRelation: "profile_contribution_events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_performance_ratings_rater_profile_id_fkey"
      columns: ["rater_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_performance_ratings_subject_profile_id_fkey"
      columns: ["subject_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_professions": {
                  Row: {
                    "created_at": string,"evidence_url": string | null,"notes": string | null,"profession_id": string,"profile_id": string,"status": Database["public"]['Enums']["profession_verification_status"],"updated_at": string,"verified_at": string | null,"verified_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evidence_url"?: string | null,"notes"?: string | null,"profession_id": string,"profile_id": string,"status"?: Database["public"]['Enums']["profession_verification_status"],"updated_at"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"evidence_url"?: string | null,"notes"?: string | null,"profession_id"?: string,"profile_id"?: string,"status"?: Database["public"]['Enums']["profession_verification_status"],"updated_at"?: string,"verified_at"?: string | null,"verified_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_professions_profession_id_fkey"
      columns: ["profession_id"]
isOneToOne: false
      referencedRelation: "professions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_professions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_professions_verified_by_fkey"
      columns: ["verified_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_score_history": {
                  Row: {
                    "cause": string,"created_at": string,"evidence_root": string | null,"id": string,"model_version": string,"new_confidence": string | null,"new_contributions": number | null,"new_overall": number | null,"previous_confidence": string | null,"previous_contributions": number | null,"previous_overall": number | null,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cause": string,"created_at"?: string,"evidence_root"?: string | null,"id"?: string,"model_version": string,"new_confidence"?: string | null,"new_contributions"?: number | null,"new_overall"?: number | null,"previous_confidence"?: string | null,"previous_contributions"?: number | null,"previous_overall"?: number | null,"profile_id": string
                  }
                  Update: {
                    "cause"?: string,"created_at"?: string,"evidence_root"?: string | null,"id"?: string,"model_version"?: string,"new_confidence"?: string | null,"new_contributions"?: number | null,"new_overall"?: number | null,"previous_confidence"?: string | null,"previous_contributions"?: number | null,"previous_overall"?: number | null,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_score_history_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_score_snapshots": {
                  Row: {
                    "computed_at": string,"profile_id": string,"score": number,"snapshot": NonNullable<Json>,"tier": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "computed_at"?: string,"profile_id": string,"score": number,"snapshot"?: NonNullable<Json>,"tier"?: string | null
                  }
                  Update: {
                    "computed_at"?: string,"profile_id"?: string,"score"?: number,"snapshot"?: NonNullable<Json>,"tier"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_score_snapshots_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_skills_entries": {
                  Row: {
                    "created_at": string,"hard_skill_names": (string)[],"id": string,"profile_id": string,"skill_names": (string)[],"soft_skill_names": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"hard_skill_names"?: (string)[],"id"?: string,"profile_id": string,"skill_names"?: (string)[],"soft_skill_names"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"hard_skill_names"?: (string)[],"id"?: string,"profile_id"?: string,"skill_names"?: (string)[],"soft_skill_names"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_skills_entries_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_training_entries": {
                  Row: {
                    "created_at": string,"id": string,"profile_id": string,"training_names": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"profile_id": string,"training_names"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"profile_id"?: string,"training_names"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_training_entries_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "active_citizen_since": string | null,"avatar_url": string | null,"bio": string | null,"citizen_signing_key_algorithm": string | null,"citizen_signing_key_registered_at": string | null,"citizen_signing_public_key": string | null,"citizenship_acceptance_mode": string | null,"citizenship_accepted_at": string | null,"citizenship_review_cleared_at": string | null,"citizenship_status": Database["public"]['Enums']["citizenship_status"],"city": string | null,"civic_framework_accepted_at": string | null,"country": string | null,"country_code": string | null,"created_at": string,"custom_permissions": (Database["public"]['Enums']["app_permission"])[],"date_of_birth": string | null,"deleted_at": string | null,"deletion_reason": string | null,"denied_permissions": (Database["public"]['Enums']["app_permission"])[],"experience_level": string,"full_name": string | null,"full_name_change_count": number,"full_name_last_changed_at": string | null,"governance_eligible_at": string | null,"granted_permissions": (Database["public"]['Enums']["app_permission"])[],"id": string,"is_active_citizen": boolean,"is_admin": boolean | null,"is_governance_eligible": boolean,"is_system_agent": boolean,"is_verified": boolean | null,"language_code": string,"last_active_at": string | null,"messaging_backup_note": string | null,"messaging_backup_provider": string | null,"messaging_server_retention_days": number | null,"messaging_server_retention_max_kb": number | null,"messaging_x25519_public_key": string | null,"notification_email_digest": boolean,"official_id": string,"phone_country_code": string | null,"phone_e164": string | null,"phone_number": string | null,"place_of_birth": string | null,"privacy_settings": NonNullable<Json>,"region_code": string | null,"role": Database["public"]['Enums']["app_role"],"sex": string | null,"social_security_number": string,"terms_acceptance_method": string | null,"terms_accepted_at": string | null,"terms_version": string | null,"updated_at": string,"user_id": string | null,"username": string | null,"username_last_changed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active_citizen_since"?: string | null,"avatar_url"?: string | null,"bio"?: string | null,"citizen_signing_key_algorithm"?: string | null,"citizen_signing_key_registered_at"?: string | null,"citizen_signing_public_key"?: string | null,"citizenship_acceptance_mode"?: string | null,"citizenship_accepted_at"?: string | null,"citizenship_review_cleared_at"?: string | null,"citizenship_status"?: Database["public"]['Enums']["citizenship_status"],"city"?: string | null,"civic_framework_accepted_at"?: string | null,"country"?: string | null,"country_code"?: string | null,"created_at"?: string,"custom_permissions"?: (Database["public"]['Enums']["app_permission"])[],"date_of_birth"?: string | null,"deleted_at"?: string | null,"deletion_reason"?: string | null,"denied_permissions"?: (Database["public"]['Enums']["app_permission"])[],"experience_level"?: string,"full_name"?: string | null,"full_name_change_count"?: number,"full_name_last_changed_at"?: string | null,"governance_eligible_at"?: string | null,"granted_permissions"?: (Database["public"]['Enums']["app_permission"])[],"id"?: string,"is_active_citizen"?: boolean,"is_admin"?: boolean | null,"is_governance_eligible"?: boolean,"is_system_agent"?: boolean,"is_verified"?: boolean | null,"language_code"?: string,"last_active_at"?: string | null,"messaging_backup_note"?: string | null,"messaging_backup_provider"?: string | null,"messaging_server_retention_days"?: number | null,"messaging_server_retention_max_kb"?: number | null,"messaging_x25519_public_key"?: string | null,"notification_email_digest"?: boolean,"official_id": string,"phone_country_code"?: string | null,"phone_e164"?: string | null,"phone_number"?: string | null,"place_of_birth"?: string | null,"privacy_settings"?: NonNullable<Json>,"region_code"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"sex"?: string | null,"social_security_number": string,"terms_acceptance_method"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: string | null,"updated_at"?: string,"user_id"?: string | null,"username"?: string | null,"username_last_changed_at"?: string | null
                  }
                  Update: {
                    "active_citizen_since"?: string | null,"avatar_url"?: string | null,"bio"?: string | null,"citizen_signing_key_algorithm"?: string | null,"citizen_signing_key_registered_at"?: string | null,"citizen_signing_public_key"?: string | null,"citizenship_acceptance_mode"?: string | null,"citizenship_accepted_at"?: string | null,"citizenship_review_cleared_at"?: string | null,"citizenship_status"?: Database["public"]['Enums']["citizenship_status"],"city"?: string | null,"civic_framework_accepted_at"?: string | null,"country"?: string | null,"country_code"?: string | null,"created_at"?: string,"custom_permissions"?: (Database["public"]['Enums']["app_permission"])[],"date_of_birth"?: string | null,"deleted_at"?: string | null,"deletion_reason"?: string | null,"denied_permissions"?: (Database["public"]['Enums']["app_permission"])[],"experience_level"?: string,"full_name"?: string | null,"full_name_change_count"?: number,"full_name_last_changed_at"?: string | null,"governance_eligible_at"?: string | null,"granted_permissions"?: (Database["public"]['Enums']["app_permission"])[],"id"?: string,"is_active_citizen"?: boolean,"is_admin"?: boolean | null,"is_governance_eligible"?: boolean,"is_system_agent"?: boolean,"is_verified"?: boolean | null,"language_code"?: string,"last_active_at"?: string | null,"messaging_backup_note"?: string | null,"messaging_backup_provider"?: string | null,"messaging_server_retention_days"?: number | null,"messaging_server_retention_max_kb"?: number | null,"messaging_x25519_public_key"?: string | null,"notification_email_digest"?: boolean,"official_id"?: string,"phone_country_code"?: string | null,"phone_e164"?: string | null,"phone_number"?: string | null,"place_of_birth"?: string | null,"privacy_settings"?: NonNullable<Json>,"region_code"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"sex"?: string | null,"social_security_number"?: string,"terms_acceptance_method"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: string | null,"updated_at"?: string,"user_id"?: string | null,"username"?: string | null,"username_last_changed_at"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"project_budgets": {
                  Row: {
                    "approval_reason": string | null,"approved_at": string | null,"approved_by": string | null,"created_at": string,"created_by": string | null,"currency": string,"id": string,"internal_notes": string | null,"is_demonstration": boolean,"lifecycle_status": string,"name": string,"period_end": string | null,"period_start": string | null,"publication_note": string | null,"published_at": string | null,"published_by": string | null,"purpose": string | null,"submitted_at": string | null,"submitted_by": string | null,"supersedes_budget_id": string | null,"updated_at": string,"updated_by": string | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "approval_reason"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"id"?: string,"internal_notes"?: string | null,"is_demonstration"?: boolean,"lifecycle_status"?: string,"name": string,"period_end"?: string | null,"period_start"?: string | null,"publication_note"?: string | null,"published_at"?: string | null,"published_by"?: string | null,"purpose"?: string | null,"submitted_at"?: string | null,"submitted_by"?: string | null,"supersedes_budget_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Update: {
                    "approval_reason"?: string | null,"approved_at"?: string | null,"approved_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"currency"?: string,"id"?: string,"internal_notes"?: string | null,"is_demonstration"?: boolean,"lifecycle_status"?: string,"name"?: string,"period_end"?: string | null,"period_start"?: string | null,"publication_note"?: string | null,"published_at"?: string | null,"published_by"?: string | null,"purpose"?: string | null,"submitted_at"?: string | null,"submitted_by"?: string | null,"supersedes_budget_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_budgets_supersedes_budget_id_fkey"
      columns: ["supersedes_budget_id"]
isOneToOne: false
      referencedRelation: "project_budgets"
      referencedColumns: ["id"]
    }
                  ]
                },"push_dispatch_config": {
                  Row: {
                    "dispatch_secret": string | null,"function_url": string | null,"id": boolean,"updated_at": string,"vapid_private_key": string | null,"vapid_public_key": string | null,"vapid_subject": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "dispatch_secret"?: string | null,"function_url"?: string | null,"id"?: boolean,"updated_at"?: string,"vapid_private_key"?: string | null,"vapid_public_key"?: string | null,"vapid_subject"?: string | null
                  }
                  Update: {
                    "dispatch_secret"?: string | null,"function_url"?: string | null,"id"?: boolean,"updated_at"?: string,"vapid_private_key"?: string | null,"vapid_public_key"?: string | null,"vapid_subject"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"last_seen_at": string,"p256dh": string,"profile_id": string,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"last_seen_at"?: string,"p256dh": string,"profile_id": string,"user_agent"?: string | null
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"last_seen_at"?: string,"p256dh"?: string,"profile_id"?: string,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "admin_notes": string | null,"created_at": string,"endorsement_id": string | null,"id": string,"reason": string,"report_context": Json | null,"reported_user_id": string | null,"reporter_id": string,"resolved_at": string | null,"status": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_notes"?: string | null,"created_at"?: string,"endorsement_id"?: string | null,"id"?: string,"reason": string,"report_context"?: Json | null,"reported_user_id"?: string | null,"reporter_id": string,"resolved_at"?: string | null,"status"?: string | null
                  }
                  Update: {
                    "admin_notes"?: string | null,"created_at"?: string,"endorsement_id"?: string | null,"id"?: string,"reason"?: string,"report_context"?: Json | null,"reported_user_id"?: string | null,"reporter_id"?: string,"resolved_at"?: string | null,"status"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_endorsement_id_fkey"
      columns: ["endorsement_id"]
isOneToOne: false
      referencedRelation: "endorsements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reported_user_id_fkey"
      columns: ["reported_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"role_permissions": {
                  Row: {
                    "created_at": string,"permission": Database["public"]['Enums']["app_permission"],"role": Database["public"]['Enums']["app_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"permission": Database["public"]['Enums']["app_permission"],"role": Database["public"]['Enums']["app_role"]
                  }
                  Update: {
                    "created_at"?: string,"permission"?: Database["public"]['Enums']["app_permission"],"role"?: Database["public"]['Enums']["app_role"]
                  }
                  Relationships: [
                    
                  ]
                },"social_account_connections": {
                  Row: {
                    "access_token": string | null,"connected_by_profile_id": string | null,"created_at": string,"expires_at": string | null,"external_account_id": string | null,"external_account_name": string | null,"id": string,"last_error": string | null,"org_profile_id": string,"provider": string,"refresh_token": string | null,"status": string,"token_scopes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_token"?: string | null,"connected_by_profile_id"?: string | null,"created_at"?: string,"expires_at"?: string | null,"external_account_id"?: string | null,"external_account_name"?: string | null,"id"?: string,"last_error"?: string | null,"org_profile_id": string,"provider": string,"refresh_token"?: string | null,"status"?: string,"token_scopes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "access_token"?: string | null,"connected_by_profile_id"?: string | null,"created_at"?: string,"expires_at"?: string | null,"external_account_id"?: string | null,"external_account_name"?: string | null,"id"?: string,"last_error"?: string | null,"org_profile_id"?: string,"provider"?: string,"refresh_token"?: string | null,"status"?: string,"token_scopes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "social_account_connections_connected_by_profile_id_fkey"
      columns: ["connected_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "social_account_connections_org_profile_id_fkey"
      columns: ["org_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"social_crossposts": {
                  Row: {
                    "created_at": string,"error_message": string | null,"external_post_id": string | null,"id": string,"org_profile_id": string,"post_id": string,"provider": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"error_message"?: string | null,"external_post_id"?: string | null,"id"?: string,"org_profile_id": string,"post_id": string,"provider": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"error_message"?: string | null,"external_post_id"?: string | null,"id"?: string,"org_profile_id"?: string,"post_id"?: string,"provider"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "social_crossposts_org_profile_id_fkey"
      columns: ["org_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "social_crossposts_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "posts"
      referencedColumns: ["id"]
    }
                  ]
                },"social_oauth_states": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"profile_id": string,"provider": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"profile_id": string,"provider": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"profile_id"?: string,"provider"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "social_oauth_states_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"solution_authorities": {
                  Row: {
                    "created_at": string,"id": string,"keywords": (string)[],"name": string,"related_profession_ids": (string)[],"responsibilities": string,"sort_order": number,"tier": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"keywords"?: (string)[],"name": string,"related_profession_ids"?: (string)[],"responsibilities": string,"sort_order"?: number,"tier": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"keywords"?: (string)[],"name"?: string,"related_profession_ids"?: (string)[],"responsibilities"?: string,"sort_order"?: number,"tier"?: string
                  }
                  Relationships: [
                    
                  ]
                },"solution_comments": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"problem_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"id"?: string,"problem_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"problem_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solution_comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_comments_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "solution_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"solution_problems": {
                  Row: {
                    "agreed_proposal_id": string | null,"assignee_profile_id": string | null,"author_id": string,"authority_id": string | null,"body": string,"category_confidence": number | null,"category_keywords": (string)[],"created_at": string,"current_round": number,"id": string,"matter_id": string | null,"max_rounds": number,"mode": string,"routing_note": string | null,"status": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agreed_proposal_id"?: string | null,"assignee_profile_id"?: string | null,"author_id": string,"authority_id"?: string | null,"body": string,"category_confidence"?: number | null,"category_keywords"?: (string)[],"created_at"?: string,"current_round"?: number,"id"?: string,"matter_id"?: string | null,"max_rounds"?: number,"mode"?: string,"routing_note"?: string | null,"status"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "agreed_proposal_id"?: string | null,"assignee_profile_id"?: string | null,"author_id"?: string,"authority_id"?: string | null,"body"?: string,"category_confidence"?: number | null,"category_keywords"?: (string)[],"created_at"?: string,"current_round"?: number,"id"?: string,"matter_id"?: string | null,"max_rounds"?: number,"mode"?: string,"routing_note"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solution_problems_agreed_proposal_fk"
      columns: ["agreed_proposal_id"]
isOneToOne: false
      referencedRelation: "solution_proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_problems_assignee_profile_id_fkey"
      columns: ["assignee_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_problems_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_problems_authority_id_fkey"
      columns: ["authority_id"]
isOneToOne: false
      referencedRelation: "solution_authorities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_problems_matter_id_fkey"
      columns: ["matter_id"]
isOneToOne: false
      referencedRelation: "matters"
      referencedColumns: ["id"]
    }
                  ]
                },"solution_proposal_endorsements": {
                  Row: {
                    "created_at": string,"profile_id": string,"proposal_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"profile_id": string,"proposal_id": string
                  }
                  Update: {
                    "created_at"?: string,"profile_id"?: string,"proposal_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solution_proposal_endorsements_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_proposal_endorsements_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "solution_proposals"
      referencedColumns: ["id"]
    }
                  ]
                },"solution_proposals": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"problem_id": string,"source": string,"supporting_speakers": (string)[],"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"problem_id": string,"source": string,"supporting_speakers"?: (string)[],"title": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"problem_id"?: string,"source"?: string,"supporting_speakers"?: (string)[],"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solution_proposals_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "solution_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"solution_records": {
                  Row: {
                    "challenge_id": string,"contributors": string | null,"created_at": string,"evidence": string | null,"id": string,"implementation_summary": string,"implemented_solution": string,"knowledge_resource_id": string | null,"knowledge_space_id": string | null,"lessons_learned": string | null,"outcome": string,"problem_context": string,"program_id": string,"project_id": string | null,"publisher_profile_id": string,"reuse_notes": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "challenge_id": string,"contributors"?: string | null,"created_at"?: string,"evidence"?: string | null,"id"?: string,"implementation_summary": string,"implemented_solution": string,"knowledge_resource_id"?: string | null,"knowledge_space_id"?: string | null,"lessons_learned"?: string | null,"outcome": string,"problem_context": string,"program_id": string,"project_id"?: string | null,"publisher_profile_id": string,"reuse_notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "challenge_id"?: string,"contributors"?: string | null,"created_at"?: string,"evidence"?: string | null,"id"?: string,"implementation_summary"?: string,"implemented_solution"?: string,"knowledge_resource_id"?: string | null,"knowledge_space_id"?: string | null,"lessons_learned"?: string | null,"outcome"?: string,"problem_context"?: string,"program_id"?: string,"project_id"?: string | null,"publisher_profile_id"?: string,"reuse_notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solution_records_challenge_id_fkey"
      columns: ["challenge_id"]
isOneToOne: true
      referencedRelation: "community_challenges"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_records_knowledge_resource_id_fkey"
      columns: ["knowledge_resource_id"]
isOneToOne: false
      referencedRelation: "knowledge_resources"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_records_knowledge_space_id_fkey"
      columns: ["knowledge_space_id"]
isOneToOne: false
      referencedRelation: "knowledge_spaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_records_program_id_fkey"
      columns: ["program_id"]
isOneToOne: false
      referencedRelation: "contribution_programs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_records_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "implementation_projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_records_publisher_profile_id_fkey"
      columns: ["publisher_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"solution_routing_events": {
                  Row: {
                    "actor_profile_id": string | null,"created_at": string,"from_status": string | null,"id": string,"note": string | null,"problem_id": string,"to_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: string,"note"?: string | null,"problem_id": string,"to_status": string
                  }
                  Update: {
                    "actor_profile_id"?: string | null,"created_at"?: string,"from_status"?: string | null,"id"?: string,"note"?: string | null,"problem_id"?: string,"to_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solution_routing_events_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_routing_events_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "solution_problems"
      referencedColumns: ["id"]
    }
                  ]
                },"solution_turns": {
                  Row: {
                    "content": string,"created_at": string,"id": string,"problem_id": string,"round": number,"speaker": string,"speaker_profile_id": string | null,"stance": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "content": string,"created_at"?: string,"id"?: string,"problem_id": string,"round"?: number,"speaker": string,"speaker_profile_id"?: string | null,"stance"?: NonNullable<Json>
                  }
                  Update: {
                    "content"?: string,"created_at"?: string,"id"?: string,"problem_id"?: string,"round"?: number,"speaker"?: string,"speaker_profile_id"?: string | null,"stance"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "solution_turns_problem_id_fkey"
      columns: ["problem_id"]
isOneToOne: false
      referencedRelation: "solution_problems"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "solution_turns_speaker_profile_id_fkey"
      columns: ["speaker_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"specialist_discussion_sessions": {
                  Row: {
                    "created_at": string,"id": string,"profile_id": string,"title": string,"turns_json": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id": string,"profile_id": string,"title"?: string,"turns_json"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"profile_id"?: string,"title"?: string,"turns_json"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "specialist_discussion_sessions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"specialist_discussion_turns": {
                  Row: {
                    "confidence": number,"created_at": string,"final_suggestion": string,"id": string,"lead_specialist_id": string,"matched_keywords": (string)[],"matched_specialist_ids": (string)[],"mode": string,"opinion_summaries": NonNullable<Json>,"profile_id": string,"request_text": string,"risk_level": string,"session_id": string,"turn_created_at": string,"turn_payload": NonNullable<Json>,"urgency": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confidence": number,"created_at"?: string,"final_suggestion": string,"id": string,"lead_specialist_id": string,"matched_keywords"?: (string)[],"matched_specialist_ids"?: (string)[],"mode": string,"opinion_summaries"?: NonNullable<Json>,"profile_id": string,"request_text": string,"risk_level": string,"session_id": string,"turn_created_at": string,"turn_payload"?: NonNullable<Json>,"urgency": string
                  }
                  Update: {
                    "confidence"?: number,"created_at"?: string,"final_suggestion"?: string,"id"?: string,"lead_specialist_id"?: string,"matched_keywords"?: (string)[],"matched_specialist_ids"?: (string)[],"mode"?: string,"opinion_summaries"?: NonNullable<Json>,"profile_id"?: string,"request_text"?: string,"risk_level"?: string,"session_id"?: string,"turn_created_at"?: string,"turn_payload"?: NonNullable<Json>,"urgency"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "specialist_discussion_turns_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "specialist_discussion_turns_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "specialist_discussion_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"study_bookmarks": {
                  Row: {
                    "created_at": string,"document_key": string,"id": string,"notes": string | null,"profile_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"document_key": string,"id"?: string,"notes"?: string | null,"profile_id": string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"document_key"?: string,"id"?: string,"notes"?: string | null,"profile_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_bookmarks_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"study_certifications": {
                  Row: {
                    "certification_key": string,"created_at": string,"earned_at": string | null,"id": string,"metadata": NonNullable<Json>,"profile_id": string,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "certification_key": string,"created_at"?: string,"earned_at"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"profile_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "certification_key"?: string,"created_at"?: string,"earned_at"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"profile_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_certifications_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"study_progress": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"document_key": string,"id": string,"last_read_at": string,"profile_id": string,"progress_percent": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"document_key": string,"id"?: string,"last_read_at"?: string,"profile_id": string,"progress_percent"?: number,"updated_at"?: string
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"document_key"?: string,"id"?: string,"last_read_at"?: string,"profile_id"?: string,"progress_percent"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "study_progress_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"systemic_issue_candidates": {
                  Row: {
                    "created_at": string,"domain": string,"evidence_periods": number,"factor_category": string | null,"id": string,"pattern_model_version": string,"privacy_policy_version": string,"scope_id": string,"status": string,"summary": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"domain": string,"evidence_periods"?: number,"factor_category"?: string | null,"id"?: string,"pattern_model_version"?: string,"privacy_policy_version": string,"scope_id": string,"status"?: string,"summary": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"domain"?: string,"evidence_periods"?: number,"factor_category"?: string | null,"id"?: string,"pattern_model_version"?: string,"privacy_policy_version"?: string,"scope_id"?: string,"status"?: string,"summary"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "systemic_issue_candidates_scope_id_fkey"
      columns: ["scope_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_scopes"
      referencedColumns: ["id"]
    }
                  ]
                },"systemic_issue_evidence": {
                  Row: {
                    "candidate_id": string,"created_at": string,"id": string,"snapshot_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"id"?: string,"snapshot_id": string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"id"?: string,"snapshot_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "systemic_issue_evidence_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "systemic_issue_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "systemic_issue_evidence_snapshot_id_fkey"
      columns: ["snapshot_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_snapshots"
      referencedColumns: ["id"]
    }
                  ]
                },"task_assignments": {
                  Row: {
                    "acceptance_status": string,"accepted_at": string | null,"actor_agent_id": string | null,"actor_kind": string,"actor_profile_id": string | null,"actor_unit_label": string | null,"assigned_at": string,"assigned_by_kind": string,"assigned_by_profile_id": string,"decline_reason": string | null,"declined_at": string | null,"id": string,"role": string,"suggestion_reason": string | null,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acceptance_status"?: string,"accepted_at"?: string | null,"actor_agent_id"?: string | null,"actor_kind": string,"actor_profile_id"?: string | null,"actor_unit_label"?: string | null,"assigned_at"?: string,"assigned_by_kind": string,"assigned_by_profile_id": string,"decline_reason"?: string | null,"declined_at"?: string | null,"id"?: string,"role": string,"suggestion_reason"?: string | null,"task_id": string
                  }
                  Update: {
                    "acceptance_status"?: string,"accepted_at"?: string | null,"actor_agent_id"?: string | null,"actor_kind"?: string,"actor_profile_id"?: string | null,"actor_unit_label"?: string | null,"assigned_at"?: string,"assigned_by_kind"?: string,"assigned_by_profile_id"?: string,"decline_reason"?: string | null,"declined_at"?: string | null,"id"?: string,"role"?: string,"suggestion_reason"?: string | null,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_assignments_actor_agent_id_fkey"
      columns: ["actor_agent_id"]
isOneToOne: false
      referencedRelation: "ai_agents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_assignments_actor_profile_id_fkey"
      columns: ["actor_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_assignments_assigned_by_profile_id_fkey"
      columns: ["assigned_by_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_assignments_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"task_dependencies": {
                  Row: {
                    "created_at": string,"depends_on_task_id": string,"id": string,"kind": string,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"depends_on_task_id": string,"id"?: string,"kind"?: string,"task_id": string
                  }
                  Update: {
                    "created_at"?: string,"depends_on_task_id"?: string,"id"?: string,"kind"?: string,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_dependencies_depends_on_task_id_fkey"
      columns: ["depends_on_task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_dependencies_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "collaboration_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"user_notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"entity_id": string | null,"entity_type": string | null,"id": string,"metadata": NonNullable<Json>,"notification_type": string,"read_at": string | null,"recipient_profile_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"notification_type": string,"read_at"?: string | null,"recipient_profile_id": string,"title": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"entity_id"?: string | null,"entity_type"?: string | null,"id"?: string,"metadata"?: NonNullable<Json>,"notification_type"?: string,"read_at"?: string | null,"recipient_profile_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_notifications_recipient_profile_id_fkey"
      columns: ["recipient_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wellbeing_aggregate_audit": {
                  Row: {
                    "aggregation_model_version": string,"created_at": string,"fingerprint": string,"id": string,"privacy_policy_version": string,"requester_profile_id": string,"scope_id": string | null,"suppression": string | null,"time_bucket": string | null,"topic": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aggregation_model_version": string,"created_at"?: string,"fingerprint": string,"id"?: string,"privacy_policy_version": string,"requester_profile_id": string,"scope_id"?: string | null,"suppression"?: string | null,"time_bucket"?: string | null,"topic"?: string | null
                  }
                  Update: {
                    "aggregation_model_version"?: string,"created_at"?: string,"fingerprint"?: string,"id"?: string,"privacy_policy_version"?: string,"requester_profile_id"?: string,"scope_id"?: string | null,"suppression"?: string | null,"time_bucket"?: string | null,"topic"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "wellbeing_aggregate_audit_requester_profile_id_fkey"
      columns: ["requester_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wellbeing_aggregate_audit_scope_id_fkey"
      columns: ["scope_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_scopes"
      referencedColumns: ["id"]
    }
                  ]
                },"wellbeing_aggregate_dimensions": {
                  Row: {
                    "classification": string,"compatible_with": (string)[],"id": string,"min_cohort_override": number | null,"notes": string | null,"sensitivity": string
                  }
                  ComputedFields: never
                  Insert: {
                    "classification": string,"compatible_with"?: (string)[],"id": string,"min_cohort_override"?: number | null,"notes"?: string | null,"sensitivity": string
                  }
                  Update: {
                    "classification"?: string,"compatible_with"?: (string)[],"id"?: string,"min_cohort_override"?: number | null,"notes"?: string | null,"sensitivity"?: string
                  }
                  Relationships: [
                    
                  ]
                },"wellbeing_aggregate_participation": {
                  Row: {
                    "created_at": string,"disabled_at": string | null,"enabled": boolean,"enabled_at": string | null,"policy_version": string,"profile_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"disabled_at"?: string | null,"enabled"?: boolean,"enabled_at"?: string | null,"policy_version"?: string,"profile_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"disabled_at"?: string | null,"enabled"?: boolean,"enabled_at"?: string | null,"policy_version"?: string,"profile_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wellbeing_aggregate_participation_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wellbeing_aggregate_policies": {
                  Row: {
                    "config": NonNullable<Json>,"created_at": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "config": NonNullable<Json>,"created_at"?: string,"version": string
                  }
                  Update: {
                    "config"?: NonNullable<Json>,"created_at"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"wellbeing_aggregate_scope_membership": {
                  Row: {
                    "created_at": string,"profile_id": string,"scope_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"profile_id": string,"scope_id": string
                  }
                  Update: {
                    "created_at"?: string,"profile_id"?: string,"scope_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wellbeing_aggregate_scope_membership_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wellbeing_aggregate_scope_membership_scope_id_fkey"
      columns: ["scope_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_scopes"
      referencedColumns: ["id"]
    }
                  ]
                },"wellbeing_aggregate_scopes": {
                  Row: {
                    "created_at": string,"enabled": boolean,"entity_ref": string,"id": string,"kind": string,"label": string | null,"updated_at": string,"viewer_profile_ids": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"enabled"?: boolean,"entity_ref": string,"id"?: string,"kind": string,"label"?: string | null,"updated_at"?: string,"viewer_profile_ids"?: (string)[]
                  }
                  Update: {
                    "created_at"?: string,"enabled"?: boolean,"entity_ref"?: string,"id"?: string,"kind"?: string,"label"?: string | null,"updated_at"?: string,"viewer_profile_ids"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"wellbeing_aggregate_snapshots": {
                  Row: {
                    "aggregation_model_version": string,"created_at": string,"fingerprint": string,"id": string,"period_start": string,"privacy_policy_version": string,"result": NonNullable<Json>,"scope_id": string,"suppression": string | null,"time_bucket": string,"topic": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aggregation_model_version": string,"created_at"?: string,"fingerprint": string,"id"?: string,"period_start": string,"privacy_policy_version": string,"result": NonNullable<Json>,"scope_id": string,"suppression"?: string | null,"time_bucket": string,"topic": string
                  }
                  Update: {
                    "aggregation_model_version"?: string,"created_at"?: string,"fingerprint"?: string,"id"?: string,"period_start"?: string,"privacy_policy_version"?: string,"result"?: NonNullable<Json>,"scope_id"?: string,"suppression"?: string | null,"time_bucket"?: string,"topic"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wellbeing_aggregate_snapshots_scope_id_fkey"
      columns: ["scope_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_scopes"
      referencedColumns: ["id"]
    }
                  ]
                },"wellbeing_insight_actions": {
                  Row: {
                    "action_type": string,"candidate_id": string | null,"created_at": string,"created_by": string,"id": string,"related_entity_id": string | null,"related_entity_type": string | null,"scope_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_type": string,"candidate_id"?: string | null,"created_at"?: string,"created_by": string,"id"?: string,"related_entity_id"?: string | null,"related_entity_type"?: string | null,"scope_id": string
                  }
                  Update: {
                    "action_type"?: string,"candidate_id"?: string | null,"created_at"?: string,"created_by"?: string,"id"?: string,"related_entity_id"?: string | null,"related_entity_type"?: string | null,"scope_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wellbeing_insight_actions_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "systemic_issue_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wellbeing_insight_actions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wellbeing_insight_actions_scope_id_fkey"
      columns: ["scope_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_scopes"
      referencedColumns: ["id"]
    }
                  ]
                },"wellbeing_insight_links": {
                  Row: {
                    "candidate_id": string,"created_at": string,"created_by": string,"entity_id": string,"entity_type": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"created_by": string,"entity_id": string,"entity_type": string,"id"?: string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"created_by"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wellbeing_insight_links_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "systemic_issue_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wellbeing_insight_links_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wellbeing_insight_reviews": {
                  Row: {
                    "candidate_id": string | null,"created_at": string,"id": string,"note": string | null,"reviewer_profile_id": string,"scope_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "candidate_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string | null,"reviewer_profile_id": string,"scope_id": string,"status": string
                  }
                  Update: {
                    "candidate_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string | null,"reviewer_profile_id"?: string,"scope_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wellbeing_insight_reviews_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "systemic_issue_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wellbeing_insight_reviews_reviewer_profile_id_fkey"
      columns: ["reviewer_profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wellbeing_insight_reviews_scope_id_fkey"
      columns: ["scope_id"]
isOneToOne: false
      referencedRelation: "wellbeing_aggregate_scopes"
      referencedColumns: ["id"]
    }
                  ]
                },"work_assessments": {
                  Row: {
                    "created_at": string,"dimensions": NonNullable<Json>,"id": string,"model_version": string,"profile_id": string,"work_context_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"dimensions"?: NonNullable<Json>,"id"?: string,"model_version"?: string,"profile_id": string,"work_context_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"dimensions"?: NonNullable<Json>,"id"?: string,"model_version"?: string,"profile_id"?: string,"work_context_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_assessments_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_assessments_work_context_id_fkey"
      columns: ["work_context_id"]
isOneToOne: false
      referencedRelation: "work_contexts"
      referencedColumns: ["id"]
    }
                  ]
                },"work_contexts": {
                  Row: {
                    "created_at": string,"description": string | null,"hours_pattern": string | null,"id": string,"is_primary": boolean,"location_mode": string | null,"organization_or_context": string | null,"profile_id": string,"role_title": string,"start_date": string | null,"status": string,"updated_at": string,"work_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"hours_pattern"?: string | null,"id"?: string,"is_primary"?: boolean,"location_mode"?: string | null,"organization_or_context"?: string | null,"profile_id": string,"role_title": string,"start_date"?: string | null,"status"?: string,"updated_at"?: string,"work_type": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"hours_pattern"?: string | null,"id"?: string,"is_primary"?: boolean,"location_mode"?: string | null,"organization_or_context"?: string | null,"profile_id"?: string,"role_title"?: string,"start_date"?: string | null,"status"?: string,"updated_at"?: string,"work_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_contexts_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_explorations": {
                  Row: {
                    "alignment": string,"created_at": string,"id": string,"occupation_note": string | null,"profile_id": string,"template_id": string | null,"things_to_explore": NonNullable<Json>,"title": string,"why_may_fit": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "alignment": string,"created_at"?: string,"id"?: string,"occupation_note"?: string | null,"profile_id": string,"template_id"?: string | null,"things_to_explore"?: NonNullable<Json>,"title": string,"why_may_fit"?: NonNullable<Json>
                  }
                  Update: {
                    "alignment"?: string,"created_at"?: string,"id"?: string,"occupation_note"?: string | null,"profile_id"?: string,"template_id"?: string | null,"things_to_explore"?: NonNullable<Json>,"title"?: string,"why_may_fit"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_explorations_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_fulfillment_profiles": {
                  Row: {
                    "autonomy": NonNullable<Json>,"created_at": string,"current_role_note": string | null,"enjoyment": NonNullable<Json>,"environment_preferences": NonNullable<Json>,"lifestyle_fit": NonNullable<Json>,"profile_id": string,"purpose_fit": NonNullable<Json>,"updated_at": string,"values": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "autonomy"?: NonNullable<Json>,"created_at"?: string,"current_role_note"?: string | null,"enjoyment"?: NonNullable<Json>,"environment_preferences"?: NonNullable<Json>,"lifestyle_fit"?: NonNullable<Json>,"profile_id": string,"purpose_fit"?: NonNullable<Json>,"updated_at"?: string,"values"?: NonNullable<Json>
                  }
                  Update: {
                    "autonomy"?: NonNullable<Json>,"created_at"?: string,"current_role_note"?: string | null,"enjoyment"?: NonNullable<Json>,"environment_preferences"?: NonNullable<Json>,"lifestyle_fit"?: NonNullable<Json>,"profile_id"?: string,"purpose_fit"?: NonNullable<Json>,"updated_at"?: string,"values"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_fulfillment_profiles_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_interventions": {
                  Row: {
                    "action_id": string | null,"area": string | null,"created_at": string,"desired_change": string | null,"id": string,"ladder_step": string,"profile_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id"?: string | null,"area"?: string | null,"created_at"?: string,"desired_change"?: string | null,"id"?: string,"ladder_step": string,"profile_id": string,"status"?: string
                  }
                  Update: {
                    "action_id"?: string | null,"area"?: string | null,"created_at"?: string,"desired_change"?: string | null,"id"?: string,"ladder_step"?: string,"profile_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_interventions_action_id_fkey"
      columns: ["action_id"]
isOneToOne: false
      referencedRelation: "happiness_actions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_interventions_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_joy_entries": {
                  Row: {
                    "activity": string | null,"activity_tags": NonNullable<Json>,"context_note": string | null,"created_at": string,"feeling": string,"id": string,"model_version": string,"note": string | null,"profile_id": string,"project": string | null,"task_tag": string | null,"work_context_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity"?: string | null,"activity_tags"?: NonNullable<Json>,"context_note"?: string | null,"created_at"?: string,"feeling": string,"id"?: string,"model_version"?: string,"note"?: string | null,"profile_id": string,"project"?: string | null,"task_tag"?: string | null,"work_context_id"?: string | null
                  }
                  Update: {
                    "activity"?: string | null,"activity_tags"?: NonNullable<Json>,"context_note"?: string | null,"created_at"?: string,"feeling"?: string,"id"?: string,"model_version"?: string,"note"?: string | null,"profile_id"?: string,"project"?: string | null,"task_tag"?: string | null,"work_context_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_joy_entries_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_joy_entries_work_context_fk"
      columns: ["work_context_id"]
isOneToOne: false
      referencedRelation: "work_contexts"
      referencedColumns: ["id"]
    }
                  ]
                },"work_recommendation_feedback": {
                  Row: {
                    "created_at": string,"feedback": string,"id": string,"profile_id": string,"recommendation_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback": string,"id"?: string,"profile_id": string,"recommendation_id": string
                  }
                  Update: {
                    "created_at"?: string,"feedback"?: string,"id"?: string,"profile_id"?: string,"recommendation_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_recommendation_feedback_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_shareable_preferences": {
                  Row: {
                    "activities_sought": NonNullable<Json>,"approved": boolean,"environment": NonNullable<Json>,"location_mode": string | null,"profile_id": string,"role_types_sought": NonNullable<Json>,"schedule_note": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activities_sought"?: NonNullable<Json>,"approved"?: boolean,"environment"?: NonNullable<Json>,"location_mode"?: string | null,"profile_id": string,"role_types_sought"?: NonNullable<Json>,"schedule_note"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "activities_sought"?: NonNullable<Json>,"approved"?: boolean,"environment"?: NonNullable<Json>,"location_mode"?: string | null,"profile_id"?: string,"role_types_sought"?: NonNullable<Json>,"schedule_note"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_shareable_preferences_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_transition_followups": {
                  Row: {
                    "action_id": string | null,"change_kind": string,"created_at": string,"helped": string | null,"id": string,"note": string | null,"profile_id": string,"transition_path_id": string | null,"work_joy_feeling": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action_id"?: string | null,"change_kind": string,"created_at"?: string,"helped"?: string | null,"id"?: string,"note"?: string | null,"profile_id": string,"transition_path_id"?: string | null,"work_joy_feeling"?: string | null
                  }
                  Update: {
                    "action_id"?: string | null,"change_kind"?: string,"created_at"?: string,"helped"?: string | null,"id"?: string,"note"?: string | null,"profile_id"?: string,"transition_path_id"?: string | null,"work_joy_feeling"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_transition_followups_action_id_fkey"
      columns: ["action_id"]
isOneToOne: false
      referencedRelation: "happiness_actions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_transition_followups_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_transition_followups_transition_path_id_fkey"
      columns: ["transition_path_id"]
isOneToOne: false
      referencedRelation: "work_transition_paths"
      referencedColumns: ["id"]
    }
                  ]
                },"work_transition_paths": {
                  Row: {
                    "already_have": string | null,"created_at": string,"id": string,"need": string | null,"next_step": string | null,"opportunity_path": string | null,"profile_id": string,"status": string,"study_path": string | null,"target": string,"test_path": string | null,"updated_at": string,"why": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "already_have"?: string | null,"created_at"?: string,"id"?: string,"need"?: string | null,"next_step"?: string | null,"opportunity_path"?: string | null,"profile_id": string,"status"?: string,"study_path"?: string | null,"target": string,"test_path"?: string | null,"updated_at"?: string,"why"?: string | null
                  }
                  Update: {
                    "already_have"?: string | null,"created_at"?: string,"id"?: string,"need"?: string | null,"next_step"?: string | null,"opportunity_path"?: string | null,"profile_id"?: string,"status"?: string,"study_path"?: string | null,"target"?: string,"test_path"?: string | null,"updated_at"?: string,"why"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_transition_paths_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"work_trial_links": {
                  Row: {
                    "contribute_path": string,"created_at": string,"exploration_id": string | null,"id": string,"joy_entry_id": string | null,"opportunity_id": string | null,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "contribute_path": string,"created_at"?: string,"exploration_id"?: string | null,"id"?: string,"joy_entry_id"?: string | null,"opportunity_id"?: string | null,"profile_id": string
                  }
                  Update: {
                    "contribute_path"?: string,"created_at"?: string,"exploration_id"?: string | null,"id"?: string,"joy_entry_id"?: string | null,"opportunity_id"?: string | null,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_trial_links_exploration_id_fkey"
      columns: ["exploration_id"]
isOneToOne: false
      referencedRelation: "work_explorations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_trial_links_joy_entry_id_fkey"
      columns: ["joy_entry_id"]
isOneToOne: false
      referencedRelation: "work_joy_entries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_trial_links_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "funding_lane_totals": {
                  Row: {
                    "commitment_count": number | null,"lane": string | null,"status": string | null,"total_amount_usd": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "_dispatch_public_audit_external_execution_page_webhook":
{ Args: { "target_page_id": string }; Returns: undefined
                           },
"accept_civic_framework":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"acknowledge_activation_demographic_feed_worker_escalation_page":
{ Args: { "acknowledgement_notes"?: string,"target_page_id": string }; Returns: string
                           },
"acknowledge_governance_public_audit_external_execution_page":
{ Args: { "acknowledgement_notes"?: string,"target_page_id": string }; Returns: string
                           },
"act_feed_worker_esc_pol_append":
{ Args: { "target_event_message": string,"target_event_type": string,"target_metadata"?: Json,"target_policy_key": string }; Returns: string
                           },
"act_feed_worker_esc_pol_evt_hist":
{ Args: { "max_events"?: number,"requested_lookback_hours"?: number,"requested_policy_key"?: string }; Returns: {
              "actor_name": string,"actor_profile_id": string,"created_at": string,"event_id": string,"event_message": string,"event_type": string,"metadata": Json,"policy_key": string
            }[]
                           },
"activation_demographic_feed_worker_alert_summary":
{ Args: { "requested_freshness_hours"?: number }; Returns: {
              "adapter_id": string,"adapter_key": string,"adapter_name": string,"connectivity_failure_count": number,"country_code": string,"freshness_alert": boolean,"last_ingested_at": string,"latest_run_at": string,"latest_run_message": string,"latest_run_status": Database["public"]['Enums']["activation_demographic_feed_worker_status"],"payload_failure_count": number,"scope_type": Database["public"]['Enums']["activation_scope_type"],"signature_failure_count": number,"stale_by_hours": number
            }[]
                           },
"activation_demographic_feed_worker_escalation_page_board":
{ Args: { "max_pages"?: number,"requested_batch_id"?: string }; Returns: {
              "batch_id": string,"oncall_channel": string,"opened_at": string,"page_id": string,"page_key": string,"page_message": string,"page_status": string,"resolved_at": string,"severity": string
            }[]
                           },
"activation_demographic_feed_worker_escalation_page_history":
{ Args: { "max_pages"?: number,"requested_lookback_hours"?: number }; Returns: {
              "acknowledged_at": string,"batch_id": string,"oncall_channel": string,"opened_at": string,"page_id": string,"page_key": string,"page_message": string,"page_status": string,"resolved_at": string,"severity": string,"updated_at": string
            }[]
                           },
"activation_demographic_feed_worker_escalation_policy_summary":
{ Args: { "requested_policy_key"?: string }; Returns: {
              "escalation_enabled": boolean,"escalation_severity": string,"freshness_hours": number,"metadata": Json,"minimum_adapter_issues_for_escalation": number,"policy_key": string,"policy_name": string,"policy_schema_version": number,"updated_at": string,"updated_by": string,"updated_by_name": string
            }[]
                           },
"activation_demographic_feed_worker_schedule_automation_status":
{ Args: Record<PropertyKey, never>; Returns: {
              "cron_job_active": boolean,"cron_job_command": string,"cron_job_registered": boolean,"cron_job_schedule": string,"cron_schema_available": boolean,"latest_automation_run_finished_at": string,"latest_automation_run_message": string,"latest_automation_run_started_at": string,"latest_automation_run_status": string,"latest_automation_run_trigger_source": string,"latest_cron_run_details": string,"latest_cron_run_finished_at": string,"latest_cron_run_started_at": string,"latest_cron_run_status": string,"latest_scheduled_enqueue_at": string,"latest_scheduled_enqueue_job_id": string,"worker_escalation_latest_opened_at": string,"worker_escalation_latest_page_severity": string,"worker_escalation_open_or_ack_page_count": number
            }[]
                           },
"activation_feed_worker_schedule_automation_run_history":
{ Args: { "p_max_runs"?: number,"p_requested_lookback_hours"?: number }; Returns: {
              "adapter_issue_count": number,"force_reschedule_applied": boolean,"jobs_enqueued_count": number,"open_or_ack_page_count": number,"run_finished_at": string,"run_id": string,"run_message": string,"run_started_at": string,"run_status": string,"trigger_source": string,"triggered_by": string,"triggered_by_name": string
            }[]
                           },
"activation_scope_is_declared":
{ Args: { "requested_country_code"?: string,"requested_scope_type": Database["public"]['Enums']["activation_scope_type"] }; Returns: boolean
                           },
"add_agreement_review_note":
{ Args: { "p_agreement_id": string,"p_body": string }; Returns: undefined
                           },
"add_matter_ai_comment":
{ Args: { "p_assignment_id": string,"p_body": string,"p_run_id"?: string }; Returns: string
                           },
"add_matter_attachment":
{ Args: { "p_body_text"?: string,"p_byte_size"?: number,"p_comment_id"?: string,"p_content_type"?: string,"p_decision_id"?: string,"p_file_name"?: string,"p_file_path"?: string,"p_kind": string,"p_label"?: string,"p_matter_id": string,"p_task_id"?: string,"p_url"?: string }; Returns: string
                           },
"add_matter_comment":
{ Args: { "p_author_kind"?: string,"p_body": string,"p_matter_id": string,"p_mentioned_profile_ids"?: (string)[],"p_parent_id"?: string,"p_task_id"?: string }; Returns: string
                           },
"add_opportunity_evidence":
{ Args: { "p_description": string,"p_participation_id": string,"p_reference_label"?: string,"p_reference_url"?: string }; Returns: string
                           },
"add_task_dependency":
{ Args: { "p_depends_on_task_id": string,"p_task_id": string }; Returns: undefined
                           },
"adopt_matter_agent_plan_task":
{ Args: { "p_artifact_id": string,"p_depends_on_titles"?: (string)[],"p_description"?: string,"p_title": string }; Returns: string
                           },
"agreement_append_event":
{ Args: { "p_agreement_id": string,"p_event_type": string,"p_metadata"?: Json,"p_party_id"?: string,"p_version_id"?: string }; Returns: undefined
                           },
"agreement_assign_reference":
{ Args: { "p_requested": string }; Returns: string
                           },
"agreement_compute_fingerprint":
{ Args: { "p_payload": Json }; Returns: string
                           },
"agreement_fingerprint_payload":
{ Args: { "p_agreement_id": string,"p_version_id": string }; Returns: Json
                           },
"agreement_lock_version":
{ Args: { "p_agreement_id": string,"p_version_id": string }; Returns: string
                           },
"agreement_next_reference":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"agreement_notify":
{ Args: { "p_agreement_id": string,"p_body": string,"p_metadata"?: Json,"p_profile_id": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"agreement_sanitize_party_reference":
{ Args: { "p_value": string }; Returns: string
                           },
"agreement_type_is_allowed":
{ Args: { "p_type": string }; Returns: boolean
                           },
"app_role_permissions":
{ Args: { "target_role": Database["public"]['Enums']["app_role"] }; Returns: (Database["public"]['Enums']["app_permission"])[]
                           },
"append_governance_emergency_access_ops_policy_event":
{ Args: { "target_actor_profile_id"?: string,"target_event_message"?: string,"target_event_type": string,"target_metadata"?: Json,"target_policy_key": string }; Returns: string
                           },
"append_governance_emergency_access_request_event":
{ Args: { "target_actor_profile_id"?: string,"target_event_message": string,"target_event_type": string,"target_metadata"?: Json,"target_request_id": string }; Returns: string
                           },
"append_gpav_fed_exchange_receipt_policy_event":
{ Args: { "target_event_message": string,"target_event_type": string,"target_metadata"?: Json,"target_policy_key": string }; Returns: string
                           },
"append_matter_coding_command_log":
{ Args: { "payload": Json }; Returns: string
                           },
"apply_to_contribution_opportunity":
{ Args: { "p_message"?: string,"p_opportunity_id": string }; Returns: string
                           },
"approve_distribution_period":
{ Args: { "p_period_id": string }; Returns: Json
                           },
"approve_matter_coding_plan":
{ Args: { "p_artifact_id": string,"p_note"?: string }; Returns: string
                           },
"approve_matter_coding_scope_expansion":
{ Args: { "p_artifact_id": string,"p_path": string }; Returns: undefined
                           },
"area_activity":
{ Args: { "p_area_code": string }; Returns: Json
                           },
"assign_identity_verification_case":
{ Args: { "p_case_id": string,"p_reviewer_profile_id"?: string }; Returns: Json
                           },
"assign_matter_ai_agent":
{ Args: { "payload": Json }; Returns: string
                           },
"assign_matter_coding_agent":
{ Args: { "payload": Json }; Returns: string
                           },
"authorize_matter_agent_run":
{ Args: { "p_run_id": string }; Returns: Json
                           },
"begin_business_account_link":
{ Args: { "p_business_name"?: string,"p_linked_profile_id"?: string }; Returns: string
                           },
"build_default_agreement_body_markdown":
{ Args: { "p_listing_kind": string,"p_listing_title": string,"p_price_lumens": number,"p_template_key": string }; Returns: string
                           },
"business_account_link_token_hash":
{ Args: { "p_token": string }; Returns: string
                           },
"call_inbox_owner":
{ Args: { "p_topic": string }; Returns: string
                           },
"can_access_agreement":
{ Args: { "p_agreement_id": string }; Returns: boolean
                           },
"can_access_matter":
{ Args: { "p_matter_id": string }; Returns: boolean
                           },
"can_contribute_to_content_category":
{ Args: { "target_category_id": string,"target_profile_id"?: string }; Returns: boolean
                           },
"can_edit_agreement":
{ Args: { "p_agreement_id": string }; Returns: boolean
                           },
"can_finance_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_finance_approve":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_finance_edit":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_finance_publish":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_finance_view":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_manage_funding_ledger":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_review_identity_verification_storage":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"can_signal_call_inbox":
{ Args: { "p_topic": string }; Returns: boolean
                           },
"cancel_agreement":
{ Args: { "p_agreement_id": string }; Returns: undefined
                           },
"cancel_matter_agent_assignment":
{ Args: { "p_assignment_id": string }; Returns: undefined
                           },
"cancel_opportunity_participation":
{ Args: { "p_participation_id": string }; Returns: undefined
                           },
"capture_activation_demographic_snapshot":
{ Args: { "measured_by_profile_id"?: string,"requested_country_code"?: string,"requested_scope_type": Database["public"]['Enums']["activation_scope_type"],"snapshot_notes"?: string,"snapshot_source"?: string }; Returns: string
                           },
"capture_all_governance_domain_maturity_snapshots":
{ Args: { "measured_by_profile_id"?: string,"snapshot_notes"?: string,"snapshot_source"?: string }; Returns: number
                           },
"capture_governance_domain_maturity_snapshot":
{ Args: { "measured_by_profile_id"?: string,"requested_domain_key": string,"snapshot_notes"?: string,"snapshot_source"?: string }; Returns: string
                           },
"capture_governance_domain_maturity_snapshot_if_stale":
{ Args: { "max_snapshot_age"?: string,"measured_by_profile_id"?: string,"requested_domain_key": string,"snapshot_notes"?: string,"snapshot_source"?: string }; Returns: string
                           },
"capture_governance_domain_maturity_snapshots_for_profile":
{ Args: { "requested_profile_id": string,"snapshot_notes"?: string,"snapshot_source"?: string }; Returns: number
                           },
"capture_governance_guardian_relay_audit_report":
{ Args: { "audit_metadata"?: Json,"audit_notes"?: string,"target_proposal_id": string }; Returns: string
                           },
"capture_governance_proposal_guardian_relay_client_manifest":
{ Args: { "manifest_metadata"?: Json,"manifest_notes"?: string,"target_proposal_id": string }; Returns: string
                           },
"capture_governance_proposal_guardian_relay_client_verification_":
{ Args: { "package_metadata"?: Json,"package_notes"?: string,"target_proposal_id": string }; Returns: string
                           },
"capture_governance_public_audit_batch":
{ Args: { "batch_source"?: string,"created_by_profile_id"?: string,"max_events"?: number,"requested_from"?: string,"requested_metadata"?: Json,"requested_to"?: string }; Returns: string
                           },
"capture_governance_public_audit_verifier_federation_package":
{ Args: { "package_metadata"?: Json,"package_notes"?: string,"requested_policy_key"?: string,"target_batch_id"?: string }; Returns: string
                           },
"capture_scheduled_activation_demographic_snapshots":
{ Args: { "snapshot_notes"?: string,"snapshot_source"?: string }; Returns: number
                           },
"capture_scheduled_governance_domain_maturity_snapshots":
{ Args: { "max_snapshot_age"?: string,"snapshot_notes"?: string,"snapshot_source"?: string }; Returns: number
                           },
"cast_consultation_ballot":
{ Args: { "p_election_id": string,"p_option_key": string }; Returns: Json
                           } |
{ Args: { "p_election_id": string,"p_option_keys": (string)[] }; Returns: Json
                           },
"citizenship_due_at":
{ Args: { "p_profile_id": string }; Returns: string
                           },
"citizenship_promotion_tick":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"civi_caller_can_review_interactions":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"civic_append_election_event":
{ Args: { "p_election_id": string,"p_event_type": string,"p_payload": Json }; Returns: string
                           },
"civic_can_draft_voting_proposal_for_matter":
{ Args: { "p_matter_id": string,"p_profile_id": string }; Returns: boolean
                           },
"civic_can_manage_voting_proposals":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"civic_choice_keys":
{ Args: { "p_payload": string }; Returns: string[]
                           },
"civic_close_due_elections":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"civic_consultation_followers":
{ Args: { "p_election_id": string }; Returns: (string)[]
                           },
"civic_consultation_outcome_statement":
{ Args: { "p_outcome": Json,"p_tally": Json }; Returns: string
                           },
"civic_consultation_outcome_to_matter":
{ Args: { "p_election_id": string }; Returns: number
                           },
"civic_consultation_reminders":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"civic_election_country_stats":
{ Args: { "p_election_id": string }; Returns: {
              "country_code": string,"participant_count": number
            }[]
                           },
"civic_election_observer_metrics":
{ Args: { "p_election_id": string }; Returns: Json
                           },
"civic_election_outcome":
{ Args: { "p_election_id": string }; Returns: Json
                           },
"civic_election_public_directory":
{ Args: { "p_election_id": string }; Returns: {
              "country_code": string,"display_name": string
            }[]
                           },
"civic_election_public_tallies":
{ Args: { "p_election_id": string }; Returns: {
              "candidate_id": string,"display_name": string,"option_key": string,"vote_count": number
            }[]
                           },
"civic_election_ranked_result":
{ Args: { "p_election_id": string }; Returns: Json
                           },
"civic_election_receipt_included":
{ Args: { "p_election_id": string,"p_receipt": string }; Returns: boolean
                           },
"civic_election_receipts":
{ Args: { "p_election_id": string }; Returns: {
              "receipt": string
            }[]
                           },
"civic_election_secret_ensure":
{ Args: { "p_election_id": string }; Returns: string
                           },
"civic_election_secret_lookup":
{ Args: { "p_election_id": string }; Returns: string
                           },
"civic_election_verification_split":
{ Args: { "p_election_id": string }; Returns: {
              "unverified_count": number,"verified_count": number
            }[]
                           },
"civic_normalize_options":
{ Args: { "p_options": Json }; Returns: Json
                           },
"civic_notify_profiles":
{ Args: { "p_body": string,"p_entity_id": string,"p_entity_type": string,"p_metadata"?: Json,"p_recipients": (string)[],"p_title": string,"p_type": string }; Returns: number
                           },
"civic_seal_choice":
{ Args: { "p_election_id": string,"p_option": string }; Returns: string
                           },
"civic_tally_keys":
{ Args: { "p_method": string,"p_payload": string }; Returns: string[]
                           },
"civic_unseal_choice":
{ Args: { "p_election_id": string,"p_payload": string }; Returns: string
                           },
"civizen_base32_hash_prefix":
{ Args: { "output_length"?: number,"source": string }; Returns: string
                           },
"civizen_base36_hash_prefix":
{ Args: { "output_length"?: number,"source": string }; Returns: string
                           },
"civizen_identity_status_prefix":
{ Args: { "user_role": Database["public"]['Enums']["app_role"],"verified": boolean }; Returns: string
                           },
"civizen_luhn36_char_value":
{ Args: { "input_char": string }; Returns: number
                           },
"civizen_luhn36_check_char":
{ Args: { "input_text": string }; Returns: string
                           },
"civizen_mrz_char_value":
{ Args: { "input_char": string }; Returns: number
                           },
"civizen_mrz_check_digit":
{ Args: { "input_text": string }; Returns: number
                           },
"claim_activation_demographic_feed_worker_jobs":
{ Args: { "job_limit"?: number,"worker_identity": string }; Returns: {
              "adapter_id": string,"outbox_job_id": string
            }[]
                           },
"claim_governance_emergency_access_request_for_impersonation":
{ Args: { "target_request_id": string }; Returns: string
                           },
"claim_governance_public_audit_external_execution_jobs":
{ Args: { "requested_anchor_limit"?: number,"requested_batch_id"?: string,"requested_verifier_limit"?: number,"worker_identity"?: string }; Returns: {
              "adapter_id": string,"attempt_count": number,"batch_id": string,"claim_expires_at": string,"claimed_at": string,"job_id": string,"job_type": string,"max_attempts": number,"network": string,"next_attempt_at": string,"scheduled_at": string,"verifier_id": string
            }[]
                           },
"classify_content_category":
{ Args: { "body_preview"?: string,"content_type"?: string,"source"?: string,"title"?: string }; Returns: string
                           },
"collect_wellbeing_structured_signals":
{ Args: { "p_period_start": string,"p_scope_id": string,"p_time_bucket": string }; Returns: Json
                           },
"complete_activation_demographic_feed_worker_outbox":
{ Args: { "completed_ok": boolean,"resolution_message"?: string,"target_outbox_id": string }; Returns: string
                           },
"complete_agreement":
{ Args: { "p_agreement_id": string }; Returns: undefined
                           },
"complete_business_account_link":
{ Args: { "p_token": string }; Returns: string
                           },
"complete_community_challenge":
{ Args: { "p_challenge_id": string }; Returns: string
                           },
"complete_governance_public_audit_anchor_execution_job":
{ Args: { "completion_status": string,"error_message"?: string,"immutable_reference"?: string,"proof_block_height"?: number,"proof_payload"?: Json,"target_job_id": string }; Returns: string
                           } |
{ Args: { "completion_status": string,"error_message"?: string,"immutable_reference"?: string,"proof_block_height"?: number,"proof_payload"?: Json,"requested_retry_base_delay_minutes"?: number,"requested_retry_max_delay_minutes"?: number,"retry_on_failure"?: boolean,"target_job_id": string }; Returns: string
                           },
"complete_governance_public_audit_verifier_job":
{ Args: { "completion_status": Database["public"]['Enums']["governance_public_audit_verifier_job_status"],"error_message"?: string,"proof_payload"?: Json,"proof_reference"?: string,"target_job_id": string,"verification_hash"?: string,"verification_status"?: Database["public"]['Enums']["governance_public_audit_verification_status"] }; Returns: string
                           } |
{ Args: { "completion_status": Database["public"]['Enums']["governance_public_audit_verifier_job_status"],"error_message"?: string,"proof_payload"?: Json,"proof_reference"?: string,"requested_retry_base_delay_minutes"?: number,"requested_retry_max_delay_minutes"?: number,"retry_on_failure"?: boolean,"target_job_id": string,"verification_hash"?: string,"verification_status"?: Database["public"]['Enums']["governance_public_audit_verification_status"] }; Returns: string
                           },
"complete_governance_public_audit_verifier_mirror_probe_job":
{ Args: { "completion_status": string,"error_message"?: string,"metadata"?: Json,"mirror_check_status"?: string,"observed_batch_hash"?: string,"observed_latency_ms"?: number,"target_job_id": string }; Returns: string
                           },
"complete_matter_collaborative_work":
{ Args: { "p_allow_outstanding"?: boolean,"p_matter_id": string,"p_reason"?: string }; Returns: undefined
                           },
"consultation_eligibility_reason":
{ Args: { "p_election_id": string,"p_profile_id": string }; Returns: string
                           },
"consultation_eligibility_reason_core":
{ Args: { "p_election_id": string,"p_profile_id": string }; Returns: string
                           },
"convert_funding_interest_to_commitment":
{ Args: { "p_amount_original"?: number,"p_amount_usd"?: number,"p_currency"?: string,"p_inquiry_id": string,"p_restriction_code"?: string,"p_restrictions"?: string,"p_status"?: string }; Returns: Json
                           },
"convert_knowledge_gap_to_challenge":
{ Args: { "p_gap_id": string,"payload": Json }; Returns: string
                           },
"convert_knowledge_gap_to_opportunity":
{ Args: { "p_gap_id": string,"payload": Json }; Returns: string
                           },
"create_agreement_amendment":
{ Args: { "p_agreement_id": string,"p_title": string }; Returns: string
                           },
"create_agreement_from_listing":
{ Args: { "p_market_listing_id": string,"p_template_key"?: string }; Returns: string
                           },
"create_collaboration_agreement":
{ Args: { "p_payload": Json }; Returns: string
                           },
"create_collaboration_task":
{ Args: { "payload": Json }; Returns: string
                           },
"create_community_challenge":
{ Args: { "payload": Json }; Returns: string
                           },
"create_contribution_opportunity":
{ Args: { "payload": Json }; Returns: string
                           },
"create_contribution_program":
{ Args: { "payload": Json }; Returns: string
                           },
"create_distribution_period":
{ Args: { "p_civizen_shared_proceeds_usd": number,"p_contributor_share"?: number,"p_label": string,"p_notes"?: string,"p_period_end": string,"p_period_start": string,"p_project_servicing_share"?: number }; Returns: {
              "approved_at": string | null,
"approved_by": string | null,
"civizen_shared_proceeds_usd": number,
"contributor_pool_usd": number,
"contributor_share": number,
"created_at": string,
"created_by": string | null,
"founder_reserve_usd": number,
"founder_share": number,
"id": string,
"investor_pool_usd": number,
"investor_share": number,
"label": string,
"mission_reserve_usd": number,
"notes": string | null,
"period_end": string,
"period_start": string,
"project_servicing_pool_usd": number,
"project_servicing_share": number,
"status": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "distribution_periods"
        isOneToOne: true
        isSetofReturn: false
      } },
"create_implementation_opportunity":
{ Args: { "p_project_id": string,"payload": Json }; Returns: string
                           },
"create_knowledge_gap":
{ Args: { "payload": Json }; Returns: string
                           },
"create_knowledge_resource":
{ Args: { "payload": Json }; Returns: string
                           },
"create_knowledge_space":
{ Args: { "payload": Json }; Returns: string
                           },
"create_matter":
{ Args: { "payload": Json }; Returns: string
                           },
"create_matter_follow_up":
{ Args: { "p_description": string,"p_resolution_id": string,"p_source_matter_id": string,"p_title": string }; Returns: string
                           },
"create_next_agreement_version":
{ Args: { "p_agreement_id": string,"p_change_note"?: string }; Returns: string
                           },
"create_voting_proposal_from_matter":
{ Args: { "p_body": string,"p_matter_id": string,"p_summary": string,"p_title": string,"p_voting_closes_at"?: string }; Returns: string
                           },
"current_app_permissions":
{ Args: Record<PropertyKey, never>; Returns: (Database["public"]['Enums']["app_permission"])[]
                           },
"current_app_role":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["app_role"]
                           },
"current_profile_can_manage_activation_demographic_feed_workers":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"current_profile_can_manage_activation_demographic_feeds":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"current_profile_can_manage_guardian_multisig":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"current_profile_can_manage_guardian_relays":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"current_profile_can_manage_public_audit_verifiers":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"current_profile_can_read_challenge":
{ Args: { "p_challenge_id": string }; Returns: boolean
                           },
"current_profile_can_read_knowledge_resource":
{ Args: { "p_resource_id": string }; Returns: boolean
                           },
"current_profile_can_read_knowledge_space":
{ Args: { "p_space_id": string }; Returns: boolean
                           },
"current_profile_can_read_participation":
{ Args: { "p_participation_id": string }; Returns: boolean
                           },
"current_profile_can_read_program":
{ Args: { "p_program_id": string }; Returns: boolean
                           },
"current_profile_has_constitutional_office":
{ Args: { "requested_office": Database["public"]['Enums']["constitutional_office_key"] }; Returns: boolean
                           },
"current_profile_has_governance_block":
{ Args: { "requested_scope": Database["public"]['Enums']["governance_block_scope"] }; Returns: boolean
                           },
"current_profile_has_governance_domain_role":
{ Args: { "domain_keys": (string)[],"role_keys"?: (string)[] }; Returns: boolean
                           },
"current_profile_has_opportunity_participation":
{ Args: { "p_opportunity_id": string }; Returns: boolean
                           },
"current_profile_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_profile_in_governance_domain":
{ Args: { "domain_keys": (string)[] }; Returns: boolean
                           },
"current_profile_in_governance_unit":
{ Args: { "unit_keys": (string)[] }; Returns: boolean
                           },
"current_profile_is_guardian_signer":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"current_profile_is_matter_party":
{ Args: { "p_matter_id": string }; Returns: boolean
                           },
"current_profile_is_maturity_steward":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"current_profile_manages_publisher":
{ Args: { "p_publisher_profile_id": string }; Returns: boolean
                           },
"current_profile_represents_actor":
{ Args: { "p_kind": string,"p_profile_id": string }; Returns: boolean
                           },
"decide_identity_verification_case":
{ Args: { "p_case_id": string,"p_decision": string,"p_notes"?: string }; Returns: Json
                           },
"delete_content_item_from_source":
{ Args: { "target_source_id": string,"target_source_table": string }; Returns: undefined
                           },
"delete_my_account":
{ Args: { "p_confirm": string }; Returns: boolean
                           },
"delete_my_account_core":
{ Args: { "p_confirm": string }; Returns: boolean
                           },
"edit_published_post":
{ Args: { "p_content": string,"p_post_id": string }; Returns: {
              "author_id": string,
"content": string,
"created_at": string,
"edited_at": string | null,
"id": string,
"is_edited": boolean | null
            }
                          SetofOptions: {
        from: "*"
        to: "posts"
        isOneToOne: true
        isSetofReturn: false
      } },
"ensure_agreement_civizen_reference":
{ Args: { "p_agreement_id": string }; Returns: string
                           },
"ensure_nela_governance_participation":
{ Args: { "target_proposal_id": string }; Returns: undefined
                           },
"evaluate_governance_domain_maturity":
{ Args: { "requested_domain_key": string }; Returns: Json
                           },
"evaluate_opportunity_work":
{ Args: { "p_decision": string,"p_feedback"?: string,"p_impact_score"?: number,"p_participation_id": string,"p_quality_score"?: number,"p_skill_names"?: (string)[] }; Returns: string
                           },
"expire_governance_emergency_access_requests":
{ Args: { "requested_approved_max_age_minutes"?: number,"requested_pending_max_age_hours"?: number }; Returns: {
              "expired_approved_count": number,"expired_pending_count": number,"total_expired_count": number
            }[]
                           },
"export_my_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"fail_matter_agent_run_service":
{ Args: { "p_reason": string,"p_run_id": string }; Returns: undefined
                           },
"finance_allocate_receipt":
{ Args: { "p_amount_minor": number,"p_line_item_id": string,"p_override_reason"?: string,"p_purpose_note"?: string,"p_receipt_id": string }; Returns: {
              "actor_user_id": string | null,
"allocated_at": string,
"amount_minor": number,
"created_at": string,
"currency": string,
"id": string,
"line_item_id": string,
"override_reason": string | null,
"purpose_note": string | null,
"receipt_id": string,
"reverses_allocation_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "finance_allocations"
        isOneToOne: true
        isSetofReturn: false
      } },
"finance_approve_budget":
{ Args: { "p_budget_id": string,"p_reason": string }; Returns: {
              "approval_reason": string | null,
"approved_at": string | null,
"approved_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": string,
"id": string,
"internal_notes": string | null,
"is_demonstration": boolean,
"lifecycle_status": string,
"name": string,
"period_end": string | null,
"period_start": string | null,
"publication_note": string | null,
"published_at": string | null,
"published_by": string | null,
"purpose": string | null,
"submitted_at": string | null,
"submitted_by": string | null,
"supersedes_budget_id": string | null,
"updated_at": string,
"updated_by": string | null,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "project_budgets"
        isOneToOne: true
        isSetofReturn: false
      } },
"finance_assess_transaction_cost":
{ Args: { "p_adjustment_minor"?: number,"p_audit_cost_minor": number,"p_currency"?: string,"p_liable_legal_entity_name": string,"p_liable_party_type": string,"p_other_allowed_cost_minor": number,"p_processor_cost_minor": number,"p_reason"?: string,"p_related_receipt_id"?: string,"p_related_transaction_ref"?: string }; Returns: {
              "actor_user_id": string | null,
"adjustment_minor": number,
"assessed_user_fee_minor": number,
"audit_cost_minor": number,
"calculation_note": string,
"created_at": string,
"currency": string,
"id": string,
"liable_legal_entity_name": string | null,
"liable_party_type": string,
"other_allowed_cost_minor": number,
"processor_cost_minor": number,
"reason": string | null,
"related_receipt_id": string | null,
"related_transaction_ref": string | null,
"rule_version": string
            }
                          SetofOptions: {
        from: "*"
        to: "finance_cost_assessments"
        isOneToOne: true
        isSetofReturn: false
      } },
"finance_build_public_budget_snapshot":
{ Args: { "p_budget_id": string }; Returns: Json
                           },
"finance_publish_budget":
{ Args: { "p_budget_id": string,"p_note"?: string }; Returns: {
              "approval_reason": string | null,
"approved_at": string | null,
"approved_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": string,
"id": string,
"internal_notes": string | null,
"is_demonstration": boolean,
"lifecycle_status": string,
"name": string,
"period_end": string | null,
"period_start": string | null,
"publication_note": string | null,
"published_at": string | null,
"published_by": string | null,
"purpose": string | null,
"submitted_at": string | null,
"submitted_by": string | null,
"supersedes_budget_id": string | null,
"updated_at": string,
"updated_by": string | null,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "project_budgets"
        isOneToOne: true
        isSetofReturn: false
      } },
"finance_require_manager":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"finance_submit_budget":
{ Args: { "p_budget_id": string,"p_reason"?: string }; Returns: {
              "approval_reason": string | null,
"approved_at": string | null,
"approved_by": string | null,
"created_at": string,
"created_by": string | null,
"currency": string,
"id": string,
"internal_notes": string | null,
"is_demonstration": boolean,
"lifecycle_status": string,
"name": string,
"period_end": string | null,
"period_start": string | null,
"publication_note": string | null,
"published_at": string | null,
"published_by": string | null,
"purpose": string | null,
"submitted_at": string | null,
"submitted_by": string | null,
"supersedes_budget_id": string | null,
"updated_at": string,
"updated_by": string | null,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "project_budgets"
        isOneToOne: true
        isSetofReturn: false
      } },
"finance_write_audit":
{ Args: { "p_actor"?: string,"p_entity_id": string,"p_entity_type": string,"p_event_type": string,"p_payload"?: Json }; Returns: string
                           },
"funding_lane_credit_account":
{ Args: { "p_lane": string }; Returns: string
                           },
"generate_civizen_lsi":
{ Args: { "attempt"?: number,"source": string }; Returns: string
                           },
"generate_official_id_candidate":
{ Args: Record<PropertyKey, never>; Returns: string
                           } |
{ Args: { "country_code"?: string }; Returns: string
                           },
"generate_ssn_candidate":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"generate_unique_username":
{ Args: { "exclude_profile_id"?: string,"source": string }; Returns: string
                           },
"generate_world_citizen_id":
{ Args: { "attempt"?: number,"source": string,"user_role": Database["public"]['Enums']["app_role"],"verified": boolean }; Returns: string
                           },
"get_agreement_detail":
{ Args: { "p_agreement_id": string }; Returns: Json
                           },
"get_matter":
{ Args: { "p_matter_id": string }; Returns: Json
                           },
"get_public_funding_transparency":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_public_project_finance_summary":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_wellbeing_aggregate":
{ Args: { "p_query": Json }; Returns: Json
                           },
"governance_domain_is_mature":
{ Args: { "requested_domain_key": string }; Returns: boolean
                           },
"governance_emergency_access_event_summary":
{ Args: { "requested_lookback_hours"?: number }; Returns: {
              "approved_count": number,"consumed_count": number,"expired_count": number,"latest_event_at": string,"lookback_hours": number,"pending_count": number,"rejected_count": number,"request_count": number
            }[]
                           },
"governance_emergency_access_ops_policy_event_eligibility":
{ Args: { "max_events"?: number,"max_rollback_age_hours"?: number,"requested_lookback_hours"?: number,"requested_policy_key"?: string,"required_policy_schema_version"?: string }; Returns: {
              "actor_name": string,"actor_profile_id": string,"created_at": string,"event_id": string,"event_message": string,"event_type": string,"metadata": Json,"policy_key": string,"rollback_eligibility_reason": string,"rollback_eligible": boolean
            }[]
                           },
"governance_emergency_access_ops_policy_event_history":
{ Args: { "max_events"?: number,"requested_lookback_hours"?: number,"requested_policy_key"?: string }; Returns: {
              "actor_name": string,"actor_profile_id": string,"created_at": string,"event_id": string,"event_message": string,"event_type": string,"metadata": Json,"policy_key": string
            }[]
                           },
"governance_emergency_access_ops_policy_event_history_with_eligi":
{ Args: { "max_events"?: number,"max_rollback_age_hours"?: number,"requested_lookback_hours"?: number,"requested_policy_key"?: string,"required_policy_schema_version"?: string }; Returns: {
              "actor_name": string,"actor_profile_id": string,"created_at": string,"event_id": string,"event_message": string,"event_type": string,"metadata": Json,"policy_key": string,"rollback_eligibility_reason": string,"rollback_eligible": boolean
            }[]
                           },
"governance_emergency_access_ops_policy_summary":
{ Args: { "requested_policy_key"?: string }; Returns: {
              "approved_max_age_minutes": number,"escalation_enabled": boolean,"near_expiry_window_minutes": number,"oncall_channel": string,"pending_max_age_hours": number,"policy_key": string,"policy_name": string,"updated_at": string
            }[]
                           },
"governance_emergency_access_ops_summary":
{ Args: { "requested_near_expiry_window_minutes"?: number,"requested_pending_max_age_hours"?: number }; Returns: {
              "approved_unconsumed_count": number,"consumed_count": number,"expired_count": number,"latest_event_at": string,"latest_request_at": string,"near_expiry_approved_count": number,"pending_count": number,"rejected_count": number,"stale_pending_count": number
            }[]
                           },
"governance_emergency_access_request_board":
{ Args: { "max_requests"?: number,"requested_status"?: string }; Returns: {
              "approved_expires_at": string,"consumed_at": string,"consumed_by": string,"consumed_by_name": string,"created_at": string,"request_id": string,"request_reason": string,"request_status": string,"requested_by": string,"requested_by_name": string,"review_notes": string,"reviewed_at": string,"reviewed_by": string,"reviewed_by_name": string,"target_display_name": string,"target_profile_id": string,"target_username": string,"updated_at": string
            }[]
                           },
"governance_emergency_access_request_event_board":
{ Args: { "max_events"?: number,"target_request_id": string }; Returns: {
              "actor_name": string,"actor_profile_id": string,"created_at": string,"event_id": string,"event_message": string,"event_type": string,"metadata": Json,"request_id": string
            }[]
                           },
"governance_proposal_external_multisig_summary":
{ Args: { "target_proposal_id": string }; Returns: {
              "active_external_signer_count": number,"external_approval_count": number,"external_decisive_count": number,"external_multisig_required": boolean,"external_rejection_count": number,"policy_contract_reference": string,"policy_network": string,"required_external_approvals": number
            }[]
                           },
"governance_proposal_guardian_relay_alert_board":
{ Args: { "max_entries"?: number,"status_filter"?: string,"target_proposal_id": string }; Returns: {
              "alert_id": string,"alert_key": string,"alert_message": string,"alert_scope": string,"alert_status": string,"opened_at": string,"resolved_at": string,"severity": string
            }[]
                           },
"governance_proposal_guardian_relay_attestation_audit_report":
{ Args: { "requested_lookback_hours"?: number,"target_proposal_id": string }; Returns: {
              "last_attested_at": string,"mismatch_count": number,"recent_attestation_count": number,"recent_failure_count": number,"recent_health_score": number,"recent_health_status": string,"relay_id": string,"relay_infrastructure_provider": string,"relay_key": string,"relay_label": string,"relay_operator_label": string,"relay_region_code": string,"relay_trust_domain": string,"total_attestation_count": number,"unreachable_count": number,"verified_count": number
            }[]
                           },
"governance_proposal_guardian_relay_client_proof_manifest":
{ Args: { "target_proposal_id": string }; Returns: {
              "manifest_hash": string,"manifest_payload": Json,"manifest_version": string,"trust_minimized_quorum_met": boolean
            }[]
                           },
"governance_proposal_guardian_relay_client_verification_distribu":
{ Args: { "target_proposal_id": string }; Returns: {
              "captured_at": string,"distinct_signer_count": number,"distinct_signer_jurisdictions_count": number,"distinct_signer_trust_domains_count": number,"distribution_ready": boolean,"last_signed_at": string,"package_hash": string,"package_id": string,"package_version": string,"required_distribution_signatures": number,"signature_count": number,"source_manifest_hash": string
            }[]
                           },
"governance_proposal_guardian_relay_client_verification_package":
{ Args: { "target_proposal_id": string }; Returns: {
              "package_hash": string,"package_payload": Json,"package_version": string,"relay_ops_ready": boolean,"source_manifest_hash": string,"source_manifest_id": string,"trust_minimized_quorum_met": boolean
            }[]
                           },
"governance_proposal_guardian_relay_client_verification_signatur":
{ Args: { "max_entries"?: number,"target_proposal_id": string }; Returns: {
              "distribution_channel": string,"package_hash": string,"package_id": string,"signature_algorithm": string,"signature_id": string,"signed_at": string,"signer_jurisdiction_country_code": string,"signer_key": string,"signer_trust_domain": string
            }[]
                           },
"governance_proposal_guardian_relay_diversity_audit":
{ Args: { "target_proposal_id": string }; Returns: {
              "distinct_operators_count": number,"distinct_providers_count": number,"distinct_regions_count": number,"dominant_operator_share_percent": number,"dominant_provider_share_percent": number,"dominant_region_share_percent": number,"min_distinct_relay_operators": number,"min_distinct_relay_providers": number,"min_distinct_relay_regions": number,"operator_diversity_met": boolean,"overall_diversity_met": boolean,"policy_enabled": boolean,"provider_diversity_met": boolean,"region_diversity_met": boolean,"required_relay_attestations": number,"verified_relay_count": number
            }[]
                           },
"governance_proposal_guardian_relay_operations_summary":
{ Args: { "requested_attestation_sla_minutes"?: number,"requested_policy_key"?: string,"target_proposal_id": string }; Returns: {
              "external_approval_count": number,"last_worker_run_at": string,"last_worker_run_status": string,"max_open_critical_relay_alerts": number,"open_critical_alert_count": number,"open_warning_alert_count": number,"policy_key": string,"relay_attestation_sla_minutes": number,"relay_ops_ready": boolean,"require_relay_ops_readiness": boolean,"require_trust_minimized_quorum": boolean,"stale_signer_count": number,"trust_minimized_quorum_met": boolean
            }[]
                           },
"governance_proposal_guardian_relay_recent_audits":
{ Args: { "max_reports"?: number,"target_proposal_id": string }; Returns: {
              "audit_notes": string,"captured_at": string,"chain_proof_match_met": boolean,"distinct_operators_count": number,"distinct_providers_count": number,"distinct_regions_count": number,"overall_diversity_met": boolean,"relay_quorum_met": boolean,"report_id": string,"verified_relay_count": number
            }[]
                           },
"governance_proposal_guardian_relay_recent_client_manifests":
{ Args: { "max_manifests"?: number,"target_proposal_id": string }; Returns: {
              "captured_at": string,"chain_proof_match_met": boolean,"manifest_hash": string,"manifest_id": string,"manifest_notes": string,"manifest_version": string,"relay_quorum_met": boolean,"trust_minimized_quorum_met": boolean
            }[]
                           },
"governance_proposal_guardian_relay_recent_client_verification_p":
{ Args: { "max_packages"?: number,"target_proposal_id": string }; Returns: {
              "captured_at": string,"distribution_ready": boolean,"package_hash": string,"package_id": string,"package_notes": string,"package_version": string,"signature_count": number,"source_manifest_hash": string
            }[]
                           },
"governance_proposal_guardian_relay_summary":
{ Args: { "target_proposal_id": string }; Returns: {
              "active_relay_count": number,"chain_proof_match_met": boolean,"external_approval_count": number,"policy_enabled": boolean,"relay_mismatch_count": number,"relay_quorum_met": boolean,"relay_unreachable_count": number,"relay_verified_count": number,"require_chain_proof_match": boolean,"required_relay_attestations": number,"signers_with_chain_proof_count": number,"signers_with_relay_quorum_count": number
            }[]
                           },
"governance_proposal_guardian_relay_trust_minimized_summary":
{ Args: { "target_proposal_id": string }; Returns: {
              "chain_proof_match_met": boolean,"concentration_limits_met": boolean,"distinct_jurisdictions_count": number,"distinct_operators_count": number,"distinct_providers_count": number,"distinct_regions_count": number,"distinct_trust_domains_count": number,"dominant_jurisdiction_share_percent": number,"dominant_operator_share_percent": number,"dominant_provider_share_percent": number,"dominant_region_share_percent": number,"dominant_trust_domain_share_percent": number,"external_approval_count": number,"jurisdiction_diversity_met": boolean,"max_dominant_relay_jurisdiction_share_percent": number,"max_dominant_relay_operator_share_percent": number,"max_dominant_relay_provider_share_percent": number,"max_dominant_relay_region_share_percent": number,"max_dominant_relay_trust_domain_share_percent": number,"min_distinct_relay_jurisdictions": number,"min_distinct_relay_operators": number,"min_distinct_relay_providers": number,"min_distinct_relay_regions": number,"min_distinct_relay_trust_domains": number,"operator_diversity_met": boolean,"policy_enabled": boolean,"provider_diversity_met": boolean,"region_diversity_met": boolean,"relay_quorum_met": boolean,"required_relay_attestations": number,"signers_with_chain_proof_count": number,"signers_with_relay_quorum_count": number,"trust_domain_diversity_met": boolean,"trust_minimized_quorum_met": boolean,"verified_relay_count": number
            }[]
                           },
"governance_proposal_guardian_relay_worker_run_board":
{ Args: { "max_entries"?: number,"target_proposal_id": string }; Returns: {
              "error_message": string,"observed_at": string,"open_alert_count": number,"processed_signer_count": number,"run_id": string,"run_scope": string,"run_status": string,"stale_signer_count": number
            }[]
                           },
"governance_proposal_guardian_signoff_summary":
{ Args: { "target_proposal_id": string }; Returns: {
              "approval_class": Database["public"]['Enums']["governance_threshold_approval_class"],"approval_count": number,"decisive_count": number,"meets_signoff": boolean,"rejection_count": number,"required_approvals": number,"requires_guardian_signoff": boolean,"requires_window_close": boolean
            }[]
                           },
"governance_proposal_is_execution_ready":
{ Args: { "target_proposal_id": string }; Returns: boolean
                           },
"governance_proposal_meets_execution_threshold":
{ Args: { "target_proposal_id": string }; Returns: boolean
                           },
"governance_proposal_meets_guardian_relay_distribution_gate":
{ Args: { "target_proposal_id": string }; Returns: boolean
                           },
"governance_proposal_meets_guardian_signoff":
{ Args: { "target_proposal_id": string }; Returns: boolean
                           },
"governance_proposal_meets_verifier_federation_distribution_gate":
{ Args: { "target_proposal_id": string }; Returns: boolean
                           },
"governance_proposal_requires_guardian_signoff":
{ Args: { "target_proposal_id": string }; Returns: boolean
                           },
"governance_public_audit_anchor_execution_job_board":
{ Args: { "max_jobs"?: number,"requested_batch_id"?: string }; Returns: {
              "adapter_id": string,"adapter_key": string,"adapter_name": string,"batch_id": string,"completed_at": string,"error_message": string,"immutable_reference": string,"job_id": string,"network": string,"scheduled_at": string,"status": string
            }[]
                           },
"governance_public_audit_batch_verifier_summary":
{ Args: { "target_batch_id": string }; Returns: {
              "active_verifier_count": number,"meets_replication_threshold": boolean,"mismatch_count": number,"network_proof_count": number,"policy_enabled": boolean,"required_network_proof_count": number,"required_verified_count": number,"unreachable_count": number,"verified_count": number
            }[]
                           },
"governance_public_audit_client_verifier_bundle":
{ Args: { "max_mirrors"?: number,"target_batch_id"?: string }; Returns: {
              "bundle_hash": string,"bundle_payload": Json,"bundle_version": string,"healthy_mirror_count": number,"quorum_met": boolean
            }[]
                           },
"governance_public_audit_external_execution_automation_status":
{ Args: Record<PropertyKey, never>; Returns: {
              "cron_job_active": boolean,"cron_job_command": string,"cron_job_registered": boolean,"cron_job_schedule": string,"cron_schema_available": boolean,"latest_anchor_job_scheduled_at": string,"latest_batch_id": string,"latest_cycle_anchor_jobs_scheduled": number,"latest_cycle_evaluated_at": string,"latest_cycle_verifier_jobs_scheduled": number,"latest_external_execution_page_opened_at": string,"latest_verifier_job_scheduled_at": string
            }[]
                           },
"governance_public_audit_external_execution_page_board":
{ Args: { "max_pages"?: number,"requested_batch_id"?: string }; Returns: {
              "batch_id": string,"oncall_channel": string,"opened_at": string,"page_id": string,"page_key": string,"page_message": string,"page_status": string,"resolved_at": string,"severity": string
            }[]
                           },
"governance_public_audit_external_execution_page_history":
{ Args: { "max_pages"?: number,"requested_lookback_hours"?: number,"requested_page_key_substring": string }; Returns: {
              "acknowledged_at": string,"batch_id": string,"oncall_channel": string,"opened_at": string,"page_id": string,"page_key": string,"page_message": string,"page_status": string,"resolved_at": string,"severity": string,"updated_at": string
            }[]
                           },
"governance_public_audit_external_execution_paging_summary":
{ Args: { "auto_open_pages"?: boolean,"requested_batch_id"?: string,"requested_lookback_hours"?: number }; Returns: {
              "anchor_failure_share_percent": number,"anchor_stale_pending_count": number,"batch_id": string,"latest_open_page_at": string,"oncall_channel": string,"open_page_count": number,"paging_enabled": boolean,"paging_failure_share_percent": number,"paging_stale_pending_minutes": number,"should_page": boolean,"verifier_failure_share_percent": number,"verifier_stale_pending_count": number
            }[]
                           },
"governance_public_audit_external_execution_policy_summary":
{ Args: { "requested_policy_key"?: string }; Returns: {
              "anchor_max_attempts": number,"claim_ttl_minutes": number,"is_active": boolean,"oncall_channel": string,"oncall_webhook_url": string,"paging_enabled": boolean,"paging_failure_share_percent": number,"paging_stale_pending_minutes": number,"policy_key": string,"policy_name": string,"retry_base_delay_minutes": number,"retry_max_delay_minutes": number,"updated_at": string,"verifier_max_attempts": number
            }[]
                           },
"governance_public_audit_operations_sla_summary":
{ Args: { "requested_batch_id"?: string,"requested_lookback_hours"?: number,"requested_pending_sla_hours"?: number }; Returns: {
              "active_anchor_adapter_count": number,"active_verifier_count": number,"anchor_completed_lookback_count": number,"anchor_failed_lookback_count": number,"anchor_failure_share_percent": number,"anchor_pending_count": number,"anchor_sla_met": boolean,"anchor_stale_pending_count": number,"batch_id": string,"lookback_hours": number,"oldest_anchor_pending_at": string,"oldest_verifier_pending_at": string,"overall_sla_met": boolean,"pending_sla_hours": number,"verifier_completed_lookback_count": number,"verifier_failed_lookback_count": number,"verifier_failure_share_percent": number,"verifier_pending_count": number,"verifier_sla_met": boolean,"verifier_stale_pending_count": number
            }[]
                           },
"governance_public_audit_retry_backoff_minutes":
{ Args: { "requested_attempt_count": number,"requested_base_delay_minutes": number,"requested_max_delay_minutes": number }; Returns: number
                           },
"governance_public_audit_verifier_federation_dist_pkg_history":
{ Args: { "max_entries"?: number,"target_batch_id"?: string }; Returns: {
              "batch_id": string,"captured_at": string,"package_hash": string,"package_id": string,"package_version": string,"signature_count": number,"source_directory_id": string
            }[]
                           },
"governance_public_audit_verifier_federation_distribution_gate":
{ Args: { "requested_policy_key"?: string,"target_batch_id"?: string }; Returns: {
              "batch_id": string,"captured_at": string,"distinct_signer_count": number,"distinct_signer_jurisdictions_count": number,"distinct_signer_trust_domains_count": number,"distribution_ready": boolean,"federation_ops_ready": boolean,"last_signed_at": string,"package_hash": string,"package_id": string,"package_version": string,"required_distribution_signatures": number,"signature_count": number,"source_directory_hash": string
            }[]
                           },
"governance_public_audit_verifier_federation_exchange_board":
{ Args: { "max_entries"?: number,"target_batch_id"?: string,"target_package_id"?: string }; Returns: {
              "attestation_id": string,"attestation_metadata": Json,"attestation_notes": string,"attestation_verdict": string,"attested_at": string,"attested_by": string,"attested_by_name": string,"batch_id": string,"exchange_channel": string,"operator_identity_uri": string,"operator_jurisdiction_country_code": string,"operator_label": string,"operator_trust_domain": string,"package_hash": string,"package_id": string,"receipt_payload": Json,"receipt_signature": string,"receipt_signature_algorithm": string,"receipt_signer_key": string,"receipt_verification_notes": string,"receipt_verified": boolean,"receipt_verified_at": string,"receipt_verified_by": string,"receipt_verified_by_name": string
            }[]
                           },
"governance_public_audit_verifier_federation_exchange_summary":
{ Args: { "requested_lookback_hours"?: number,"target_batch_id"?: string }; Returns: {
              "accepted_count": number,"attestation_count": number,"batch_id": string,"distinct_external_operator_count": number,"distinct_operator_count": number,"latest_attested_at": string,"lookback_hours": number,"needs_followup_count": number,"receipt_evidence_count": number,"receipt_pending_verification_count": number,"receipt_verified_count": number,"rejected_count": number
            }[]
                           },
"governance_public_audit_verifier_federation_package":
{ Args: { "requested_policy_key"?: string,"target_batch_id"?: string }; Returns: {
              "batch_id": string,"federation_ops_ready": boolean,"package_hash": string,"package_payload": Json,"package_version": string,"source_directory_hash": string,"source_directory_id": string
            }[]
                           },
"governance_public_audit_verifier_federation_package_distributio":
{ Args: { "requested_policy_key"?: string,"target_batch_id"?: string }; Returns: {
              "batch_id": string,"captured_at": string,"distinct_signer_count": number,"distinct_signer_jurisdictions_count": number,"distinct_signer_trust_domains_count": number,"distribution_ready": boolean,"federation_ops_ready": boolean,"last_signed_at": string,"package_hash": string,"package_id": string,"package_version": string,"required_distribution_signatures": number,"signature_count": number,"source_directory_hash": string
            }[]
                           },
"governance_public_audit_verifier_federation_package_signature_b":
{ Args: { "max_entries"?: number,"target_batch_id"?: string }; Returns: {
              "distribution_channel": string,"package_hash": string,"package_id": string,"signature_algorithm": string,"signature_id": string,"signed_at": string,"signer_jurisdiction_country_code": string,"signer_key": string,"signer_trust_domain": string
            }[]
                           },
"governance_public_audit_verifier_federation_pkg_digest_text":
{ Args: { "requested_policy_key"?: string,"target_batch_id"?: string }; Returns: {
              "batch_id": string,"digest_source_text": string,"federation_ops_ready": boolean,"package_hash": string,"package_payload": Json,"package_version": string,"source_directory_hash": string,"source_directory_id": string
            }[]
                           },
"governance_public_audit_verifier_mirror_directory_summary":
{ Args: { "max_entries"?: number,"requested_batch_id"?: string }; Returns: {
              "batch_id": string,"directory_hash": string,"directory_id": string,"directory_version": string,"is_latest_for_batch": boolean,"published_at": string,"signature": string,"signature_algorithm": string,"signer_id": string,"signer_key": string,"signer_label": string,"trust_tier": string
            }[]
                           },
"governance_public_audit_verifier_mirror_directory_trust_summary":
{ Args: { "requested_batch_id"?: string }; Returns: {
              "approval_count": number,"batch_id": string,"community_approval_count": number,"directory_hash": string,"directory_id": string,"independent_approval_count": number,"published_at": string,"reject_count": number,"required_independent_signers": number,"trust_quorum_met": boolean
            }[]
                           },
"governance_public_audit_verifier_mirror_discovered_candidate_bo":
{ Args: { "max_candidates"?: number,"status_filter"?: string }; Returns: {
              "candidate_id": string,"candidate_key": string,"candidate_label": string,"candidate_status": string,"discovery_confidence": number,"endpoint_url": string,"last_seen_at": string,"operator_label": string,"region_code": string,"source_id": string,"source_key": string,"source_label": string,"trust_domain": string,"trust_tier": string
            }[]
                           },
"governance_public_audit_verifier_mirror_discovery_source_board":
{ Args: { "max_entries"?: number }; Returns: {
              "candidate_count": number,"discovery_scope": string,"endpoint_url": string,"is_active": boolean,"last_run_at": string,"last_run_status": string,"new_candidate_count": number,"promoted_candidate_count": number,"source_id": string,"source_key": string,"source_label": string,"trust_tier": string
            }[]
                           },
"governance_public_audit_verifier_mirror_discovery_summary":
{ Args: { "requested_batch_id"?: string,"requested_lookback_hours"?: number }; Returns: {
              "active_source_count": number,"batch_id": string,"candidate_count": number,"last_run_at": string,"last_run_status": string,"lookback_hours": number,"new_candidate_count": number,"promoted_candidate_count": number
            }[]
                           },
"governance_public_audit_verifier_mirror_failover_policy_summary":
{ Args: { "requested_policy_key"?: string }; Returns: {
              "cooldown_minutes": number,"is_active": boolean,"max_failures_before_cooldown": number,"max_mirror_candidates": number,"max_mirror_latency_ms": number,"max_open_critical_federation_alerts": number,"min_healthy_mirrors": number,"min_independent_directory_signers": number,"min_onboarded_federation_operators": number,"min_policy_ratification_approvals": number,"min_signer_governance_independent_approvals": number,"mirror_selection_strategy": string,"policy_id": string,"policy_key": string,"policy_name": string,"prefer_same_region": boolean,"require_federation_ops_readiness": boolean,"require_policy_ratification": boolean,"require_signer_governance_approval": boolean,"required_distinct_operators": number,"required_distinct_regions": number,"updated_at": string
            }[]
                           },
"governance_public_audit_verifier_mirror_federation_alert_board":
{ Args: { "max_entries"?: number,"status_filter"?: string }; Returns: {
              "alert_id": string,"alert_key": string,"alert_message": string,"alert_scope": string,"alert_status": string,"opened_at": string,"resolved_at": string,"severity": string
            }[]
                           },
"governance_public_audit_verifier_mirror_federation_diversity_su":
{ Args: { "max_mirrors"?: number,"requested_batch_id"?: string }; Returns: {
              "batch_id": string,"distinct_operator_count": number,"distinct_region_count": number,"healthy_mirror_count": number,"largest_operator_mirror_count": number,"largest_operator_share_percent": number,"meets_operator_diversity": boolean,"meets_region_diversity": boolean,"required_distinct_operators": number,"required_distinct_regions": number,"selected_mirror_count": number
            }[]
                           },
"governance_public_audit_verifier_mirror_federation_onboarding_b":
{ Args: { "max_entries"?: number,"status_filter"?: string }; Returns: {
              "created_at": string,"onboarded_mirror_id": string,"operator_id": string,"operator_key": string,"operator_label": string,"operator_onboarding_status": string,"request_id": string,"request_status": string,"requested_endpoint_url": string,"requested_mirror_key": string,"requested_mirror_label": string,"requested_region_code": string,"requested_trust_domain": string,"reviewed_at": string
            }[]
                           },
"governance_public_audit_verifier_mirror_federation_operations_s":
{ Args: { "requested_alert_sla_hours"?: number,"requested_lookback_hours"?: number,"requested_policy_key"?: string }; Returns: {
              "alert_sla_breached_count": number,"alert_sla_hours": number,"approved_operator_count": number,"approved_request_count": number,"distribution_verification_lookback_hours": number,"distribution_verification_stale": boolean,"federation_ops_ready": boolean,"last_distribution_verification_run_at": string,"last_distribution_verification_run_status": string,"last_worker_run_at": string,"last_worker_run_status": string,"max_open_critical_federation_alerts": number,"min_onboarded_federation_operators": number,"onboarded_operator_count": number,"onboarded_request_count": number,"open_critical_alert_count": number,"open_distribution_bad_signature_alert_count": number,"open_distribution_policy_mismatch_alert_count": number,"open_distribution_stale_package_alert_count": number,"open_distribution_verification_alert_count": number,"open_warning_alert_count": number,"pending_request_count": number,"policy_key": string,"registered_operator_count": number,"require_federation_ops_readiness": boolean
            }[]
                           },
"governance_public_audit_verifier_mirror_health_summary":
{ Args: { "requested_batch_id"?: string,"stale_after_minutes"?: number }; Returns: {
              "endpoint_url": string,"health_status": string,"is_active": boolean,"is_stale": boolean,"jurisdiction_country_code": string,"last_check_at": string,"last_check_latency_ms": number,"last_check_status": string,"last_error_message": string,"last_observed_batch_hash": string,"last_observed_batch_id": string,"mirror_id": string,"mirror_key": string,"mirror_label": string,"mirror_type": string,"operator_label": string,"region_code": string
            }[]
                           },
"governance_public_audit_verifier_mirror_policy_hash":
{ Args: { "requested_policy_key"?: string }; Returns: {
              "min_independent_directory_signers": number,"min_policy_ratification_approvals": number,"policy_hash": string,"policy_key": string,"policy_payload": Json,"require_policy_ratification": boolean
            }[]
                           },
"governance_public_audit_verifier_mirror_policy_ratification_sum":
{ Args: { "requested_policy_key"?: string }; Returns: {
              "approval_count": number,"community_approval_count": number,"independent_approval_count": number,"latest_ratified_at": string,"min_policy_ratification_approvals": number,"policy_hash": string,"policy_key": string,"ratification_met": boolean,"reject_count": number,"require_policy_ratification": boolean,"required_independent_signers": number
            }[]
                           },
"governance_public_audit_verifier_mirror_probe_job_board":
{ Args: { "max_jobs"?: number,"requested_batch_id"?: string }; Returns: {
              "batch_id": string,"completed_at": string,"endpoint_url": string,"error_message": string,"job_id": string,"mirror_id": string,"mirror_key": string,"mirror_label": string,"observed_batch_hash": string,"observed_check_status": string,"observed_latency_ms": number,"scheduled_at": string,"status": string
            }[]
                           },
"governance_public_audit_verifier_mirror_probe_job_summary":
{ Args: { "requested_batch_id"?: string,"requested_lookback_hours"?: number,"requested_pending_sla_minutes"?: number }; Returns: {
              "batch_id": string,"completed_lookback_count": number,"failed_lookback_count": number,"lookback_hours": number,"oldest_pending_at": string,"pending_count": number,"pending_sla_met": boolean,"pending_sla_minutes": number,"running_count": number,"stale_pending_count": number
            }[]
                           },
"governance_public_audit_verifier_mirror_signer_governance_board":
{ Args: { "max_entries"?: number }; Returns: {
              "approval_count": number,"community_approval_count": number,"governance_last_reviewed_at": string,"governance_met": boolean,"governance_status": string,"independent_approval_count": number,"is_active": boolean,"latest_attested_at": string,"reject_count": number,"required_independent_approvals": number,"signer_id": string,"signer_key": string,"signer_label": string,"trust_tier": string
            }[]
                           },
"governance_public_audit_verifier_mirror_signer_governance_summa":
{ Args: { "requested_policy_key"?: string }; Returns: {
              "approved_independent_signer_count": number,"approved_signer_count": number,"governance_ready": boolean,"latest_attested_at": string,"min_signer_governance_independent_approvals": number,"pending_signer_count": number,"policy_key": string,"rejected_signer_count": number,"require_signer_governance_approval": boolean,"suspended_signer_count": number
            }[]
                           },
"gpav_emergency_access_expiry_tick":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"gpav_external_execution_cycle_tick":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"gpav_fed_exchange_receipt_automation_run_history":
{ Args: { "p_max_runs"?: number,"p_requested_lookback_hours"?: number }; Returns: {
              "critical_backlog": boolean,"open_or_ack_page_count": number,"receipt_pending_count": number,"requested_lookback_hours": number,"run_finished_at": string,"run_id": string,"run_message": string,"run_started_at": string,"run_status": string,"stale_receipt_count": number,"trigger_source": string,"triggered_by": string,"triggered_by_name": string
            }[]
                           },
"gpav_fed_exchange_receipt_automation_status":
{ Args: Record<PropertyKey, never>; Returns: {
              "cron_job_active": boolean,"cron_job_command": string,"cron_job_registered": boolean,"cron_job_schedule": string,"cron_schema_available": boolean,"latest_automation_run_finished_at": string,"latest_automation_run_message": string,"latest_automation_run_started_at": string,"latest_automation_run_status": string,"latest_automation_run_trigger_source": string,"latest_cron_run_details": string,"latest_cron_run_finished_at": string,"latest_cron_run_started_at": string,"latest_cron_run_status": string,"latest_escalation_page_opened_at": string,"latest_escalation_page_status": string,"latest_pending_receipt_attested_at": string,"latest_verified_receipt_at": string
            }[]
                           },
"gpav_fed_exchange_receipt_backlog_age_summary":
{ Args: { "requested_lookback_hours"?: number,"requested_max_receipt_age_hours"?: number,"target_batch_id"?: string }; Returns: {
              "batch_id": string,"latest_pending_attested_at": string,"lookback_hours": number,"max_receipt_age_hours": number,"oldest_pending_hours": number,"pending_24h_to_72h_count": number,"pending_over_72h_count": number,"pending_under_24h_count": number,"pending_verification_count": number,"stale_pending_count": number
            }[]
                           },
"gpav_fed_exchange_receipt_policy_event_history":
{ Args: { "max_events"?: number,"requested_lookback_hours"?: number,"requested_policy_key"?: string }; Returns: {
              "actor_name": string,"actor_profile_id": string,"created_at": string,"event_id": string,"event_message": string,"event_type": string,"metadata": Json,"policy_key": string
            }[]
                           },
"gpav_fed_exchange_receipt_policy_summary":
{ Args: { "requested_policy_key"?: string }; Returns: {
              "critical_pending_threshold": number,"critical_stale_receipt_count_threshold": number,"escalation_enabled": boolean,"lookback_hours": number,"metadata": Json,"oncall_channel": string,"policy_key": string,"policy_name": string,"receipt_max_verification_age_hours": number,"updated_at": string,"updated_by": string,"updated_by_name": string,"warning_pending_threshold": number
            }[]
                           },
"gpav_fed_exchange_receipt_tick":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"gpav_federation_dist_verification_cron_tick":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"gpav_gr_attestation_sla_sync_tick":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"gpav_gr_proof_dist_esc_tick":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"gpav_verify_federation_exchange_receipt":
{ Args: { "receipt_verification_notes"?: string,"receipt_verified": boolean,"target_attestation_id": string }; Returns: string
                           },
"happiness_owns_profile":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"has_finance_legacy_compat":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"has_finance_permission":
{ Args: { "p_permission": Database["public"]['Enums']["app_permission"] }; Returns: boolean
                           },
"has_permission":
{ Args: { "requested": Database["public"]['Enums']["app_permission"] }; Returns: boolean
                           },
"identity_verification_duplicate_of":
{ Args: { "p_case_id": string }; Returns: string
                           },
"increment_nela_moderation_event_count":
{ Args: { "target_category": string }; Returns: undefined
                           },
"ingest_civi_interaction":
{ Args: { "p_actor_profile_id"?: string,"p_answer": string,"p_answer_source": string,"p_audience": string,"p_channel": string,"p_conversation_id"?: string,"p_question": string,"p_remembered"?: boolean }; Returns: string
                           },
"ingest_civi_learned_memory":
{ Args: { "p_answer": string,"p_kind": string,"p_question": string,"p_question_key": string }; Returns: string
                           },
"ingest_development_story":
{ Args: { "p_area"?: string,"p_created_features"?: (string)[],"p_expected_behavior"?: string,"p_original_instruction": string,"p_rephrased_description"?: string,"p_requested_at"?: string,"p_section"?: string,"p_source"?: string,"p_source_story_key": string,"p_title": string }; Returns: {
              "area": string,
"author_id": string,
"chat_id": string | null,
"commit_sha": string | null,
"confidence_score": number | null,
"created_at": string,
"created_features": (string)[],
"expected_behavior": string,
"id": string,
"metadata": NonNullable<Json>,
"original_instruction": string,
"pr_number": number | null,
"published_at": string | null,
"rephrased_description": string,
"requested_at": string,
"reviewed_at": string | null,
"reviewed_by": string | null,
"section": string,
"source": string,
"source_id": string | null,
"source_story_key": string | null,
"source_type": string,
"source_url": string | null,
"status": string,
"story_kind": string,
"title": string,
"visibility": string
            }
                          SetofOptions: {
        from: "*"
        to: "development_stories"
        isOneToOne: true
        isSetofReturn: false
      } } |
{ Args: { "p_area"?: string,"p_chat_id"?: string,"p_commit_sha"?: string,"p_confidence_score"?: number,"p_created_features"?: (string)[],"p_expected_behavior"?: string,"p_metadata"?: Json,"p_original_instruction": string,"p_pr_number"?: number,"p_rephrased_description"?: string,"p_requested_at"?: string,"p_section"?: string,"p_source"?: string,"p_source_id"?: string,"p_source_story_key": string,"p_source_type"?: string,"p_source_url"?: string,"p_status"?: string,"p_story_kind"?: string,"p_title": string,"p_visibility"?: string }; Returns: {
              "area": string,
"author_id": string,
"chat_id": string | null,
"commit_sha": string | null,
"confidence_score": number | null,
"created_at": string,
"created_features": (string)[],
"expected_behavior": string,
"id": string,
"metadata": NonNullable<Json>,
"original_instruction": string,
"pr_number": number | null,
"published_at": string | null,
"rephrased_description": string,
"requested_at": string,
"reviewed_at": string | null,
"reviewed_by": string | null,
"section": string,
"source": string,
"source_id": string | null,
"source_story_key": string | null,
"source_type": string,
"source_url": string | null,
"status": string,
"story_kind": string,
"title": string,
"visibility": string
            }
                          SetofOptions: {
        from: "*"
        to: "development_stories"
        isOneToOne: true
        isSetofReturn: false
      } },
"ingest_signed_activation_demographic_feed_snapshot":
{ Args: { "ingestion_metadata"?: Json,"ingestion_notes"?: string,"measured_by_profile_id"?: string,"payload_hash"?: string,"payload_signature"?: string,"requested_observed_at"?: string,"requested_source_url"?: string,"requested_target_population": number,"signature_verified"?: boolean,"signed_payload"?: string,"target_adapter_id": string }; Returns: string
                           },
"invite_matter_participant":
{ Args: { "p_kind": string,"p_matter_id": string,"p_profile_id": string,"p_role": string,"p_unit_label"?: string }; Returns: undefined
                           },
"is_eligible":
{ Args: { "p_profile_id": string,"p_scope": string }; Returns: Json
                           },
"is_established_business_profile":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"link_challenge_source_matter":
{ Args: { "p_challenge_id": string,"p_matter_id": string }; Returns: undefined
                           },
"link_implementation_opportunity":
{ Args: { "p_opportunity_id": string,"p_project_id": string }; Returns: undefined
                           },
"link_solution_problem_matter":
{ Args: { "p_matter_id": string,"p_problem_id": string }; Returns: undefined
                           },
"linked_account_owner_ids_for_viewer":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"list_accessible_agreements":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"list_agreements_for_entity":
{ Args: { "p_entity_id": string,"p_entity_type": string }; Returns: Json
                           },
"list_ai_agents":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"list_challenge_proposal_identities":
{ Args: { "p_challenge_id": string }; Returns: {
              "avatar_url": string,"display_name": string,"profile_id": string,"proposal_id": string,"username": string
            }[]
                           },
"list_civi_interactions":
{ Args: { "p_limit"?: number }; Returns: {
              "actor_name": string,"actor_username": string,"answer": string,"answer_source": string,"audience": string,"channel": string,"created_at": string,"id": string,"question": string,"remembered": boolean
            }[]
                           },
"list_civi_learned_memories":
{ Args: { "p_limit"?: number }; Returns: {
              "answer": string,"kind": string,"question": string,"question_key": string
            }[]
                           },
"list_knowledge_resource_attribution_identities":
{ Args: { "p_resource_id": string }; Returns: {
              "attribution_kind": string,"display_name": string,"id": string,"organization_name": string,"profile_id": string,"resource_id": string,"username": string
            }[]
                           },
"list_matters":
{ Args: { "p_queue"?: string }; Returns: Json
                           },
"list_opportunity_applicant_identities":
{ Args: { "p_opportunity_id": string }; Returns: {
              "avatar_url": string,"display_name": string,"participation_id": string,"profile_id": string,"username": string
            }[]
                           },
"list_pending_governance_public_audit_events":
{ Args: { "max_events"?: number,"requested_from"?: string,"requested_to"?: string }; Returns: {
              "event_actor_id": string,"event_created_at": string,"event_digest": string,"event_id": string,"event_payload": Json,"event_position": number,"event_source": string
            }[]
                           },
"list_public_market_job_listings":
{ Args: { "p_limit"?: number,"p_mode": string }; Returns: {
              "age": string,"city": string,"country_code": string,"created_at": string,"display_name": string,"has_phone": boolean,"id": string,"is_own": boolean,"job_types": (string)[],"mode": string,"pay_amount": string,"pay_period": string,"phone_country_code": string,"region_code": string
            }[]
                           },
"list_public_matters":
{ Args: { "p_area_node_id"?: string,"p_limit"?: number,"p_matter_type"?: string,"p_scope_country_code"?: string,"p_search"?: string }; Returns: Json
                           },
"list_published_development_stories":
{ Args: Record<PropertyKey, never>; Returns: {
              "area": string,
"author_id": string,
"chat_id": string | null,
"commit_sha": string | null,
"confidence_score": number | null,
"created_at": string,
"created_features": (string)[],
"expected_behavior": string,
"id": string,
"metadata": NonNullable<Json>,
"original_instruction": string,
"pr_number": number | null,
"published_at": string | null,
"rephrased_description": string,
"requested_at": string,
"reviewed_at": string | null,
"reviewed_by": string | null,
"section": string,
"source": string,
"source_id": string | null,
"source_story_key": string | null,
"source_type": string,
"source_url": string | null,
"status": string,
"story_kind": string,
"title": string,
"visibility": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "development_stories"
        isOneToOne: false
        isSetofReturn: true
      } },
"lookup_business_accounts_for_connect":
{ Args: { "p_email"?: string,"p_limit"?: number,"p_name"?: string }; Returns: Json
                           },
"lookup_civizen_contacts_by_phone":
{ Args: { "p_phones": (string)[] }; Returns: {
              "avatar_url": string,"full_name": string,"phone_digits": string,"profile_id": string,"username": string
            }[]
                           },
"map_governance_domain_role_from_unit_membership_role":
{ Args: { "membership_role": Database["public"]['Enums']["governance_unit_membership_role"] }; Returns: string
                           },
"map_interest_lane_to_ledger_lane":
{ Args: { "p_lane": string }; Returns: string
                           },
"mark_funding_commitment_status":
{ Args: { "p_amount_usd"?: number,"p_bank_reference"?: string,"p_commitment_id": string,"p_date_received"?: string,"p_debit_account"?: string,"p_status": string,"p_transaction_hash"?: string }; Returns: Json
                           },
"mark_study_lesson_complete":
{ Args: { "p_lesson_key": string,"p_path_key": string,"p_path_lesson_keys": (string)[] }; Returns: Json
                           },
"market_job_seeker_public_name":
{ Args: { "full_name": string }; Returns: string
                           },
"matter_activate_due_outcome_followups":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"matter_activate_task":
{ Args: { "p_task_id": string }; Returns: undefined
                           },
"matter_actor_display_name":
{ Args: { "p_agent_id"?: string,"p_kind": string,"p_profile_id"?: string }; Returns: string
                           },
"matter_add_agent_party":
{ Args: { "p_agent_id": string,"p_matter_id": string,"p_role": string,"p_role_purpose"?: string }; Returns: undefined
                           },
"matter_add_party":
{ Args: { "p_kind": string,"p_matter_id": string,"p_profile_id": string,"p_role": string,"p_unit_label"?: string }; Returns: undefined
                           },
"matter_agent_run_blocked_mutations":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"matter_agent_run_context_active":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"matter_ai_agent_has_capability":
{ Args: { "p_assignment_id": string,"p_capability": string }; Returns: boolean
                           },
"matter_ai_assignment_can_read":
{ Args: { "p_assignment_id": string,"p_context_scope": string }; Returns: boolean
                           },
"matter_ai_default_capabilities":
{ Args: { "p_role_type": string }; Returns: (string)[]
                           },
"matter_ai_default_context":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"matter_assign_action":
{ Args: { "p_action_type": string,"p_assigned_agent_id"?: string,"p_assigned_kind": string,"p_assigned_profile_id": string,"p_assigned_unit_label": string,"p_context_id"?: string,"p_context_kind"?: string,"p_escalation_policy_id"?: string,"p_matter_id": string,"p_timeout_action": string,"p_timing_policy_id": string }; Returns: string
                           },
"matter_can_manage_work":
{ Args: { "p_matter_id": string }; Returns: boolean
                           },
"matter_close":
{ Args: { "p_actor_kind": string,"p_actor_profile_id": string,"p_close_kind": string,"p_is_system": boolean,"p_matter_id": string,"p_reason": string }; Returns: undefined
                           },
"matter_complete_action":
{ Args: { "p_action_id": string,"p_actor_agent_id"?: string,"p_actor_kind": string,"p_actor_profile_id": string,"p_completion_action": string }; Returns: undefined
                           },
"matter_complete_agent_run_service":
{ Args: { "payload": Json }; Returns: string
                           },
"matter_complete_current_action":
{ Args: { "p_actor_kind": string,"p_actor_profile_id": string,"p_completion_action": string,"p_matter_id": string }; Returns: undefined
                           },
"matter_duration_ms":
{ Args: { "p_unit": string,"p_value": number }; Returns: number
                           },
"matter_ensure_lead_responsibility":
{ Args: { "p_actor_kind": string,"p_actor_profile_id": string,"p_matter_id": string,"p_unit_label"?: string }; Returns: undefined
                           },
"matter_execute_escalation_step":
{ Args: { "p_action": Omit<Database["public"]['Tables']["matter_action_requirements"]['Row'], Database["public"]['Tables']["matter_action_requirements"]['ComputedFields']>,"p_step": Omit<Database["public"]['Tables']["matter_escalation_steps"]['Row'], Database["public"]['Tables']["matter_escalation_steps"]['ComputedFields']> }; Returns: undefined
                           },
"matter_find_stalled":
{ Args: Record<PropertyKey, never>; Returns: {
              "matter_id": string,"title": string
            }[]
                           },
"matter_formal_action_is_allowed":
{ Args: { "p_action": string,"p_action_type": string,"p_is_assigned": boolean,"p_is_initiator": boolean,"p_is_party": boolean,"p_lifecycle": string,"p_matter_type": string }; Returns: boolean
                           },
"matter_internal_propose_resolution":
{ Args: { "p_actions_taken": string,"p_actor_kind": string,"p_actor_profile_id": string,"p_limitations": string,"p_matter_id": string,"p_resolution_kind": string,"p_responsible_position": string,"p_summary": string }; Returns: string
                           },
"matter_is_ai_agent_forbidden_responsibility":
{ Args: { "p_agent_id"?: string,"p_intent"?: string,"p_matter_id": string }; Returns: boolean
                           },
"matter_is_responsible_lead":
{ Args: { "p_matter_id": string }; Returns: boolean
                           },
"matter_links":
{ Args: { "p_matter_id": string }; Returns: Json
                           },
"matter_log_event":
{ Args: { "p_actor_agent_id"?: string,"p_actor_kind": string,"p_actor_profile_id": string,"p_event_type": string,"p_is_system": boolean,"p_matter_id": string,"p_payload"?: Json,"p_summary": string }; Returns: undefined
                           },
"matter_notify_actor":
{ Args: { "p_body": string,"p_kind": string,"p_matter_id": string,"p_profile_id": string,"p_title": string,"p_type": string }; Returns: undefined
                           },
"matter_outstanding_work_summary":
{ Args: { "p_matter_id": string }; Returns: string
                           },
"matter_outstanding_work_tasks":
{ Args: { "p_matter_id": string }; Returns: {
              "id": string,"status": string,"title": string
            }[]
                           },
"matter_pattern_counts":
{ Args: { "p_matter_id": string }; Returns: Json
                           },
"matter_profile_display_name":
{ Args: { "p_profile_id": string }; Returns: string
                           },
"matter_release_dependents":
{ Args: { "p_completed_task_id": string }; Returns: undefined
                           },
"matter_request_shared_responsibility":
{ Args: { "p_kind": string,"p_matter_id": string,"p_profile_id": string,"p_unit_label"?: string }; Returns: string
                           },
"matter_resolution_kinds_for_type":
{ Args: { "p_matter_type": string }; Returns: (string)[]
                           },
"matter_resolve_escalation_policy":
{ Args: { "p_action_type": string,"p_explicit_policy_id"?: string,"p_matter_id": string }; Returns: string
                           },
"matter_respond_shared_responsibility":
{ Args: { "p_action": string,"p_action_id": string,"p_message": string,"p_target_kind": string,"p_target_profile_id": string }; Returns: undefined
                           },
"matter_row_json":
{ Args: { "p_id": string }; Returns: Json
                           },
"matter_sync_headline":
{ Args: { "p_matter_id": string }; Returns: undefined
                           },
"matter_task_is_blocked":
{ Args: { "p_task_id": string }; Returns: boolean
                           },
"matter_task_is_terminal_for_work":
{ Args: { "p_status": string }; Returns: boolean
                           },
"matter_upsert_task_assignment":
{ Args: { "p_agent_id": string,"p_assigned_by_kind": string,"p_assigned_by_profile_id": string,"p_kind": string,"p_profile_id": string,"p_reset_pending"?: boolean,"p_role": string,"p_task_id": string }; Returns: undefined
                           },
"maybe_escalate_activation_feed_worker_exec_page":
{ Args: { "escalation_context"?: Json,"requested_freshness_hours"?: number,"target_batch_id"?: string }; Returns: undefined
                           },
"maybe_escalate_governance_emergency_access_ops_execution_page":
{ Args: { "requested_near_expiry_window_minutes"?: number,"requested_pending_max_age_hours"?: number }; Returns: string
                           },
"maybe_escalate_guardian_relay_critical_public_execution_page":
{ Args: { "escalation_context"?: Json,"open_critical_alert_count": number,"target_batch_id"?: string,"target_proposal_id": string }; Returns: undefined
                           },
"maybe_escalate_guardian_relay_proof_distribution_exec_page":
{ Args: { "escalation_context"?: Json,"target_batch_id"?: string,"target_proposal_id": string }; Returns: undefined
                           },
"maybe_escalate_verifier_fed_exchange_receipt_page":
{ Args: { "requested_lookback_hours"?: number }; Returns: string
                           },
"maybe_escalate_verifier_federation_distribution_execution_page":
{ Args: { "escalation_context"?: Json,"open_distribution_alert_count": number,"target_batch_id": string }; Returns: undefined
                           },
"mint_luma_to_profile":
{ Args: { "p_amount_lumens": number,"p_idempotency_key": string,"p_memo"?: string,"p_target_profile_id": string }; Returns: string
                           },
"my_civic_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"my_consultation_ballot":
{ Args: { "p_election_id": string }; Returns: Json
                           },
"my_consultation_ballot_option":
{ Args: { "p_election_id": string }; Returns: string
                           },
"my_consultation_eligibility":
{ Args: { "p_election_id": string }; Returns: Json
                           },
"my_consultation_public_presence":
{ Args: { "p_election_id": string }; Returns: boolean
                           },
"my_eligibility":
{ Args: { "p_scope": string }; Returns: Json
                           },
"nela_governance_participation_comment":
{ Args: { "proposal_summary": string,"proposal_title": string }; Returns: string
                           },
"normalize_activation_scope_country_code":
{ Args: { "raw_country_code": string,"requested_scope_type": Database["public"]['Enums']["activation_scope_type"] }; Returns: string
                           },
"normalize_phone_e164":
{ Args: { "phone_country_code_input": string,"phone_number_input": string }; Returns: string
                           },
"notification_digest_candidates":
{ Args: Record<PropertyKey, never>; Returns: {
              "display_name": string,"email": string,"items": Json,"language_code": string,"profile_id": string
            }[]
                           },
"onboard_governance_public_audit_verifier_mirror_federation_requ":
{ Args: { "activate_mirror"?: boolean,"requested_metadata"?: Json,"target_request_id": string }; Returns: string
                           },
"open_governance_guardian_relay_alert":
{ Args: { "alert_key": string,"alert_message": string,"alert_scope": string,"metadata"?: Json,"severity": string,"target_proposal_id": string }; Returns: string
                           },
"open_governance_public_audit_external_execution_page":
{ Args: { "page_key": string,"page_message": string,"page_payload"?: Json,"severity": string,"target_batch_id": string }; Returns: string
                           },
"open_governance_public_audit_verifier_mirror_federation_alert":
{ Args: { "alert_key": string,"alert_message": string,"alert_scope": string,"metadata"?: Json,"severity": string }; Returns: string
                           },
"open_voting_proposal_for_support":
{ Args: { "p_proposal_id": string,"p_threshold"?: number }; Returns: Json
                           },
"opportunity_assessment_score_value":
{ Args: { "p_enabled": (string)[],"p_key": string,"p_scores": Json }; Returns: number
                           },
"opportunity_dimensions_from_payload":
{ Args: { "payload": Json }; Returns: (string)[]
                           },
"opportunity_evaluation_dimensions_are_valid":
{ Args: { "p_dims": (string)[] }; Returns: boolean
                           },
"opportunity_publisher_id":
{ Args: { "p_opportunity_id": string }; Returns: string
                           },
"participation_is_verified_completed":
{ Args: { "p_participation_id": string }; Returns: boolean
                           },
"peek_agreement_next_reference":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"perform_collaboration_action":
{ Args: { "p_action": string,"p_action_id": string,"p_message"?: string,"p_target_kind"?: string,"p_target_profile_id"?: string }; Returns: undefined
                           },
"perform_matter_formal_action":
{ Args: { "p_action": string,"p_actor_kind"?: string,"p_matter_id": string,"p_message"?: string,"p_reopen_reason"?: string,"p_target_kind"?: string,"p_target_profile_id"?: string,"p_target_unit_label"?: string }; Returns: undefined
                           },
"perform_outcome_followup":
{ Args: { "p_action_id": string,"p_notes"?: string,"p_result": string }; Returns: undefined
                           },
"perform_resolution_review":
{ Args: { "p_action": string,"p_action_id": string,"p_follow_up_choice"?: string,"p_follow_up_description"?: string,"p_follow_up_title"?: string,"p_message"?: string }; Returns: undefined
                           },
"persist_wellbeing_aggregate_snapshot":
{ Args: { "p_payload": Json }; Returns: string
                           },
"private_block_profile":
{ Args: { "target_profile_id": string }; Returns: undefined
                           },
"private_conversation_includes_profile":
{ Args: { "p_conversation_id": string,"p_profile_id": string }; Returns: boolean
                           },
"private_get_or_create_agent_conversation":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"private_get_or_create_direct_conversation":
{ Args: { "p_other_profile_id": string }; Returns: string
                           },
"private_hide_my_conversation":
{ Args: { "p_conversation_id": string }; Returns: undefined
                           },
"private_is_blocked_pair":
{ Args: { "profile_a": string,"profile_b": string }; Returns: boolean
                           },
"private_list_my_blocked_profiles":
{ Args: Record<PropertyKey, never>; Returns: {
              "blocked_at": string,"blocked_profile_id": string
            }[]
                           },
"private_list_my_conversations":
{ Args: Record<PropertyKey, never>; Returns: {
              "conversation_id": string,"disappearing_minutes": number,"disappearing_started_at": string,"kind": string,"last_at": string,"last_content": string,"last_is_e2ee": boolean,"peer_avatar_url": string,"peer_full_name": string,"peer_profile_id": string,"peer_username": string
            }[]
                           },
"private_purge_expired_disappearing_messages":
{ Args: { "p_conversation_id": string }; Returns: number
                           },
"private_set_conversation_disappearing":
{ Args: { "p_conversation_id": string,"p_minutes": number }; Returns: undefined
                           },
"private_unblock_profile":
{ Args: { "target_profile_id": string }; Returns: undefined
                           },
"process_matter_action_timeouts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"profile_has_approved_profession":
{ Args: { "allowed_professions": (string)[],"target_profile_id": string }; Returns: boolean
                           },
"profile_has_constitutional_office":
{ Args: { "requested_office": Database["public"]['Enums']["constitutional_office_key"],"target_profile_id": string }; Returns: boolean
                           },
"profile_has_governance_block":
{ Args: { "requested_scope": Database["public"]['Enums']["governance_block_scope"],"target_profile_id": string }; Returns: boolean
                           },
"profile_has_governance_domain_role":
{ Args: { "domain_keys": (string)[],"role_keys"?: (string)[],"target_profile_id": string }; Returns: boolean
                           },
"profile_is_business_account":
{ Args: { "p_profile_id": string }; Returns: boolean
                           },
"profile_is_guardian_signer":
{ Args: { "target_profile_id": string }; Returns: boolean
                           },
"project_citizenship_status":
{ Args: { "user_role": Database["public"]['Enums']["app_role"],"verified": boolean }; Returns: Database["public"]['Enums']["citizenship_status"]
                           },
"project_opportunity_contribution_event":
{ Args: { "p_participation_id": string }; Returns: undefined
                           },
"project_profile_verification_state":
{ Args: { "target_profile_id": string }; Returns: undefined
                           },
"promote_agent_decision_suggestion":
{ Args: { "p_artifact_id": string,"p_statement": string,"p_title": string }; Returns: string
                           },
"promote_governance_public_audit_verifier_mirror_discovered_cand":
{ Args: { "metadata"?: Json,"target_candidate_id": string }; Returns: string
                           },
"propose_agreement_version":
{ Args: { "p_agreement_id": string }; Returns: undefined
                           },
"propose_knowledge_gap":
{ Args: { "payload": Json }; Returns: string
                           },
"propose_knowledge_resource":
{ Args: { "payload": Json }; Returns: string
                           },
"propose_matter_agent_plan":
{ Args: { "p_assignment_id": string,"p_plan": Json }; Returns: string
                           },
"propose_matter_decision":
{ Args: { "payload": Json }; Returns: string
                           },
"propose_matter_resolution":
{ Args: { "payload": Json }; Returns: string
                           },
"public_profile":
{ Args: { "p_profile_id": string }; Returns: Json
                           },
"public_study_completions":
{ Args: { "p_profile_id": string }; Returns: Json
                           },
"publish_governance_public_audit_verifier_mirror_directory":
{ Args: { "metadata"?: Json,"signature": string,"signature_algorithm"?: string,"signer_key": string,"target_batch_id"?: string }; Returns: string
                           },
"publish_solution_record_as_resource":
{ Args: { "p_solution_id": string,"p_space_id": string }; Returns: string
                           },
"publish_voting_proposal":
{ Args: { "p_proposal_id": string }; Returns: string
                           },
"publish_voting_proposal_core":
{ Args: { "p_proposal_id": string }; Returns: string
                           },
"publisher_notification_recipients":
{ Args: { "p_publisher_profile_id": string }; Returns: (string)[]
                           },
"push_dispatch":
{ Args: { "payload": Json }; Returns: undefined
                           },
"push_vapid_public_key":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"queue_matter_agent_run":
{ Args: { "p_assignment_id": string }; Returns: string
                           },
"record_activation_demographic_feed_worker_run":
{ Args: { "actor_profile_id"?: string,"target_adapter_id": string,"worker_alert_severity"?: string,"worker_alert_type": Database["public"]['Enums']["activation_demographic_feed_alert_type"],"worker_message"?: string,"worker_metadata"?: Json,"worker_observed_at"?: string,"worker_payload_hash"?: string,"worker_resolved_at"?: string,"worker_status": Database["public"]['Enums']["activation_demographic_feed_worker_status"] }; Returns: string
                           },
"record_agreement_external_execution":
{ Args: { "p_agreement_id": string,"p_executed_at": string,"p_file_name": string,"p_file_path": string,"p_method": string,"p_note": string }; Returns: undefined
                           },
"record_challenge_outcome":
{ Args: { "p_challenge_id": string,"payload": Json }; Returns: undefined
                           },
"record_funding_commitment":
{ Args: { "p_accredited_investor_status"?: string,"p_agreement_id"?: string,"p_amount_original": number,"p_amount_usd"?: number,"p_bank_reference"?: string,"p_country"?: string,"p_currency"?: string,"p_date_pledged"?: string,"p_date_received"?: string,"p_debit_account"?: string,"p_email"?: string,"p_existing_funder_id"?: string,"p_funder_type": string,"p_interest_inquiry_id"?: string,"p_kyc_status"?: string,"p_lane": string,"p_legal_instrument_id"?: string,"p_legal_name": string,"p_notes"?: string,"p_payment_method"?: string,"p_public_display_name"?: string,"p_receipt_id"?: string,"p_restriction_code"?: string,"p_restrictions"?: string,"p_round_id"?: string,"p_sanctions_status"?: string,"p_status"?: string,"p_tax_profile_status"?: string,"p_transaction_hash"?: string }; Returns: Json
                           },
"record_funding_payment_receipt":
{ Args: { "p_amount_usd": number,"p_currency"?: string,"p_external_reference"?: string,"p_funding_commitment_id": string,"p_mark_commitment_received"?: boolean,"p_notes"?: string,"p_provider"?: string,"p_received_at"?: string }; Returns: Json
                           },
"record_governance_guardian_relay_attestation":
{ Args: { "attestation_chain_network"?: string,"attestation_chain_reference"?: string,"attestation_decision": Database["public"]['Enums']["governance_guardian_decision"],"attestation_metadata"?: Json,"attestation_payload_hash"?: string,"attestation_reference"?: string,"attestation_status"?: Database["public"]['Enums']["governance_guardian_relay_attestation_status"],"target_external_signer_id": string,"target_proposal_id": string,"target_relay_id": string,"verified_at"?: string }; Returns: string
                           },
"record_governance_guardian_relay_worker_run":
{ Args: { "error_message"?: string,"open_alert_count"?: number,"processed_signer_count"?: number,"run_payload"?: Json,"run_scope": string,"run_status": string,"stale_signer_count"?: number,"target_proposal_id": string }; Returns: string
                           },
"record_governance_public_audit_anchor":
{ Args: { "anchor_metadata"?: Json,"anchor_network": string,"anchor_reference": string,"target_batch_id": string }; Returns: boolean
                           },
"record_governance_public_audit_batch_verification":
{ Args: { "proof_payload"?: Json,"proof_reference"?: string,"target_batch_id": string,"target_verifier_id": string,"verification_hash"?: string,"verification_status": Database["public"]['Enums']["governance_public_audit_verification_status"],"verified_at"?: string }; Returns: string
                           },
"record_governance_public_audit_immutable_anchor":
{ Args: { "immutable_reference"?: string,"proof_block_height"?: number,"proof_payload"?: Json,"target_adapter_id"?: string,"target_batch_id": string,"target_network"?: string }; Returns: string
                           },
"record_governance_public_audit_network_proof":
{ Args: { "proof_block_height"?: number,"proof_network": string,"proof_payload"?: Json,"proof_reference": string,"target_batch_id": string }; Returns: string
                           },
"record_governance_public_audit_verifier_federation_exchange":
{ Args: { "attestation_metadata"?: Json,"attestation_notes"?: string,"attestation_verdict"?: string,"exchange_channel"?: string,"operator_identity_uri"?: string,"operator_jurisdiction_country_code"?: string,"operator_label": string,"operator_trust_domain"?: string,"target_package_id": string }; Returns: string
                           } |
{ Args: { "attestation_metadata"?: Json,"attestation_notes"?: string,"attestation_verdict"?: string,"exchange_channel"?: string,"operator_identity_uri"?: string,"operator_jurisdiction_country_code"?: string,"operator_label": string,"operator_trust_domain"?: string,"receipt_payload"?: Json,"receipt_signature"?: string,"receipt_signature_algorithm"?: string,"receipt_signer_key"?: string,"target_package_id": string }; Returns: string
                           },
"record_governance_public_audit_verifier_mirror_check":
{ Args: { "check_payload"?: Json,"check_status": string,"error_message"?: string,"latency_ms"?: number,"observed_batch_hash"?: string,"target_batch_id"?: string,"target_mirror_id": string }; Returns: string
                           },
"record_governance_public_audit_verifier_mirror_directory_attest":
{ Args: { "attestation_decision": string,"attestation_payload"?: Json,"attestation_signature": string,"signer_key": string,"target_directory_id": string }; Returns: string
                           },
"record_governance_public_audit_verifier_mirror_discovery_run":
{ Args: { "accepted_candidate_count"?: number,"discovered_count"?: number,"error_message"?: string,"run_payload"?: Json,"run_status"?: string,"stale_candidate_count"?: number,"target_batch_id"?: string,"target_source_id": string }; Returns: string
                           },
"record_governance_public_audit_verifier_mirror_federation_worke":
{ Args: { "approved_request_count"?: number,"discovered_request_count"?: number,"error_message"?: string,"onboarded_request_count"?: number,"open_alert_count"?: number,"run_payload"?: Json,"run_scope": string,"run_status": string }; Returns: string
                           },
"record_governance_public_audit_verifier_mirror_policy_ratificat":
{ Args: { "ratification_decision": string,"ratification_payload"?: Json,"ratification_signature": string,"requested_policy_key": string,"signer_key": string }; Returns: string
                           },
"record_governance_public_audit_verifier_mirror_signer_governanc":
{ Args: { "attestation_decision": string,"attestation_payload"?: Json,"attestation_signature": string,"attestor_signer_key": string,"target_signer_id": string }; Returns: string
                           },
"record_matter_coding_workspace":
{ Args: { "payload": Json }; Returns: string
                           },
"record_notification_digest":
{ Args: { "p_item_count": number,"p_profile_id": string,"p_through": string }; Returns: undefined
                           },
"record_opportunity_work_assessment":
{ Args: { "p_notes"?: string,"p_participation_id": string,"p_scores"?: Json }; Returns: string
                           },
"record_post_view":
{ Args: { "p_post_id": string }; Returns: {
              "total_views": number,"unique_visitors": number
            }[]
                           },
"register_activation_demographic_feed_adapter":
{ Args: { "adapter_key": string,"adapter_name": string,"adapter_type"?: Database["public"]['Enums']["activation_demographic_feed_adapter_type"],"country_code"?: string,"endpoint_url"?: string,"key_algorithm"?: string,"metadata"?: Json,"public_signer_key"?: string,"scope_type"?: Database["public"]['Enums']["activation_scope_type"] }; Returns: string
                           },
"register_governance_guardian_relay_node":
{ Args: { "endpoint_url"?: string,"key_algorithm"?: string,"metadata"?: Json,"relay_key": string,"relay_label"?: string }; Returns: string
                           },
"register_governance_public_audit_anchor_adapter":
{ Args: { "adapter_key": string,"adapter_name": string,"attestation_scheme"?: string,"endpoint_url"?: string,"metadata"?: Json,"network": string }; Returns: string
                           },
"register_governance_public_audit_verifier_mirror":
{ Args: { "endpoint_url"?: string,"jurisdiction_country_code"?: string,"metadata"?: Json,"mirror_key": string,"mirror_label"?: string,"mirror_type"?: string,"operator_label"?: string,"region_code"?: string }; Returns: string
                           },
"register_governance_public_audit_verifier_mirror_directory_sign":
{ Args: { "metadata"?: Json,"public_key"?: string,"signer_key": string,"signer_label"?: string,"signing_algorithm"?: string,"trust_tier"?: string }; Returns: string
                           },
"register_governance_public_audit_verifier_mirror_discovery_sour":
{ Args: { "discovery_scope"?: string,"endpoint_url"?: string,"metadata"?: Json,"source_key": string,"source_label"?: string,"trust_tier"?: string }; Returns: string
                           },
"register_governance_public_audit_verifier_mirror_federation_ope":
{ Args: { "contact_endpoint"?: string,"jurisdiction_country_code"?: string,"metadata"?: Json,"operator_key": string,"operator_label"?: string,"trust_domain"?: string }; Returns: string
                           },
"register_governance_public_audit_verifier_node":
{ Args: { "endpoint_url"?: string,"key_algorithm"?: string,"metadata"?: Json,"verifier_key": string,"verifier_label"?: string }; Returns: string
                           },
"release_stale_activation_demographic_feed_worker_claims":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"replace_knowledge_resource_attributions":
{ Args: { "p_items": Json,"p_resource_id": string }; Returns: undefined
                           },
"request_agreement_review":
{ Args: { "p_agreement_id": string }; Returns: undefined
                           },
"request_governance_emergency_access":
{ Args: { "request_reason": string,"target_profile_id": string }; Returns: string
                           },
"resolve_activation_demographic_feed_worker_alerts":
{ Args: { "target_adapter_id": string,"target_alert_type"?: Database["public"]['Enums']["activation_demographic_feed_alert_type"] }; Returns: number
                           },
"resolve_activation_demographic_feed_worker_escalation_page":
{ Args: { "resolution_notes"?: string,"target_page_id": string }; Returns: string
                           },
"resolve_civizen_org_profile":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"resolve_governance_execution_threshold_rule":
{ Args: { "requested_action_type": string,"requested_decision_class": Database["public"]['Enums']["governance_decision_class"] }; Returns: {
              "approval_class": Database["public"]['Enums']["governance_threshold_approval_class"],"min_approval_share": number,"min_approval_votes": number,"min_decisive_votes": number,"min_quorum": number,"requires_window_close": boolean
            }[]
                           },
"resolve_governance_guardian_relay_alert":
{ Args: { "resolution_notes"?: string,"target_alert_id": string }; Returns: string
                           },
"resolve_governance_public_audit_external_execution_page":
{ Args: { "resolution_notes"?: string,"target_page_id": string }; Returns: string
                           },
"resolve_governance_public_audit_verifier_mirror_federation_aler":
{ Args: { "resolution_notes"?: string,"target_alert_id": string }; Returns: string
                           },
"resolve_knowledge_gap":
{ Args: { "p_gap_id": string,"payload": Json }; Returns: undefined
                           },
"resolve_login_email":
{ Args: { "identifier": string }; Returns: string
                           },
"retry_matter_agent_run":
{ Args: { "p_assignment_id": string }; Returns: string
                           },
"review_business_account_access_request":
{ Args: { "p_decision": string,"p_request_id": string }; Returns: undefined
                           },
"review_governance_emergency_access_request":
{ Args: { "next_status": string,"review_notes"?: string,"target_request_id": string }; Returns: string
                           } |
{ Args: { "approved_ttl_minutes"?: number,"next_status": string,"review_notes"?: string,"target_request_id": string }; Returns: string
                           },
"review_governance_public_audit_verifier_mirror_federation_onboa":
{ Args: { "requested_review_notes"?: string,"review_decision": string,"target_request_id": string }; Returns: string
                           },
"review_matter_agent_work":
{ Args: { "p_action": string,"p_action_id": string,"p_message"?: string }; Returns: undefined
                           },
"review_opportunity_application":
{ Args: { "p_decision": string,"p_note"?: string,"p_participation_id": string }; Returns: undefined
                           },
"revoke_identity_verification":
{ Args: { "p_profile_id": string,"p_reason": string }; Returns: Json
                           },
"rollback_governance_emergency_access_ops_policy_to_event":
{ Args: { "target_event_id": string }; Returns: string
                           } |
{ Args: { "max_rollback_age_hours"?: number,"required_policy_schema_version"?: string,"target_event_id": string }; Returns: string
                           },
"rollback_gpav_fed_exchange_receipt_policy_to_event":
{ Args: { "max_rollback_age_hours"?: number,"required_policy_schema_version"?: string,"target_event_id": string }; Returns: string
                           },
"run_activation_demographic_feed_worker_schedule_automation":
{ Args: { "force_reschedule"?: boolean }; Returns: number
                           },
"run_activation_feed_worker_schedule_automation_check":
{ Args: { "force_reschedule"?: boolean,"metadata"?: Json,"run_message"?: string,"trigger_source"?: string }; Returns: {
              "adapter_issue_count": number,"evaluated_at": string,"jobs_enqueued_count": number,"open_or_ack_page_count": number,"run_id": string,"run_status": string
            }[]
                           },
"run_activation_feed_worker_schedule_automation_tick":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"run_governance_public_audit_external_execution_cycle":
{ Args: { "force_reschedule"?: boolean,"target_batch_id"?: string }; Returns: {
              "anchor_jobs_scheduled": number,"batch_id": string,"verifier_jobs_scheduled": number
            }[]
                           },
"run_governance_public_audit_verifier_cycle":
{ Args: { "target_batch_id"?: string }; Returns: number
                           },
"run_governance_public_audit_verifier_federation_distribution_ve":
{ Args: { "requested_policy_key"?: string,"run_metadata"?: Json,"stale_after_hours"?: number,"target_batch_id"?: string }; Returns: {
              "bad_signature_count": number,"captured_at": string,"distribution_ready": boolean,"last_signed_at": string,"open_alert_count": number,"package_hash": string,"package_id": string,"policy_mismatch": boolean,"run_id": string,"run_status": string,"stale_package": boolean
            }[]
                           },
"run_gpav_fed_exchange_receipt_automation_check":
{ Args: { "metadata"?: Json,"requested_lookback_hours"?: number,"run_message"?: string,"trigger_source"?: string }; Returns: {
              "critical_backlog": boolean,"escalation_evaluated_at": string,"lookback_hours": number,"open_or_ack_page_count": number,"pending_receipt_count": number,"run_id": string,"run_status": string,"stale_receipt_count": number
            }[]
                           },
"sanitize_opportunity_evaluation_dimensions":
{ Args: { "p_dims": (string)[] }; Returns: (string)[]
                           },
"save_my_score_snapshot":
{ Args: { "p_score": number,"p_snapshot"?: Json,"p_tier": string }; Returns: string
                           },
"schedule_activation_demographic_feed_worker_jobs":
{ Args: { "force_reschedule"?: boolean }; Returns: number
                           },
"schedule_activation_demographic_feed_worker_jobs_impl":
{ Args: { "force_reschedule"?: boolean }; Returns: number
                           },
"schedule_governance_public_audit_anchor_execution_jobs":
{ Args: { "force_reschedule"?: boolean,"target_batch_id"?: string }; Returns: number
                           },
"schedule_governance_public_audit_verifier_jobs":
{ Args: { "force_reschedule"?: boolean,"target_batch_id"?: string }; Returns: number
                           },
"schedule_governance_public_audit_verifier_mirror_probe_jobs":
{ Args: { "force_reschedule"?: boolean,"requested_timeout_ms"?: number,"target_batch_id"?: string }; Returns: number
                           },
"schedule_matter_outcome_followup":
{ Args: { "payload": Json }; Returns: string
                           },
"search_civizen_directory":
{ Args: { "p_exclude_profile_id"?: string,"p_limit"?: number,"p_query": string }; Returns: Json
                           },
"select_challenge_proposal":
{ Args: { "p_proposal_id": string }; Returns: string
                           },
"set_activation_demographic_feed_worker_escalation_policy":
{ Args: { "metadata"?: Json,"requested_escalation_enabled"?: boolean,"requested_escalation_severity"?: string,"requested_freshness_hours"?: number,"requested_minimum_adapter_issues_for_escalation"?: number,"requested_policy_key"?: string,"requested_policy_name"?: string }; Returns: string
                           },
"set_community_challenge_status":
{ Args: { "p_challenge_id": string,"p_status": string }; Returns: undefined
                           },
"set_consultation_public_presence":
{ Args: { "p_election_id": string,"p_visible": boolean }; Returns: boolean
                           },
"set_contribution_opportunity_status":
{ Args: { "p_opportunity_id": string,"p_status": string }; Returns: undefined
                           },
"set_funding_transparency_published":
{ Args: { "p_is_published": boolean,"p_note"?: string }; Returns: {
              "id": number,
"is_published": boolean,
"note": string | null,
"published_at": string | null,
"published_by": string | null,
"unpublished_at": string | null,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "funding_transparency_publish"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_governance_emergency_access_ops_policy":
{ Args: { "metadata"?: Json,"requested_approved_max_age_minutes"?: number,"requested_escalation_enabled"?: boolean,"requested_near_expiry_window_minutes"?: number,"requested_oncall_channel"?: string,"requested_pending_max_age_hours"?: number,"requested_policy_key"?: string,"requested_policy_name"?: string }; Returns: string
                           },
"set_governance_guardian_relay_ops_requirement":
{ Args: { "requested_max_open_critical_relay_alerts"?: number,"requested_policy_key"?: string,"requested_relay_attestation_sla_minutes"?: number,"requested_require_relay_ops_readiness"?: boolean,"requested_require_trust_minimized_quorum"?: boolean }; Returns: string
                           },
"set_governance_public_audit_external_execution_policy":
{ Args: { "metadata"?: Json,"requested_anchor_max_attempts"?: number,"requested_claim_ttl_minutes"?: number,"requested_is_active"?: boolean,"requested_oncall_channel"?: string,"requested_paging_enabled"?: boolean,"requested_paging_failure_share_percent"?: number,"requested_paging_stale_pending_minutes"?: number,"requested_policy_key"?: string,"requested_policy_name"?: string,"requested_retry_base_delay_minutes"?: number,"requested_retry_max_delay_minutes"?: number,"requested_verifier_max_attempts"?: number }; Returns: string
                           },
"set_governance_public_audit_verifier_mirror_federation_ops_requ":
{ Args: { "max_open_critical_alerts"?: number,"min_onboarded_operators"?: number,"requested_policy_key"?: string,"requested_require_federation_ops_readiness"?: boolean }; Returns: string
                           },
"set_governance_public_audit_verifier_mirror_min_independent_sig":
{ Args: { "requested_policy_key"?: string,"required_signer_count"?: number }; Returns: string
                           },
"set_governance_public_audit_verifier_mirror_policy_ratification":
{ Args: { "min_approval_count"?: number,"requested_policy_key"?: string,"require_ratification"?: boolean }; Returns: string
                           },
"set_governance_public_audit_verifier_mirror_signer_governance_r":
{ Args: { "requested_policy_key"?: string,"require_governance_approval"?: boolean,"required_independent_approvals"?: number }; Returns: string
                           },
"set_gpav_fed_exchange_receipt_policy":
{ Args: { "metadata"?: Json,"requested_critical_pending_threshold"?: number,"requested_escalation_enabled"?: boolean,"requested_lookback_hours"?: number,"requested_oncall_channel"?: string,"requested_policy_key"?: string,"requested_policy_name"?: string,"requested_warning_pending_threshold"?: number }; Returns: string
                           } |
{ Args: { "metadata"?: Json,"requested_critical_pending_threshold"?: number,"requested_critical_stale_receipt_count_threshold"?: number,"requested_escalation_enabled"?: boolean,"requested_lookback_hours"?: number,"requested_oncall_channel"?: string,"requested_policy_key"?: string,"requested_policy_name"?: string,"requested_receipt_max_verification_age_hours"?: number,"requested_warning_pending_threshold"?: number }; Returns: string
                           },
"set_knowledge_resource_status":
{ Args: { "p_resource_id": string,"p_status": string }; Returns: undefined
                           },
"set_knowledge_space_status":
{ Args: { "p_space_id": string,"p_status": string }; Returns: undefined
                           },
"set_my_privacy_settings":
{ Args: { "p_settings": Json }; Returns: Json
                           },
"set_notification_email_digest":
{ Args: { "p_enabled": boolean }; Returns: boolean
                           },
"set_profile_verified_override":
{ Args: { "p_profile_id": string,"p_reason": string,"p_verified": boolean }; Returns: Json
                           },
"sign_agreement":
{ Args: { "p_agreement_id": string }; Returns: undefined
                           },
"sign_agreement_version":
{ Args: { "p_agreement_id": string,"p_authority_attested"?: boolean,"p_electronic_records_consent": boolean,"p_electronic_signature_consent": boolean,"p_signatory_id": string,"p_signer_name": string }; Returns: undefined
                           },
"sign_governance_proposal_guardian_relay_client_verification_pac":
{ Args: { "distribution_channel"?: string,"signature": string,"signature_algorithm"?: string,"signature_metadata"?: Json,"signer_identity_uri"?: string,"signer_jurisdiction_country_code"?: string,"signer_key": string,"signer_trust_domain"?: string,"target_package_id": string }; Returns: string
                           },
"sign_governance_public_audit_verifier_federation_package":
{ Args: { "distribution_channel"?: string,"signature": string,"signature_algorithm"?: string,"signature_metadata"?: Json,"signer_identity_uri"?: string,"signer_jurisdiction_country_code"?: string,"signer_key": string,"signer_trust_domain"?: string,"target_package_id": string }; Returns: string
                           },
"slugify_username_base":
{ Args: { "source": string }; Returns: string
                           },
"start_matter_collaborative_work":
{ Args: { "p_matter_id": string }; Returns: undefined
                           },
"start_opportunity_work":
{ Args: { "p_participation_id": string }; Returns: undefined
                           },
"submit_challenge_proposal":
{ Args: { "p_challenge_id": string,"payload": Json }; Returns: string
                           },
"submit_governance_public_audit_verifier_mirror_federation_onboa":
{ Args: { "metadata"?: Json,"operator_key": string,"requested_endpoint_url"?: string,"requested_jurisdiction_country_code"?: string,"requested_mirror_key": string,"requested_mirror_label"?: string,"requested_mirror_type"?: string,"requested_region_code"?: string,"requested_trust_domain"?: string }; Returns: string
                           },
"submit_matter_evaluation":
{ Args: { "payload": Json }; Returns: string
                           },
"submit_opportunity_work":
{ Args: { "p_participation_id": string }; Returns: undefined
                           },
"sync_governance_public_audit_verifier_mirror_signer_governance_":
{ Args: { "requested_policy_key"?: string,"target_signer_id": string }; Returns: string
                           },
"sync_guardian_relay_attestation_sla_alerts":
{ Args: { "requested_attestation_sla_minutes"?: number,"requested_policy_key"?: string,"target_proposal_id": string }; Returns: undefined
                           },
"sync_profile_role_from_professions":
{ Args: { "target_profile_id": string }; Returns: undefined
                           },
"terminate_agreement":
{ Args: { "p_agreement_id": string,"p_reason": string }; Returns: undefined
                           },
"toggle_voting_proposal_support":
{ Args: { "p_proposal_id": string }; Returns: Json
                           },
"touch_civi_learned_memory":
{ Args: { "p_question_key": string }; Returns: undefined
                           },
"transfer_constitutional_office":
{ Args: { "p_new_holder": string,"p_notes"?: string,"p_office_key": Database["public"]['Enums']["constitutional_office_key"],"p_reason"?: string }; Returns: string
                           },
"transfer_luma_between_profiles":
{ Args: { "p_amount_lumens": number,"p_from_profile_id": string,"p_idempotency_key": string,"p_market_listing_id"?: string,"p_memo"?: string,"p_to_profile_id": string }; Returns: string
                           },
"unlock_market_job_contact":
{ Args: { "p_id": string }; Returns: {
              "company_name": string,"full_name": string,"id": string,"phone_country_code": string,"phone_number": string
            }[]
                           },
"update_agreement_body":
{ Args: { "p_agreement_id": string,"p_body_markdown": string }; Returns: undefined
                           },
"update_collaboration_agreement_draft":
{ Args: { "p_agreement_id": string,"p_payload": Json }; Returns: undefined
                           },
"update_community_challenge":
{ Args: { "p_challenge_id": string,"payload": Json }; Returns: undefined
                           },
"update_contribution_opportunity":
{ Args: { "p_opportunity_id": string,"payload": Json }; Returns: undefined
                           },
"update_knowledge_resource":
{ Args: { "p_resource_id": string,"payload": Json }; Returns: undefined
                           },
"update_knowledge_space":
{ Args: { "p_space_id": string,"payload": Json }; Returns: undefined
                           },
"update_market_job_interest":
{ Args: { "p_id": string,"payload": Json }; Returns: undefined
                           },
"update_voting_proposal_settings":
{ Args: { "p_ballot_method"?: string,"p_max_selections"?: number,"p_options"?: Json,"p_pass_threshold"?: number,"p_proposal_id": string,"p_quorum"?: number,"p_scope_country_code"?: string,"p_scope_kind"?: string,"p_voting_closes_at"?: string,"p_voting_opens_at"?: string }; Returns: Json
                           },
"update_voting_proposal_settings_core":
{ Args: { "p_ballot_method"?: string,"p_max_selections"?: number,"p_options"?: Json,"p_pass_threshold"?: number,"p_proposal_id": string,"p_quorum"?: number,"p_scope_country_code"?: string,"p_scope_kind"?: string,"p_voting_closes_at"?: string,"p_voting_opens_at"?: string }; Returns: Json
                           },
"upsert_content_item_from_source":
{ Args: { "target_author_id": string,"target_body_preview"?: string,"target_content_type": string,"target_metadata"?: Json,"target_professional_domain"?: string,"target_review_status"?: Database["public"]['Enums']["content_review_status"],"target_source_id": string,"target_source_table": string,"target_title"?: string }; Returns: undefined
                           },
"upsert_funding_compliance_case":
{ Args: { "p_case_id"?: string,"p_case_type": string,"p_funder_id"?: string,"p_funding_commitment_id"?: string,"p_notes"?: string,"p_priority"?: string,"p_status"?: string,"p_summary": string }; Returns: {
              "case_type": string,
"created_at": string,
"created_by": string | null,
"funder_id": string | null,
"funding_commitment_id": string | null,
"id": string,
"notes": string | null,
"priority": string,
"resolved_at": string | null,
"resolved_by": string | null,
"status": string,
"summary": string,
"updated_at": string
            }
                          SetofOptions: {
        from: "*"
        to: "funding_compliance_cases"
        isOneToOne: true
        isSetofReturn: false
      } },
"upsert_governance_public_audit_verifier_mirror_discovered_candi":
{ Args: { "candidate_key": string,"candidate_label"?: string,"candidate_status"?: string,"discovery_confidence"?: number,"endpoint_url"?: string,"jurisdiction_country_code"?: string,"metadata"?: Json,"mirror_type"?: string,"operator_label"?: string,"region_code"?: string,"run_id"?: string,"target_source_id": string,"trust_domain"?: string }; Returns: string
                           },
"upsert_governance_public_audit_verifier_mirror_failover_policy":
{ Args: { "cooldown_minutes"?: number,"is_active"?: boolean,"max_failures_before_cooldown"?: number,"max_mirror_candidates"?: number,"max_mirror_latency_ms"?: number,"metadata"?: Json,"min_healthy_mirrors"?: number,"mirror_selection_strategy"?: string,"policy_key"?: string,"policy_name"?: string,"prefer_same_region"?: boolean,"required_distinct_operators"?: number,"required_distinct_regions"?: number }; Returns: string
                           },
"verify_governance_public_audit_chain":
{ Args: { "max_batches"?: number }; Returns: Json
                           },
"verify_governance_public_audit_verifier_federation_exchange_rcp":
{ Args: { "receipt_verification_notes"?: string,"receipt_verified": boolean,"target_attestation_id": string }; Returns: string
                           },
"voting_proposal_support_summary":
{ Args: { "p_proposal_id": string }; Returns: Json
                           },
"voting_proposal_support_threshold":
{ Args: { "p_proposal_id": string }; Returns: number
                           },
"wellbeing_aggregate_can_view_scope":
{ Args: { "p_scope_id": string }; Returns: boolean
                           },
"wellbeing_aggregate_viewer_profile_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"withdraw_agreement_proposal":
{ Args: { "p_agreement_id": string }; Returns: undefined
                           },
"withdraw_consultation_ballot":
{ Args: { "p_election_id": string }; Returns: boolean
                           },
"withdraw_market_job_interest":
{ Args: { "p_id": string }; Returns: undefined
                           },
"withdraw_opportunity_participation":
{ Args: { "p_participation_id": string }; Returns: undefined
                           },
"withdraw_voting_proposal":
{ Args: { "p_proposal_id": string }; Returns: string
                           }
          }
          Enums: {
            "activation_demographic_feed_adapter_type": "signed_json_feed"|"oracle_attestation"|"manual_signed_import","activation_demographic_feed_alert_type": "freshness"|"signature_failure"|"connectivity"|"payload","activation_demographic_feed_worker_status": "ingested"|"signature_failed"|"fetch_failed"|"invalid_payload"|"ingestion_failed","activation_review_decision": "approve"|"reject"|"request_changes"|"declare_activation"|"revoke_activation","activation_review_status": "pre_activation"|"pending_review"|"approved_for_activation"|"activated"|"rejected"|"revoked","activation_scope_type": "country"|"world","app_permission": "profile.read"|"profile.update_self"|"profile.update_any"|"post.create"|"post.edit_self"|"post.delete_self"|"post.moderate"|"comment.create"|"comment.edit_self"|"comment.delete_self"|"comment.moderate"|"message.create"|"message.edit_self"|"message.moderate"|"endorsement.create"|"endorsement.review"|"endorsement.moderate"|"report.create"|"report.review"|"market.manage"|"role.assign"|"settings.manage"|"like.create"|"like.delete_self"|"law.read"|"law.contribute"|"law.review"|"build.use"|"content.read"|"content.contribute_unmoderated"|"content.contribute_moderated"|"content.review"|"content.moderate"|"profession.verify"|"updates.test"|"finance.view"|"finance.edit"|"finance.approve"|"finance.publish"|"finance.admin"|"agreements.create"|"agreements.sign_org","app_role": "guest"|"member"|"citizen"|"verified_member"|"certified"|"moderator"|"market_manager"|"admin"|"system"|"founder","citizenship_status": "registered_member"|"verified_member"|"citizen","civic_assisted_ballot_status": "draft"|"awaiting_witness"|"awaiting_steward"|"accepted"|"rejected"|"voided","civic_canvass_sample_status": "selected"|"in_review"|"cleared"|"escalated","civic_challenge_status": "open"|"upheld"|"dismissed"|"withdrawn","civic_contest_kind": "office"|"measure"|"open_nomination","civic_election_security_class": "ordinary"|"elevated"|"constitutional","civic_election_status": "draft"|"scheduled"|"open"|"closed"|"certified"|"cancelled","civic_election_tier": "neighborhood"|"local"|"district"|"regional"|"national"|"supranational","civic_risk_severity": "info"|"low"|"medium"|"high"|"critical","civic_verification_check_kind": "eligibility"|"device"|"location_home"|"solitude"|"liveness"|"face_match"|"attestation","civic_verification_check_result": "passed"|"failed"|"skipped"|"inconclusive","civic_vote_session_status": "scheduled"|"notified"|"in_progress"|"cast"|"missed"|"failed"|"voided"|"exhausted","constitutional_office_key": "founder","content_moderation_lane": "unmoderated"|"moderated","content_review_status": "draft"|"proposed"|"in_review"|"changes_requested"|"approved"|"rejected"|"archived","governance_block_scope": "proposal_create"|"vote"|"verification_review"|"execution","governance_decision_class": "ordinary"|"elevated"|"constitutional","governance_guardian_decision": "approve"|"reject","governance_guardian_relay_attestation_status": "verified"|"mismatch"|"unreachable","governance_implementation_status": "queued"|"in_progress"|"completed"|"blocked"|"cancelled","governance_proposal_status": "open"|"approved"|"rejected"|"cancelled","governance_public_audit_verification_status": "verified"|"mismatch"|"unreachable","governance_public_audit_verifier_job_status": "pending"|"completed"|"failed"|"cancelled","governance_sanction_appeal_status": "open"|"under_review"|"accepted"|"rejected"|"withdrawn","governance_threshold_approval_class": "ordinary_majority"|"supermajority"|"guardian_threshold","governance_unit_membership_role": "lead"|"member"|"observer","governance_vote_choice": "approve"|"reject"|"abstain","identity_verification_artifact_kind": "personal_info"|"contact_info"|"live_presence"|"duplicate_check"|"supporting_document","identity_verification_case_status": "draft"|"submitted"|"in_review"|"approved"|"rejected"|"revoked","identity_verification_decision": "approved"|"rejected"|"revoked","law_contribution_status": "pending"|"approved"|"changes_requested"|"rejected","law_contribution_type": "source"|"structure"|"summary","law_track": "civil"|"criminal","pillar_type": "education_skills"|"culture_ethics"|"responsibility_reliability"|"environment_community"|"economy_contribution","profession_verification_status": "pending"|"approved"|"suspended"|"revoked"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activation_demographic_feed_adapter_type": ["signed_json_feed", "oracle_attestation", "manual_signed_import"],"activation_demographic_feed_alert_type": ["freshness", "signature_failure", "connectivity", "payload"],"activation_demographic_feed_worker_status": ["ingested", "signature_failed", "fetch_failed", "invalid_payload", "ingestion_failed"],"activation_review_decision": ["approve", "reject", "request_changes", "declare_activation", "revoke_activation"],"activation_review_status": ["pre_activation", "pending_review", "approved_for_activation", "activated", "rejected", "revoked"],"activation_scope_type": ["country", "world"],"app_permission": ["profile.read", "profile.update_self", "profile.update_any", "post.create", "post.edit_self", "post.delete_self", "post.moderate", "comment.create", "comment.edit_self", "comment.delete_self", "comment.moderate", "message.create", "message.edit_self", "message.moderate", "endorsement.create", "endorsement.review", "endorsement.moderate", "report.create", "report.review", "market.manage", "role.assign", "settings.manage", "like.create", "like.delete_self", "law.read", "law.contribute", "law.review", "build.use", "content.read", "content.contribute_unmoderated", "content.contribute_moderated", "content.review", "content.moderate", "profession.verify", "updates.test", "finance.view", "finance.edit", "finance.approve", "finance.publish", "finance.admin", "agreements.create", "agreements.sign_org"],"app_role": ["guest", "member", "citizen", "verified_member", "certified", "moderator", "market_manager", "admin", "system", "founder"],"citizenship_status": ["registered_member", "verified_member", "citizen"],"civic_assisted_ballot_status": ["draft", "awaiting_witness", "awaiting_steward", "accepted", "rejected", "voided"],"civic_canvass_sample_status": ["selected", "in_review", "cleared", "escalated"],"civic_challenge_status": ["open", "upheld", "dismissed", "withdrawn"],"civic_contest_kind": ["office", "measure", "open_nomination"],"civic_election_security_class": ["ordinary", "elevated", "constitutional"],"civic_election_status": ["draft", "scheduled", "open", "closed", "certified", "cancelled"],"civic_election_tier": ["neighborhood", "local", "district", "regional", "national", "supranational"],"civic_risk_severity": ["info", "low", "medium", "high", "critical"],"civic_verification_check_kind": ["eligibility", "device", "location_home", "solitude", "liveness", "face_match", "attestation"],"civic_verification_check_result": ["passed", "failed", "skipped", "inconclusive"],"civic_vote_session_status": ["scheduled", "notified", "in_progress", "cast", "missed", "failed", "voided", "exhausted"],"constitutional_office_key": ["founder"],"content_moderation_lane": ["unmoderated", "moderated"],"content_review_status": ["draft", "proposed", "in_review", "changes_requested", "approved", "rejected", "archived"],"governance_block_scope": ["proposal_create", "vote", "verification_review", "execution"],"governance_decision_class": ["ordinary", "elevated", "constitutional"],"governance_guardian_decision": ["approve", "reject"],"governance_guardian_relay_attestation_status": ["verified", "mismatch", "unreachable"],"governance_implementation_status": ["queued", "in_progress", "completed", "blocked", "cancelled"],"governance_proposal_status": ["open", "approved", "rejected", "cancelled"],"governance_public_audit_verification_status": ["verified", "mismatch", "unreachable"],"governance_public_audit_verifier_job_status": ["pending", "completed", "failed", "cancelled"],"governance_sanction_appeal_status": ["open", "under_review", "accepted", "rejected", "withdrawn"],"governance_threshold_approval_class": ["ordinary_majority", "supermajority", "guardian_threshold"],"governance_unit_membership_role": ["lead", "member", "observer"],"governance_vote_choice": ["approve", "reject", "abstain"],"identity_verification_artifact_kind": ["personal_info", "contact_info", "live_presence", "duplicate_check", "supporting_document"],"identity_verification_case_status": ["draft", "submitted", "in_review", "approved", "rejected", "revoked"],"identity_verification_decision": ["approved", "rejected", "revoked"],"law_contribution_status": ["pending", "approved", "changes_requested", "rejected"],"law_contribution_type": ["source", "structure", "summary"],"law_track": ["civil", "criminal"],"pillar_type": ["education_skills", "culture_ethics", "responsibility_reliability", "environment_community", "economy_contribution"],"profession_verification_status": ["pending", "approved", "suspended", "revoked"]
          }
        }
} as const
