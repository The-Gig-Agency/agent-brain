# Cognitive Router App Concept (v1)

**Date:** 2026-05-03
**Status:** Internal concept
**Canonical home:** `/docs/cognitive-router`

## Working Thesis

This is viable as an app if it is framed as a thinking-style router rather than an answer machine.

The core product value is not "tell me what to do."
It is:

- identify the terrain of the problem
- select the best search or optimization regime for that terrain
- explain why that regime fits
- suggest a practical operating mode
- provide a counter-lens to prevent overfitting

That makes the product feel useful, rigorous, and teachable rather than mystical.

## Why Now

This idea becomes more valuable in the AI era because agents make search failures visible, expensive, and measurable.

Why this matters now:

- agents expose search failures more clearly than humans do
- LLMs are flexible enough to switch reasoning regimes dynamically
- tool use and memory make routing operational rather than theoretical
- inference and tool costs make bad search economically expensive
- agent workflows create evaluation traces, so regime quality can actually be benchmarked

Without this framing, the concept can sound like metaphorical decision advice.

With this framing, it becomes:

- a control layer for agent search quality
- a cost and capability optimization system
- a measurable orchestration primitive

## Product Positioning

Candidate framing:

- "A decision engine that maps real-world problems to proven search strategies from AI, biology, and optimization."
- "A cognitive router for messy decisions."
- "A system that helps people choose the right thinking process for the landscape they are in."

The strongest positioning is probably:

- not an oracle
- not a therapist
- not a generic productivity coach
- a search-strategy selector for real-world decisions

This is close to governance for thought processes.

## Core Insight

The routing should be based on problem terrain, not problem category.

The user should not have to choose from labels like:

- career
- startup
- product
- team
- strategy

Instead, the system should classify the structure of the problem:

- feedback speed
- reversibility
- uncertainty
- number of options
- strategic behavior from other agents
- stability vs shifting conditions
- whether the user needs one decision or an adaptive process
- whether the user is exploring, pruning, scaling, refining, or escaping a local minimum

That is the real engine.

## Terrain As A Universal Model

The deeper claim here is that difficult problems share latent topological properties even when they come from very different domains.

Possible terrain properties:

- ruggedness
- reversibility
- feedback latency
- adversariality
- branching factor
- local minima density
- information cost
- coordination load
- environmental stability

Under this view, the same terrain descriptors can apply across:

- startups
- coding
- psychology
- strategy
- organizational design
- agentic systems

That means the core innovation may be larger than the app itself.

It suggests a general theory:

- many hard problems can be routed by topology rather than by topic

This is why the terrain schema deserves to be elevated near the front of the concept, not treated as an implementation detail later.

## Example Terrain-to-Lens Mapping

| Problem terrain | Best thinking style |
| --- | --- |
| Clear feedback, incremental improvement | Gradient Descent |
| Noisy feedback, many attempts possible | SGD |
| Need consistency through friction | Momentum |
| Need to anticipate downstream effects | Nesterov |
| Unknown landscape, few data points | Bayesian Optimization |
| Too many options, need pruning | Branch and Bound |
| Stuck in a local minimum | Simulated Annealing / Tabu Search |
| Multi-agent incentives | Game Theory |
| Need long-term habit/reward shaping | Reinforcement Learning |
| Need team/org specialization | Mixture of Experts |
| Need creative refinement | Diffusion |
| Need broad experimentation | Evolution Strategies / CMA-ES |
| Need progressive skill-building | Curriculum Learning |
| Need to improve the learning process itself | Meta-Learning |

## User Experience Shape

The user does not enter:

- "Should I change jobs?"

Instead, they describe the situation and answer a short set of terrain questions such as:

- Is feedback fast or slow?
- Is the downside reversible?
- Are other agents strategic?
- Are you stuck, scaling, exploring, pruning, or refining?
- Is the terrain stable or shifting?
- Do you need one decision or an adaptive process?

Then the system returns:

- primary algorithm lens
- secondary supporting lens
- opposing lens
- why it fits
- risks and blind spots
- strategy prompts
- concrete next actions

