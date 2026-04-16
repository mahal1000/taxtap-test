# TAXTAP PRODUCT RULES
This file is part of the system and exists to stop product drift.

## What TaxTap is
TaxTap is a simple, fast, behaviour-driven money control app.

It helps ordinary people answer one question:

**What do I actually keep?**

## What TaxTap is not
TaxTap must never become:
- accounting software
- bookkeeping software
- payroll software
- a feature-heavy dashboard
- a budgeting platform
- a generic finance tool

## Core product rule
If a feature does not help the user understand what they keep now, or what would change if they changed something, do not build it.

## Core loop
1. User enters one number
2. TaxTap updates instantly
3. User sees what they keep
4. User feels in control
5. User comes back daily

If this loop becomes slow, confusing, or cluttered, the product is being damaged.

## Front-end rule
The front end must feel:
- obvious
- calm
- clean
- fast
- friendly

The user should never need training.

## Back-end rule
The back end can be clever, but that cleverness should stay mostly hidden.
The user should feel clarity, not mechanics.

## Metric truth rule
The system must use one clear definition of the main headline number.
If the headline says `You keep`, it must mean the same thing everywhere.
Do not mix:
- after-tax income
- after-tax and after-cost money left
- projected disposable cash

Pick one definition and apply it consistently across:
- home
- play
- summaries
- reports
- helper text

## Play mode rule
Play mode is not a game.
It is a calm simulation tool.

Allowed ideas:
- What if
- Try a change
- See the impact
- Reset changes
- Make this real

Not allowed:
- gameboard
- score
- points
- badges
- childish language

## Language rule
Use plain human language.
Prefer:
- You keep now
- You would keep
- Estimated tax
- Tax saved from mileage
- Add income
- Add cost
- Add mileage

Avoid:
- rule engine
- tax architecture
- optimization language
- bookkeeping language
- internal developer language

## Settings rule
Settings must feel like calm setup, not a control panel.
Advanced tax-year logic may exist, but should be presented simply.

## UI rule
Less is more.
One clear action per moment.
Every action should show impact.
Trust matters more than features.

## Nudge rule
Subtle confidence only.
No childish gamification.
No noisy prompts.
Only show nudges that help the user feel more in control.

## Developer rule
Do not add features because they are possible.
Only add features that strengthen the core loop.

When in doubt, simplify.
