# TaxTap validation report
Date: 14 April 2026
Source reviewed: `TaxTap_Full_System_Release_MINIMAL_FIX.zip`

## Bottom line
This build is **real and usable**, but it is **not yet fully aligned with the TaxTap master product definition**.

The strongest issue is not a crash. It is a **product-truth issue**:

- the app's main hero number says **"You keep"**
- but the calculation behind that number is **income minus tax only**
- it does **not** subtract normal business costs from that headline number
- the actual after-tax, after-cost number is shown separately as **"Disposable"**

That means the app currently risks answering a different question from the one the product is supposed to own.

Your master definition says the whole product exists to answer:

> "What do I actually keep?"

In this build, the top number does **not consistently mean that**.

---

## What is working

### Core app structure
The package is a self-contained local browser app with the main logic inside `TaxTap.html` / `app_bundle.js`.

Main screens present:
- Home
- Add
- Play
- Timeline
- Settings

### Core data model
The app contains:
- tax year handling
- quarterly filtering
- year-end view handling
- mileage allowance logic
- staff-cost entries
- recurring monthly entries
- local save/load backup
- light audit trail
- tax-year profile generation for future years

### Tax-year logic
The code correctly contains:
- tax year boundaries starting on **6 April**
- quarter mapping:
  - Q1: 6 Apr to 5 Jul
  - Q2: 6 Jul to 5 Oct
  - Q3: 6 Oct to 5 Jan
  - Q4: 6 Jan to 5 Apr
- automatic future profile generation around the current year
- separate quarterly update and year-end prep views

### Import/export and persistence
The build includes:
- `Save my data`
- `Load my data`
- local reset with confirmation
- normalized state loading for older or incomplete saves

### Add flow
The add flow is broadly sound:
- income entry
- expense entry
- mileage entry
- staff cost entry
- edit existing entries
- cancel edit
- recurring monthly setup for non-income items

### Play flow
Play is not fake. It has a real simulation layer and updates from typed values.
It correctly calculates:
- extra income
- extra cost
- extra mileage
- extra staff cost
- rough tax after the hypothetical move

---

## What does not match the product definition yet

## 1. Main promise mismatch: "You keep" is not truly what the user keeps
This is the biggest issue.

Current code in `totals()` does this:
- `keep = income - tax`
- `disposable = keep - cashExpense`

So the home hero card uses **keep**, not **disposable**.

### Why this matters
A user with:
- income = £1,000
- expenses = £200
- mileage deduction = £45

gets:
- profit = £755
- tax = £196.30
- **keep = £803.70**
- **disposable = £603.70**

If the app headline says **"You keep £803.70"**, that is not what they actually keep in normal language.
That is closer to **"income after tax"**, not **"money left after tax and tracked costs"**.

### Product impact
This directly conflicts with the master prompt.

### Required fix
Pick one truth and make the whole system obey it:
- either top-line number becomes true after-tax, after-cost money left
- or rename the current top-line everywhere to something like `After tax` and make the real core number the headline

For TaxTap as defined, the correct choice is:
- **headline metric should be what is left after tax and tracked costs**

---

## 2. Play mode language is off-brand
The Play screen currently uses language such as:
- `Money gameboard`
- `Game mode`
- `Try a move`
- `See the score change`
- `Your scoreboard`
- `Live score`

### Why this matters
Your master prompt is explicit:
- it is **not a game**
- it should build **confidence**, not gamification
- it should feel subtle, calm, and adult

### Required fix
Keep the functionality, change the framing.
Use wording closer to:
- `What if`
- `Try a change`
- `See the impact`
- `You keep now`
- `You would keep`
- `Reset changes`

The current behaviour layer is useful.
The current wording is wrong.

---

## 3. Settings is too technical for the product identity
The settings screen includes labels such as:
- `Tax-year rule engine`
- `Basic rate`
- `Higher rate`
- `Basic band`
- `Live period rule`

