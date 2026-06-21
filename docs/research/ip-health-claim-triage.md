# Research — IP & Health-Claim Triage
### 15-minute risk gut-check (not legal advice) · June 2026 · verdict: GREEN (2 YELLOW to-dos)

> ⚠️ Network tools were blocked this run, so two items need a live lookup: the **exact Z-Anatomy license page** and a **real trademark-register search for "Lodestar."** Both flagged CONFIRM LATER below. Everything else rests on stable license/IP doctrine.

## 1. Veritasium — science vs. expression
The science/facts are free; Veritasium's *expression* (footage, edit, script wording, voiceover) and *name/logo* are not.
- **CAN:** explain the science in your own words/visuals; be "inspired by" the video conceptually; state factually "Inspired by a Veritasium video on microrobots. Not affiliated with or endorsed by Veritasium."; link to the video.
- **CANNOT:** embed/clip/re-record their footage or animations; reuse Derek Muller's voice/likeness; use the Veritasium name/logo in your title, logo, or marketing; imply partnership/endorsement; copy script wording or shot-by-shot sequence.
- **Verdict: GREEN** — "explain the science, don't reuse assets" is exactly the right line. Only live risk is sloppy marketing copy implying endorsement.

## 2. Z-Anatomy asset licensing
Open-source anatomy project (Blender, derived from BodyParts3D), historically **CC BY-SA 4.0** family. Exact license is per-asset on each Sketchfab page — read it, don't assume.
- **If CC BY-SA 4.0:** **Attribution** (creator, title, source link, license link — put in an in-app credits screen) + **ShareAlike** (if you *modify and distribute* the model, the modified model must also be CC BY-SA).
- **Does SA infect your code? NO.** CC BY-SA copyleft attaches to *adaptations of the asset*, not to independent software that merely displays/bundles it (mere-aggregation distinction; opposite of GPL code copyleft). Your source code does **not** become CC BY-SA. Caveat: keep the asset identifiable + credited; ship any modifications under SA.
- **CONFIRM LATER:** open the actual Sketchfab model page, confirm CC BY-SA vs CC BY (CC BY = attribution only, even easier), screenshot the license at download.
- **Verdict: GREEN**, conditional on reading the real license + adding a credits line.

## 3. Health-claim / advertising framing
Instinct ("always say emerging, in animal trials") is **correct and the single most important mitigation.**
- Present as **science education / speculative about emerging research**, never available/recommended care.
- State stage explicitly and repeatedly: "experimental, in animal trials, not approved for human use."
- Never include dosing, "ask your doctor about getting this," efficacy claims, or "cures X."
- Don't name/imply a specific commercial product or company offering it (where false-advertising exposure spikes).
- Add: "For educational purposes only. Not medical advice."
- **Regions:** US (FTC/FDA), EU (health-claim rules), Switzerland (Heilmittelgesetz + UWG) all target *promotion/sale of a product*, not neutral science education. Educational/experimental framing sits well outside those regimes and fits an SNSF Agora outreach posture.
- **Verdict: GREEN/low-YELLOW** — add the explicit "not medical advice" disclaimer, never name a sellable product.

## 4. Name "Lodestar" — trademark gut-check
- **CONFIRM LATER (couldn't run a live register search).** "Lodestar" is a common word, **already used across software, finance, aviation, media** → namespace is **moderately crowded** (YELLOW). Infringement risk for a free educational game is low; *registrability / future-rename* risk is real if you commercialize or grant-brand.
- Before any logo/branding spend or grant submission (~30 min): search **USPTO TESS**, **EUIPO eSearch**, **Swiss IPI (Swissreg)** in classes 9 & 41; search Steam/itch.io/App Store/Play; check domain + handles. Consider a distinctive sub-mark "Lodestar: [subtitle]".
- **Verdict: YELLOW** — usable now for a free project; do a real search before branding spend.

## Bucketing
| Bucket | Items |
|---|---|
| **SAFE NOW** | Explaining the science in your own words; "inspired by Veritasium" + not-affiliated note; Z-Anatomy as-is with a credits line; "emerging, in animal trials" framing |
| **CONFIRM LATER (DIY, cheap)** | Read + screenshot the exact Z-Anatomy license; add in-app credits + "not medical advice" disclaimer; run a real "Lodestar" trademark/store search |
| **LAWYER BEFORE X** | Any marketing naming/showing Veritasium or implying endorsement; commercializing or filing the SNSF Agora grant under the "Lodestar" brand; distributing *modified* Z-Anatomy meshes if unsure on SA |

**Overall: GREEN**, with two small YELLOW to-dos before any branding/grant spend.

## URLs to verify (not fetched this run)
Z-Anatomy `z-anatomy.com` / `sketchfab.com/z-anatomy` · CC BY-SA 4.0 `creativecommons.org/licenses/by-sa/4.0/` · CC BY 4.0 `creativecommons.org/licenses/by/4.0/` · USPTO `tmsearch.uspto.gov` · EUIPO `tmdn.org/tmview` · Swiss IPI `swissreg.ch`
