# EASA RSS Feeds for Compliance Updates

Purpose: identify EASA update sources that can be monitored by an app to help keep flight-school flight books, training manuals, operations manuals, SOPs, and related compliance documents up to date.

---

## Official EASA RSS / update sources to use

| Priority | Source | Feed / page | Why it matters for flight books |
|---|---|---|---|
| 1 | Easy Access Rules | `https://www.easa.europa.eu/en/document-library/easy-access-rules/feed.xml` | Best source for consolidated rulebook updates. EASA Easy Access Rules are available in PDF, online and XML formats. |
| 2 | Regulations | `https://www.easa.europa.eu/document-library/regulations/feed.xml` | Tracks underlying regulation changes that may trigger changes in training manuals, operations manuals, compliance manuals, and flight books. |
| 3 | AMC & GM | `https://www.easa.europa.eu/document-library/acceptable-means-of-compliance-and-guidance-materials/feed.xml` | Important because AMC/GM changes often affect how a school demonstrates compliance, even when the regulation wording itself is unchanged. |
| 4 | Agency Decisions | `https://www.easa.europa.eu/document-library/agency-decisions/feed.xml` | EASA decisions issue or amend AMC, GM, certification specifications and related implementation material. |
| 5 | Airworthiness Directives / Safety Publications Tool | `https://ad.easa.europa.eu/` | For aircraft-specific compliance, maintenance, defects, limitations, and safety notices. |
| 6 | Safety Information Bulletins | `https://ad.easa.europa.eu/sib-docs/page-1` | Non-mandatory but operationally important safety updates. |
| 7 | News | `https://www.easa.europa.eu/newsroom-and-events/news/feed.xml` | Useful as a secondary signal when EASA announces major rule updates, but should not be your legal source of truth. |
| 8 | Press Releases | `https://www.easa.europa.eu/newsroom-and-events/press-releases/feed.xml` | Useful for high-level awareness only. Not enough for compliance decisions. |
| 9 | Opinions | `https://www.easa.europa.eu/document-library/opinions/feed.xml` | Useful for upcoming regulatory changes before they become final. |
| 10 | Notices of Proposed Amendment | `https://www.easa.europa.eu/document-library/notices-of-proposed-amendment/feed.xml` | Useful for predicting future compliance changes and preparing schools early. |

---

## Most relevant Easy Access Rules for flight schools

| Rule set | Why it matters |
|---|---|
| Easy Access Rules for Aircrew / Part-FCL | Licensing, training, instructors, examiners, ATO/DTO training logic. |
| Easy Access Rules for Air Operations / Air OPS | Operational procedures, NCO/NCC/SPO/CAT where relevant, checklists, operating minima, manuals. |
| Easy Access Rules for Continuing Airworthiness | Maintenance responsibilities, aircraft continuing-airworthiness obligations, CAMO/CAO relevance. |
| Easy Access Rules for SERA | Rules of the air, right-of-way, airspace, VFR/IFR operational behaviour. |
| Easy Access Rules for Information Security / Part-IS | Relevant where flight schools use digital systems, compliance platforms, training records or connected operational tools. |
| Easy Access Rules for Aerodromes | Relevant if the school’s manuals reference aerodrome operations, apron procedures, local operating rules, or airport interfaces. |

---

## Recommended setup for the app

Use the RSS feeds as **change detectors**, not as the final compliance source.

### 1. Poll EASA feeds daily

Monitor:

- Easy Access Rules
- Regulations
- AMC/GM
- Agency Decisions
- Opinions / NPAs
- Safety Publications / AD / SIB pages

### 2. Classify each update

Classify updates into categories such as:

- Aircrew / Part-FCL
- Air OPS
- Continuing Airworthiness
- SERA
- Aerodromes
- Information Security
- Aircraft-specific AD/SIB

### 3. Match against each school’s documents

Compare each regulatory update against:

- Training manual
- Operations manual
- Flight book
- Checklists
- SOPs
- Instructor notes
- Maintenance or aircraft-specific appendices

### 4. Use XML where available

Where EASA provides XML versions of Easy Access Rules, use XML for structured comparison rather than scraping PDFs.

This will make it easier to:

- Identify changed rule references
- Detect amended AMC/GM
- Compare old and new wording
- Store structured regulatory snapshots
- Link proposed document updates to exact source material

### 5. Generate proposed updates

For each relevant compliance change, the system should generate:

- Affected rule or AMC/GM reference
- Source URL
- EASA publication date
- Affected flight-book or manual section
- Explanation of relevance
- Proposed replacement wording
- Redline / PR-style diff
- Confidence score
- Human-review requirement

### 6. Keep an audit trail

Every compliance update should store:

- Source URL
- EASA publication date
- Rule reference
- Old document text
- Proposed new text
- Reviewer
- Approval date
- Rollback version
- Notification history

---

## Important warning

Do **not** rely only on general EASA news feeds.

General EASA news is useful for awareness, but the compliance engine should prioritise:

1. Easy Access Rules
2. Regulations
3. AMC/GM
4. Agency Decisions
5. Safety Publications Tool
6. SIB / AD pages

This gives the app a stronger structure for monitoring regulatory change and updating flight-school compliance documents.
