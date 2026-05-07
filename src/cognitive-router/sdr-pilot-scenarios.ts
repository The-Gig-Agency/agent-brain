import type { SdrPilotInput, SdrProspectingMode } from "./sdr-pilot.js";
import type { SearchRegime } from "./types.js";

export type SdrPilotScenario = {
  id: string;
  title: string;
  input: SdrPilotInput;
  expected_mode: SdrProspectingMode;
  expected_primary_regime: SearchRegime;
};

export const SDR_PILOT_SCENARIOS_V0_1: SdrPilotScenario[] = [
  {
    id: "thin-good-fit-list",
    title: "Good-fit accounts but thin list coverage",
    input: {
      org_id: "demo-org",
      seat_id: "seat-west-1",
      execution_scope: "seat",
      surface: "list_building",
      icp_completeness: "medium",
      recent_prospect_yield: "low",
      fit_quality: "high",
      contact_coverage: "low",
      territory_saturation: "medium",
      downstream_capacity: "available",
      active_pipeline_inventory: "low",
      operator_note: "Good-fit accounts exist, but coverage is thin and the seat feels stuck.",
      missing_information: ["title coverage by segment", "regional whitespace outside current list"],
    },
    expected_mode: "hold_and_refine_icp",
    expected_primary_regime: "explore",
  },
  {
    id: "full-pipeline-harvest",
    title: "Healthy inventory with no downstream room",
    input: {
      org_id: "demo-org",
      execution_scope: "org",
      surface: "pipeline_review",
      icp_completeness: "high",
      recent_prospect_yield: "high",
      fit_quality: "high",
      contact_coverage: "medium",
      territory_saturation: "medium",
      downstream_capacity: "full",
      active_pipeline_inventory: "high",
      operator_note: "Plenty of qualified inventory already exists and the team is capacity constrained.",
    },
    expected_mode: "pipeline_harvest",
    expected_primary_regime: "compound",
  },
  {
    id: "high-volume-low-fit",
    title: "Plenty of leads but poor fit",
    input: {
      org_id: "demo-org",
      seat_id: "seat-east-2",
      execution_scope: "seat",
      surface: "territory_segmentation",
      icp_completeness: "high",
      recent_prospect_yield: "high",
      fit_quality: "low",
      contact_coverage: "medium",
      territory_saturation: "high",
      downstream_capacity: "available",
      operator_note: "The rep is getting volume, but the territory feels noisy and misaligned.",
    },
    expected_mode: "territory_refinement",
    expected_primary_regime: "prune",
  },
  {
    id: "good-accounts-poor-contacts",
    title: "Strong account fit but weak contact coverage",
    input: {
      org_id: "demo-org",
      execution_scope: "org",
      surface: "enrichment",
      icp_completeness: "high",
      recent_prospect_yield: "high",
      fit_quality: "high",
      contact_coverage: "low",
      territory_saturation: "low",
      downstream_capacity: "available",
      active_pipeline_inventory: "medium",
      operator_note: "Account quality is good; the missing piece is decision-maker coverage.",
    },
    expected_mode: "enrichment_first",
    expected_primary_regime: "coordinate",
  },
];