Example:

> Your problem looks like Bayesian Optimization plus Simulated Annealing.
> Run small experiments that maximize information, tolerate early weirdness, then narrow.

That is genuinely useful because it changes process, not just opinion.

## MVP Recommendation

Build the MVP as:

- free-text problem input
- terrain questionnaire
- structured scoring engine
- LLM-assisted terrain extraction
- deterministic lens ranking
- explanation renderer

Do not build it as a pure LLM classifier.

Better architecture:

1. user describes the problem in free text
2. app extracts an initial terrain profile
3. app asks 5 to 8 clarification questions
4. scoring logic ranks candidate lenses
5. app returns primary lens, counter-lens, risks, and actions

The LLM should help interpret and explain.
The app logic should own the final routing.

## Why This Matters

Most agents already switch between these modes implicitly, but badly and inconsistently.

Today many agents are trapped in:

- linear decomposition
- chain-of-thought
- shallow retry loops
- brute-force tool iteration

That is basically gradient descent with caffeine.

Many real-world tasks are not gradient-friendly.

Examples:

- coding bug
  - better fit: Branch and Bound, Tabu Search, Bayesian hypothesis elimination
  - common failure mode: retrying the same fix, revisiting failed states, weak forbidden-path memory
- GTM strategy
  - better fit: Multi-Armed Bandits, Bayesian Optimization, evolutionary search
  - common failure mode: premature convergence, overfitting to the first plausible idea
- organizational design
  - better fit: Mixture of Experts, swarm intelligence, Game Theory
  - common failure mode: monolithic centralized reasoning
- creative ideation
  - better fit: Diffusion, Simulated Annealing, evolutionary recombination
  - common failure mode: becoming deterministic too quickly

This points toward a real frontier:

- meta-cognitive routing

Meaning:

- choose the correct search or optimization regime for the terrain before solving

Humans already do this imperfectly and often subconsciously:

- brainstorming mode
- analytical mode
- pruning mode
- exploration mode
- execution mode
- political mode
- negotiation mode

Current agents barely do.

## Agent-Specific Framing

This idea may be even stronger for agents than for a human-facing app.

Why:

- it attacks a real failure mode rather than just offering a clever metaphor
- agents already use implicit search strategies, but badly
- most current systems overuse one regime, usually serial trial-and-error
- a routing layer that selects the search mode to fit the terrain could create real capability gains

This framing explains a large share of present agent weakness in one model:

- repeated shallow retries
- poor memory of failed paths
- premature convergence
- weak adaptation to exploration vs exploitation demands
- monolithic reasoning in terrains that need specialization

The best framing here is probably not:

- "agents inspired by optimization"

It is:

- meta-cognitive orchestration for agent search

That framing is more serious, more architectural, and more testable.

## Strongest Agent Wedge

The most compelling early use cases are:

- debugging
- strategic planning under uncertainty
- exploration vs exploitation tasks
- multi-step workflows where naive retries are expensive

These are all domains where the wrong search regime produces obvious waste.

## Control-System Version

To avoid staying conceptual, the product should behave like a control system:

1. terrain detection
2. search-policy selection
3. explicit memory of failed paths
4. counter-regime check
5. outcome scoring so routing improves over time

That is a much stronger implementation direction than:

- static labels
- metaphor-first UX
- hand-wavy "this problem is like SGD" explanations

The value comes from improved agent performance, not from elegant naming.

## Future Architecture

An interesting long-term architecture is an Agent Cognitive Orchestrator:

1. problem classifier
2. reasoning-topology selector
3. specialized search regime
4. opposing-regime cross-check
5. synthesis layer

Example:

User asks:

- "Should we pivot the product?"

System detects:

- sparse data
- partially irreversible costs
- uncertain market
- strategic competitors

System routes to:

- Bayesian Optimization
- Game Theory
- Real Options thinking
- Simulated Annealing

System avoids:

- naive deterministic planning

This becomes more powerful when paired with:

- tool use
- memory
- MCPs
- multi-agent orchestration