### Why this matters
Your product definition says:
- no accounting language
- no jargon
- simple front, clever background

The current settings page exposes too much internal machinery.

### Required fix
Keep the logic, but soften and hide the engineering language.
Examples:
- `Tax-year rule engine` -> `Tax year settings`
- `Basic band` -> `Income limit before higher tax`
- `Use this tax year everywhere` -> `Use these rules now`
- group advanced items under a calm expandable section if needed

---

## 4. There is no proper in-system product guardrail file
The package contains:
- README
- changelog
- test check report
- fix report

But none of those acts as the definitive:
- product identity file
- non-negotiable design guardrails file
- future developer anti-drift file

### Why this matters
Without this, future changes can easily drift into:
- bookkeeping software
- dashboard bloat
- jargon-heavy tax tool
- feature creep

### Required fix
Ship a dedicated file inside the system package:
- `TAXTAP_PRODUCT_RULES.md`

It should state:
- what TaxTap is
- what it is not
- core loop
- core metric definition
- Play principles
- wording rules
- UI rules
- list of forbidden drift paths

---

## 5. Package documents contradict each other
The included text files are inconsistent.

### Example
`CHANGELOG.txt` says seeded first-run data was removed.
`FIX_REPORT.txt` says demo data was preloaded.

These cannot both be true for the same shipped state.

### Why this matters
This causes confusion for:
- testers
- future developers
- handover work
- regression checking

### Required fix
Clean the package notes so they match the shipped build exactly.

---

## 6. Play mode is partially right, but not fully aligned to the left/right model you want
Your master prompt wants:
- left = real
- right = simulation only
- instant
- smooth
- reset changes

The current Play logic does simulate values without altering the real state unless the user presses a `Make ... real` button.
That part is good.

But the framing still pushes it toward a playful score system instead of a calm left/right comparison tool.

### Required fix
Turn the layout into a clearer side-by-side comparison:
- `Now`
- `If you change this`

And keep the `Make real` actions secondary.

---

## Function and logic checks completed
These were verified from the shipped code.

### Verified present
- tax year label generation
- future tax profile generation
- quarter calculation from date
- period filtering by tax year and quarter
- totals calculation
- mileage allowance calculation
- play scenario calculation
- recurring monthly auto-add logic
- save/load backup logic
- edit/update entry logic
- reset confirmation
- prep figures text generation

### Key formulas confirmed
#### Mileage allowance
- first 10,000 miles at primary rate
- excess miles at secondary rate

#### Tax calculation
- profit = income - deductions
- tax = basic rate up to band + higher rate above band

#### Current top-line definitions
- `keep = income - tax`
- `disposable = keep - cashExpense`

This is the main conceptual problem in the current build.

---

## What I would score this build right now

### As a working local app
**7.5/10**

It is materially functional.
It is not just a shell.

### As the TaxTap product described in your master prompt
**5.5/10**

Why not higher:
- the core headline truth is not clean enough
- Play wording is off-brand
- Settings exposes internal logic too directly
- package guardrails are missing
- handover notes are inconsistent

---

## Highest-priority fixes in the correct order

1. **Fix the core metric truth**
   - decide what `You keep` means
   - make the whole app obey that single definition

2. **Rename and reframe Play**
   - remove gameboard / score language
   - keep instant simulation

3. **Simplify Settings language**
   - keep power
   - hide engineering tone

4. **Add permanent product rules file into the package**
   - prevent future drift

5. **Clean package documentation**
   - remove contradictions

6. **Then do visual polish and helper nudges**

---

## Final verdict
No, this system is **not yet exactly what you think it is**.

It is close in structure.
It is useful.
It has real logic.
But it is still drifting in a few important places away from the TaxTap identity.

The biggest single truth is this:

**the app currently shows a top-line number called `You keep`, but that number is not yet reliably the same thing as `what you actually keep`.**

That must be corrected before calling the product finished.
