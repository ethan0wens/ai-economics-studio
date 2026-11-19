# Moderated estimation usability study

Recruit three to five people unfamiliar with the studio. Include a business workload owner, a Microsoft AI architect and a product or financial reviewer. Give each person 35–45 minutes. Assign a primary scenario by role and offer a second if time permits. Rotate the order when a participant takes two scenarios. Start each with an empty workspace, a current catalogue and the same fictional task card. Record the environment, date, catalogue ID and browser or assistive technology used.

## Participant instructions

Think aloud while you work through the task. You can use any help available in the studio. We are evaluating the tool. You may skip a question or stop at any time. Use the fictional figures supplied, with no organisation names, real consumption or contracts. If information is missing, handle it the way you would when sharing a real estimate. Ask for consent before taking notes, and separately before any screen recording. Keep agreed notes under a participant ID and delete any exports or recordings according to your study's consent and retention agreement.

## Tasks and completion criteria

| Scenario | Participant task card | Moderator completion criteria |
| --- | --- | --- |
| A. Internal Foundry assistant | Estimate the new cost of an internal assistant for 200 monthly active staff and ten interactions each. Your technical team forecasts two requests per interaction, 1,500 input and 300 output tokens per request. Choose the documented GPT-4.1 mini Global configuration for UK South if available, set actual region to UK South, and share an initial PDF. | Creates and names a Foundry workload, previews or enters 2,000 runs at two calls each and correctly explains 6 million input and 1.2 million output tokens. Distinguishes currently resolved costs from any remaining rate or compatibility gaps. Exports an intelligible PDF. |
| B. Copilot Studio business agent | Plan a business agent for which the customer forecasts 10,000 monthly credits for answers and 5,000 for action activity. The owner has suggested that a licence could cover some activity but gives no scope, amount or expiry. Prepare an estimate and explain what the team should confirm before purchasing. | Creates a platform-managed Copilot agent and enters a gross 15,000 credits with one pay-as-you-go basis. Explains what evidence would justify an allowance or prepaid pack and finds the credits guidance. Keeps the suggested allowance unresolved and identifies any missing rates. |
| C. Enterprise environment | Give a reviewer a report that includes 200 already-owned Microsoft 365 E3 seats costing a fictional £4,000 monthly, 40 proposed Microsoft 365 Copilot seats and 240 search-unit-hours of Azure AI Search Basic in UK South. Include two Foundry agents sharing a single provisioned deployment of 15 PTUs with 400 monthly billable hours. A custom service with no verified price must appear as a gap. | Finds Advanced or edits the enterprise and shared examples as starting points. Keeps existing spend separate from incremental charges, links both agents to the same deployment and explains why only one fixed capacity charge appears. Identifies a known subtotal and missing charge separately. Exports a report with pricing basis, dependencies and gaps. |

Offer [AI Adoption & Business Case](#/examples/ai-adoption-business-case) as an optional follow-up to any task. Ask the participant to find the walkthrough, explain the accepted cost and productivity evidence, compare adoption before and after an explicit link, and describe which assumptions appear in each export. Ask how they would verify the planned control in the actual tenant.

## Moderator checklist

- Start timing when the participant reads the task. Mark first usable estimate when they can explain the workload quantity, monthly scope and material gaps. Stop timing at export or when the participant stops.
- Observe entry points, backtracking, terminology read aloud, opening help, returning to the same field and use of keyboard or touch where applicable.
- Record the first incorrect assumption, its effect, whether the participant noticed it and how they resolved it. Record whether the participant confused annualisation with a forecast or known costs with a full total.
- Allow unassisted exploration. When asked, start with one neutral prompt such as “Where would you look next?” If a specific hint is necessary, record it and mark the task as assisted.
- Compare the applied values with the task card. For Scenario A independently multiply users, interactions, calls and tokens. For B sum entered credits before any eligibility question. For C expect 6,000 PTU-hours once and retained E3 spend outside incremental cost. Use the current catalogue only for independently checking matching rates.

## Interview

1. What would you tell a colleague the monthly amount covers? What would you ask them to confirm?
2. Where did the usage assumptions come from? What would you change first with better evidence?
3. What did you expect the annual amount, price forecast or usage comparison to represent?
4. Was any terminology unclear? Where did you look for an explanation?
5. How confident are you explaining the result to a reviewer on a scale of 1–5? What would raise that score?

## Results template

| Participant ID and role | Task | Completion (unassisted, assisted, partial, stopped) | Time to first usable estimate and export | Assistance count and prompts | Misunderstood terms/assumptions | Help found and gaps resolved | Cost interpretation | Confidence 1–5 | Observation and severity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| _Fill in during each session_ | | | | | | | | | |

Classify issues as **critical** when a credible-looking estimate has a misleading financial result or the task is impossible, **major** when completion requires assistance or a workaround, **moderate** when confusion is recoverable but delays work, and **minor** for small presentation friction. Prioritise financial integrity and critical issues first, then rank by severity, number of affected participants and reach across roles. Record one proposed corrective change and a re-test criterion for each prioritised finding. Human sessions are pending. The studio collects no study data.