Then the system can instantiate specialized roles based on search dynamics, not personality:

- Explorer Agent
- Optimizer Agent
- Constraint Agent
- Adversarial Agent
- Meta-Learning Agent

That is a meaningfully different design from "five agents with different tones."
It is "five agents with different optimization processes."

## MVP Regime Scope

For the first serious agent MVP, start with four regimes only:

- pruning and elimination
- exploratory search
- exploitation and compounding
- adversarial or multi-agent reasoning

This is probably better than launching with a large taxonomy because:

- it is easier to evaluate
- routing mistakes become easier to diagnose
- policy behavior stays legible
- the team can measure whether regime selection improves outcomes before adding nuance

These can later expand into finer-grained lenses such as:

- Branch and Bound
- Tabu Search
- Bayesian Optimization
- Momentum
- Game Theory
- Mixture of Experts

But the first version should prove routing value before ontology breadth.

## Regime Failure Modes

To make the framework rigorous, each regime should ship with explicit failure modes.

Example failure-mode table:

| Regime | Common failure mode |
| --- | --- |
| Momentum | Doubles down too long after initial signal |
| Bayesian Optimization | Analysis paralysis from over-valuing uncertainty reduction |
| Simulated Annealing | Endless wandering without convergence pressure |
| Game Theory | Paranoia or over-strategizing around other agents |
| Gradient Descent | Getting trapped in local minima |
| Diffusion | Producing novelty without convergence |
| Branch and Bound | Over-pruning before enough exploration |
| Evolutionary Search | Burning resources on too many weak variants |

This matters for two reasons:

- it makes recommendations feel more psychologically real
- it gives the product a built-in self-critique mechanism

The system should not only say:

- "Here is the recommended regime."

It should also say:

- "Here is how this regime tends to fail if overused."

## Regime Transitions

One of the deepest parts of the framework may not be regime selection alone.

It may be regime transition logic:

- when to move from exploration to exploitation
- when to move from pruning to scaling
- when to move from diffusion to convergence
- when to move from experimentation to momentum

This mirrors real dynamics in:

- startups
- evolution
- learning
- warfare
- scientific discovery

The long-term product should probably reason about:

- which regime fits now
- which regime should come next
- what signal should trigger the transition

That means the real orchestration unit is not just a chosen mode.
It is:

- a sequence of search regimes across time

This may become one of the most defensible and useful layers in the system.

## Proposed Product Architecture

### Frontend

- Next.js or React app
- conversational input flow
- terrain-question stepper
- result card with expandable explanation
- saved runs and comparison history later

### Backend

- small Node or Next.js API layer
- one extraction route
- one scoring route
- optional persistence layer

### LLM Role

Use the model for:

- extracting terrain from free text
- identifying ambiguity
- generating explanations and prompts

Do not use the model as the final scoring authority.

### App-Owned Logic

Use deterministic code for:

- terrain schema normalization
- lens scoring
- confidence thresholds
- opposing-lens selection
- next-step template generation

## Suggested Data Model

```ts
type TerrainProfile = {
  feedbackSpeed: "fast" | "medium" | "slow";
  reversibility: "high" | "medium" | "low";
  agentStrategicBehavior: "none" | "some" | "high";
  uncertainty: "low" | "medium" | "high";
  optionCount: "few" | "many";
  localMinimaRisk: "low" | "medium" | "high";
  environmentStability: "stable" | "shifting";
  horizon: "one-shot" | "iterative";
  needForCoordination: "low" | "medium" | "high";
  creativityVsOptimization: "optimization" | "mixed" | "creative";
};

type Lens = {
  id: string;
  name: string;
  bestFor: Partial<TerrainProfile>;
  antiPatterns: string[];
  prompts: string[];
  actions: string[];
  opposingLens?: string;
};
```

## Suggested Lens Output

For each recommendation, return:

- `primaryLens`
- `secondaryLens`
- `opposingLens`
- `fitRationale`
- `blindSpots`
- `strategyPrompts`
- `nextActions`
- `confidence`
- `missingInformation`

Example startup case:

