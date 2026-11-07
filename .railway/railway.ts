import { defineRailway, github, project, service } from "railway/iac";
// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "agent-brain";
export default defineRailway((ctx) => {
  if (!ctx.isEnvironment("production")) {
    throw new Error("This configuration manages Agent Brain production only.");
  }
  const agentBrain = service("agent-brain", {
    source: github("The-Gig-Agency/agent-brain", { branch: "master", checkSuites: false }),
    build: { buildCommand: "npm run build", buildEnvironment: "V3", builder: "NIXPACKS" },
    start: "npm run start:router-recommend:v1",
    healthcheck: "/health",
    healthcheckTimeout: 300,
    replicas: { "us-west2": 1 },
    deploy: {
      restartPolicyMaxRetries: 3,
      // Railway omits its verified ON_FAILURE / awake defaults from the stored
      // graph. Declaring them explicitly produces perpetual no-effect drift.
      // Verify both effective values after deploy; see .railway/README.md.
    },
  });

  return {
    ...project("gallant-bravery", { resources: [agentBrain] }),
    // CLI 5.71 variable policy is metadata outside SDK 3.16's project() input.
    variables: { managed: false },
  };
});