- problem: "My startup has 5 possible customer segments and limited budget."
- primary lens: Bayesian Optimization
- secondary lens: Simulated Annealing
- opposing lens: Momentum

Why:

- many options
- limited budget
- high uncertainty
- need to learn before scaling

Guidance:

- run cheap tests across segments
- prioritize experiments that reduce uncertainty fastest
- avoid picking the biggest-looking market too early

Counter-lens reminder:

- once signal appears, stop endlessly testing and start compounding

## Risks

Main product risks:

- being too cute with the metaphor
- sounding more rigorous than the system actually is
- overfitting every problem to a single elegant algorithm label
- using the wrong amount of abstraction for mainstream users
- becoming a taxonomy layer with no performance gain
- routing too rigidly, where the classifier becomes another overfit heuristic

Design response:

- always explain in plain language
- always provide practical next actions
- always include an opposing lens
- treat algorithm labels as operating modes, not mystical truths
- measure outcome quality and policy usefulness, not just classification neatness
- keep the first regime set small enough to evaluate honestly

## Long-Term Moat

The moat is probably not the ontology by itself.

Anyone can copy:

- "algorithms as thinking styles"

The harder and more defensible layer is:

- proving that certain routing policies improve outcomes in certain terrains

That pushes the product toward:

- agent benchmarks
- workflow efficiency measurement
- debugging success rates
- planning quality assessment
- reduced retries
- lower token and tool costs

That is where the idea becomes serious rather than merely elegant.

## Philosophical Thesis

A hidden but important thesis inside this concept is:

- intelligence is not a singular capability
- it is adaptive selection among search regimes

Humans are probably not effective because they run one optimizer well.
They are effective because they can:

- switch modes
- recurse on strategy
- change exploration pressure
- vary abstraction level
- coordinate specialists
- simulate adversaries
- shift time horizons dynamically

That framing is useful because it connects:

- human cognition
- organizations
- evolution
- science
- agent systems

It also makes the product feel less like a novelty app and more like an applied theory of adaptive intelligence.

## Strong Product Principle

The system should never behave like:

- "Here is the answer."

It should behave like:

- "Here is the most appropriate way to search this landscape."

That distinction is the product.

## Recommended MVP Build Sequence

1. Define the terrain schema.
2. Define 10 to 15 initial cognitive lenses.
3. Write a simple weighted scoring engine.
4. Add an LLM extraction prompt that returns structured JSON.
5. Build a short terrain questionnaire to correct extraction mistakes.
6. Render a result page with primary lens, opposing lens, risks, and actions.
7. Add 20 to 30 canonical example problems for evaluation.
8. Tune weights using those examples before adding more UI complexity.

## Next Steps

Immediate next steps:

1. Write the canonical terrain dimensions and allowed values as a small spec.
2. Define the first regime library, starting with four regimes for the agent MVP.
3. Create a scoring matrix from terrain dimensions to regime weights.
4. Add a first pass at regime failure modes and transition triggers.
5. Define failed-path memory rules and counter-regime checks.
6. Draft the LLM extraction prompt and required JSON schema.
7. Build a paper prototype of the questionnaire and result view.
8. Test the system on debugging, GTM decisions, and product prioritization before expanding.
9. Add outcome scoring so the router can be evaluated and improved.
10. Only after those pass, scaffold the actual app.

Suggested build order after documentation:

1. `/spec/terrain-schema.md`
2. `/spec/regime-library.md`
3. `/spec/scoring-model.md`
4. `/spec/regime-failure-modes.md`
5. `/spec/regime-transitions.md`
6. `/spec/failed-path-memory.md`
7. `/spec/prompt-contract.md`
8. `/spec/eval-framework.md`
9. `/ui/wireframes.md`
10. MVP app scaffold

## Decision

This is not just possible.
It is probably strongest when built as:

- a cognitive routing engine
- with structured terrain classification
- backed by deterministic ranking logic
- explained through algorithmic operating modes
- and protected by counter-lenses to avoid false certainty

That feels like a real product, not just a clever analogy.
