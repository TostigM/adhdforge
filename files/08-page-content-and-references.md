# Focus Forge — Page Content & References

**Status:** Draft v1.0
**Owners:** Focus Forge Project
**Scope:** Static page content — About, References, Footer, Disclaimers

---

## 1. Purpose Of This Document

This document houses the **content** for all static pages and persistent UI elements. It exists separately from design specs because:

- Content changes more often than design
- Content needs editorial review (tone, accuracy, accessibility) separate from code review
- Reference data is structured — it should live as JSON the app renders, not as hardcoded markup

All content here is final-form, ready to be rendered. Edit this doc, regenerate the JSON, deploy — no code changes needed for typo fixes.

---

## 2. The References Page

### 2.1 Page Structure

URL: `/about/references`
Linked from: Footer (always visible) + Settings → About

```
┌─────────────────────────────────────────────────┐
│  About / References                              │
├─────────────────────────────────────────────────┤
│                                                  │
│  Disclaimer block                                │
│                                                  │
│  Search/filter input                             │
│                                                  │
│  ▼ Clinical & Peer-Reviewed Research            │
│    [reference cards]                             │
│                                                  │
│  ▼ Clinical Guidelines & Authoritative Sources  │
│    [reference cards]                             │
│                                                  │
│  ▼ ADHD Education & Advocacy Organizations      │
│    [reference cards]                             │
│                                                  │
│  ▼ Practitioner Perspectives & Practical Guides │
│    [reference cards]                             │
│                                                  │
│  ▼ UX, Design, & Accessibility Research         │
│    [reference cards]                             │
│                                                  │
│  ▼ Industry & Tool Comparisons                  │
│    [reference cards]                             │
│                                                  │
│  Last updated: [date from CI]                   │
└─────────────────────────────────────────────────┘
```

### 2.2 Disclaimer Copy (Top of Page)

> **About these references**
>
> Focus Forge synthesizes guidance from clinical research, design research, and practitioner experience. We've grouped references by source type so you can weigh them appropriately — peer-reviewed research and clinical guidelines carry more weight than blog posts or podcasts, even when both inform the same idea.
>
> **Nothing on this page constitutes medical advice.** If you're seeking diagnosis or treatment for ADHD, please work with a licensed clinician. Focus Forge is an accommodation tool, not a medical service.
>
> Some links may break over time. We run automated checks and update as we can. If you find a dead link, please [let us know](mailto:contact@example.com).

### 2.3 Reference Card Component

Each reference renders as:

```
┌─────────────────────────────────────────────────┐
│  Title of the source ↗                           │
│  Publisher / Author · Year (if known)            │
│  Annotation (one or two sentences)               │
└─────────────────────────────────────────────────┘
```

- Title is the link text (clickable, opens in new tab)
- Small external-link icon next to title
- `target="_blank" rel="noopener noreferrer"`
- No tracking on outbound clicks

---

## 3. Reference Data (JSON)

This is the source of truth. The CI link-checker reads this; the page renders this.

**File location:** `apps/web/data/references.json`

### 3.1 Schema

```typescript
interface ReferenceData {
  lastUpdated: string;           // ISO date — auto-set by CI
  categories: Category[];
}

interface Category {
  id: string;                    // Stable slug
  title: string;
  description: string;           // Brief intro to the category
  references: Reference[];
}

interface Reference {
  id: number;                    // Original numbering preserved
  title: string;                 // The article/source title
  publisher: string;             // Source / publication / author
  year?: number;                 // If known
  url: string;
  annotation?: string;           // Optional one-sentence note on relevance
  weight: 'foundational' | 'supporting' | 'contextual';
  // foundational = directly shaped a core feature decision
  // supporting   = corroborates a feature decision
  // contextual   = background reading, less central
}
```

### 3.2 Categorized References

The 75 references from the original list, reorganized. Categorizations reflect our assessment of source type, not endorsement of accuracy.

```json
{
  "lastUpdated": "AUTO_SET_BY_CI",
  "categories": [
    {
      "id": "clinical-peer-reviewed",
      "title": "Clinical & Peer-Reviewed Research",
      "description": "Sources from peer-reviewed journals, clinical research repositories, and medical bodies.",
      "references": [
        {
          "id": 5,
          "title": "Attention-deficit/hyperactivity disorder: diagnostic criteria, cognitive processes, and comorbidities",
          "publisher": "PMC / NIH",
          "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC7082246/",
          "annotation": "Foundational review of ADHD diagnostic criteria and the cognitive mechanisms underlying the disorder.",
          "weight": "foundational"
        },
        {
          "id": 17,
          "title": "The Impact of Social Media & Technology on Child and Adolescent Mental Health",
          "publisher": "PMC / NIH",
          "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12165459/",
          "annotation": "Examines technology's interaction with developing attention and reward systems.",
          "weight": "supporting"
        },
        {
          "id": 25,
          "title": "Positive reinforcement plays key role in cognitive task performance",
          "publisher": "University at Buffalo",
          "year": 2015,
          "url": "https://www.buffalo.edu/news/releases/2015/07/036.html",
          "annotation": "Directly underpins our gamification and Bronze Badge frequency design.",
          "weight": "foundational"
        },
        {
          "id": 44,
          "title": "Electrophysiological evidence for increased auditory crossmodal activity",
          "publisher": "Frontiers in Neuroscience",
          "year": 2023,
          "url": "https://www.frontiersin.org/journals/neuroscience/articles/10.3389/fnins.2023.1227767/full",
          "annotation": "Informs our Sound Family auditory pacing approach.",
          "weight": "supporting"
        },
        {
          "id": 49,
          "title": "Time Perception in Adult ADHD: Findings from a Decade — A Review",
          "publisher": "PMC / NIH",
          "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9962130/",
          "annotation": "Comprehensive review of temporal cognition deficits — the clinical basis for our Analog Timer and Reverse Scheduler.",
          "weight": "foundational"
        },
        {
          "id": 54,
          "title": "Noise is beneficial for cognitive performance in ADHD",
          "publisher": "PubMed / NIH",
          "url": "https://pubmed.ncbi.nlm.nih.gov/17683456/",
          "annotation": "Stochastic resonance findings supporting the optimal-stimulation theory behind our Sound Families.",
          "weight": "supporting"
        },
        {
          "id": 70,
          "title": "Studying Motivation in ADHD: The Role of Internal Motivation",
          "publisher": "PMC / NIH",
          "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC9066661/",
          "annotation": "Research underpinning our externalized-reward approach over willpower-based design.",
          "weight": "foundational"
        },
        {
          "id": 15,
          "title": "The interplay of ADHD, social media usage, and dopamine",
          "publisher": "World Journal of Advanced Research and Reviews",
          "url": "https://wjarr.com/sites/default/files/WJARR-2024-2625.pdf",
          "annotation": "Dopamine receptor research informing our reward-cadence design.",
          "weight": "supporting"
        },
        {
          "id": 18,
          "title": "The interplay of ADHD, social media usage, and dopamine receptors in adolescents",
          "publisher": "ResearchGate",
          "url": "https://www.researchgate.net/publication/383652623_The_interplay_of_ADHD_social_media_usage_and_dopamine_receptors_in_adolescents_A_literature_review",
          "annotation": "Literature review on dopamine pathways and digital engagement in ADHD.",
          "weight": "contextual"
        },
        {
          "id": 76,
          "title": "Spark: The Revolutionary New Science of Exercise and the Brain",
          "publisher": "John J. Ratey, MD (Harvard Medical School)",
          "url": "https://www.johnratey.com/spark/",
          "annotation": "Foundational text on exercise as a neurological intervention. Source for the 'Prozac and Ritalin' framing of exercise effects. Shapes our movement integration (M20).",
          "weight": "foundational"
        },
        {
          "id": 77,
          "title": "Acute exercise improves cognition in ADHD — meta-analysis",
          "publisher": "PubMed (multiple authors)",
          "url": "https://pubmed.ncbi.nlm.nih.gov/?term=adhd+acute+exercise+cognition",
          "annotation": "Aggregated evidence for acute exercise improving ADHD cognition. Supports the 10-3 rule integration.",
          "weight": "supporting"
        },
        {
          "id": 78,
          "title": "Cognitive-aerobic exercise vs simple aerobic in ADHD outcomes",
          "publisher": "Frontiers in Psychology",
          "url": "https://www.frontiersin.org/journals/psychology",
          "annotation": "Research basis for the three-tier exercise model (aerobic / cognitive-aerobic / mind-body) in M20.",
          "weight": "supporting"
        }
      ]
    },

    {
      "id": "clinical-guidelines",
      "title": "Clinical Guidelines & Authoritative Sources",
      "description": "Diagnostic criteria, clinical fact sheets, and guidelines from established medical organizations.",
      "references": [
        {
          "id": 4,
          "title": "DSM-5 Diagnostic Criteria for ADHD",
          "publisher": "American Academy of Family Physicians (AAFP)",
          "url": "https://www.aafp.org/dam/AAFP/documents/patient_care/adhd_toolkit/adhd19-assessment-table1.pdf",
          "annotation": "The primary diagnostic standard for ADHD in the United States.",
          "weight": "foundational"
        },
        {
          "id": 8,
          "title": "ADHD Diagnostic Criteria: Comparing DSM-5, ICD-11, NICE",
          "publisher": "Qbtech",
          "url": "https://www.qbtech.com/blog/adhd-diagnosis-guidelines-comparison-dsm-5-vs-icd-11/",
          "annotation": "Comparison of major diagnostic frameworks.",
          "weight": "supporting"
        },
        {
          "id": 9,
          "title": "Executive Function Skills",
          "publisher": "CHADD (Children and Adults with Attention-Deficit/Hyperactivity Disorder)",
          "url": "https://chadd.org/about-adhd/executive-function-skills/",
          "annotation": "Foundational mapping of executive function domains we externalize via the toolkit.",
          "weight": "foundational"
        },
        {
          "id": 11,
          "title": "The 20 Best Principles of Managing a Child with ADHD",
          "publisher": "Russell Barkley / CADDRA",
          "year": 2025,
          "url": "https://adhdtreat.caddra.ca/wp-content/uploads/2025/01/Barkley-CADDAC-2025-treat.pdf",
          "annotation": "Barkley's clinical principles — the conceptual spine of our management philosophy.",
          "weight": "foundational"
        },
        {
          "id": 12,
          "title": "The Important Role of Executive Functioning and Self-Regulation in ADHD",
          "publisher": "Russell Barkley",
          "url": "https://www.russellbarkley.org/factsheets/ADHD_EF_and_SR.pdf",
          "annotation": "Defines the executive-dysfunction framing of ADHD that shapes our entire scaffolding approach.",
          "weight": "foundational"
        },
        {
          "id": 34,
          "title": "The 12 Best Principles for Managing the Child or Teen with ADHD",
          "publisher": "Southlake Pediatrics",
          "url": "https://www.southlakepediatrics.com/wp-content/uploads/2025/03/e.-12-Best-Principles-for-Managing-the-Child-or-Teen-with-ADHD.pdf",
          "annotation": "Practical clinical principles for ADHD support.",
          "weight": "supporting"
        },
        {
          "id": 35,
          "title": "12 Core Principles for Managing ADHD",
          "publisher": "ADDvisor",
          "url": "http://www.addvisor.com/12-core-principles-for-managing-adhd.html",
          "annotation": "Practitioner synthesis of ADHD management principles.",
          "weight": "contextual"
        }
      ]
    },

    {
      "id": "education-advocacy",
      "title": "ADHD Education & Advocacy Organizations",
      "description": "Educational content from established ADHD advocacy and patient-education organizations.",
      "references": [
        {
          "id": 1,
          "title": "ADHD & Time Blindness",
          "publisher": "Simply Psychology",
          "url": "https://www.simplypsychology.org/adhd-time-blindness.html",
          "annotation": "Accessible introduction to time blindness — the symptom our Analog Timer addresses.",
          "weight": "supporting"
        },
        {
          "id": 2,
          "title": "ADHD and Executive Function",
          "publisher": "Child Mind Institute",
          "url": "https://childmind.org/article/adhd-and-executive-function/",
          "annotation": "Patient-facing primer on executive function deficits.",
          "weight": "supporting"
        },
        {
          "id": 3,
          "title": "The New Science of ADHD: Beyond Dopamine and Motivation",
          "publisher": "Edge Foundation",
          "url": "https://edgefoundation.org/the-new-science-of-adhd-beyond-dopamine-and-motivation/",
          "annotation": "Updates on network-regulation models of ADHD beyond simple dopamine deficit.",
          "weight": "supporting"
        },
        {
          "id": 6,
          "title": "DSM-5 Criteria for ADHD Explained: Visual Guide to ADHD Subtypes",
          "publisher": "Neurodivergent Insights",
          "url": "https://neurodivergentinsights.com/dsm-5-criteria-for-adhd-explained-in-pictures/",
          "annotation": "Visual breakdown of ADHD subtypes for non-clinical readers.",
          "weight": "contextual"
        },
        {
          "id": 7,
          "title": "DSM-5 Criteria for ADHD: How Is Adult ADHD Evaluated?",
          "publisher": "ADDA (Attention Deficit Disorder Association)",
          "url": "https://add.org/adhd-dsm-5-criteria/",
          "annotation": "Adult-focused explanation of ADHD diagnostic criteria.",
          "weight": "contextual"
        },
        {
          "id": 10,
          "title": "ADHD and Time Blindness",
          "publisher": "Understood.org",
          "url": "https://www.understood.org/en/articles/adhd-time-blindness",
          "annotation": "Family-friendly explanation of time blindness.",
          "weight": "contextual"
        },
        {
          "id": 14,
          "title": "How Dopamine Influences ADHD Symptoms and Treatment",
          "publisher": "ADDA",
          "url": "https://add.org/adhd-dopamine/",
          "annotation": "Patient-facing explanation of dopamine's role in ADHD.",
          "weight": "contextual"
        },
        {
          "id": 23,
          "title": "ADHD Time Blindness: How to Detect It & Regain Control Over Time",
          "publisher": "ADDA",
          "url": "https://add.org/adhd-time-blindness/",
          "annotation": "Practical strategies for managing time blindness.",
          "weight": "contextual"
        },
        {
          "id": 47,
          "title": "The Connection of Time Blindness & ADHD",
          "publisher": "Private ADHD",
          "url": "https://www.privateadhd.com/blog/time-blindness-adhd-connection",
          "annotation": "Clinical-practice perspective on time blindness.",
          "weight": "contextual"
        },
        {
          "id": 52,
          "title": "Executive Functioning Helpers",
          "publisher": "Neurodivergent Insights",
          "url": "https://neurodivergentinsights.com/executive-function-helpers/",
          "annotation": "Practical executive function tools and accommodations.",
          "weight": "contextual"
        },
        {
          "id": 59,
          "title": "Punctuality and Time Blindness in ADHD Adults: Help",
          "publisher": "ADDitude Magazine",
          "url": "https://www.additudemag.com/punctuality-time-blindness-adhd-apps-tips/",
          "annotation": "Practical tips for managing chronic lateness.",
          "weight": "contextual"
        },
        {
          "id": 64,
          "title": "The ADHD Body Double: A Unique Tool for Getting Things Done",
          "publisher": "ADDA",
          "url": "https://add.org/the-body-double/",
          "annotation": "Foundational explanation of body doubling for ADHD.",
          "weight": "supporting"
        },
        {
          "id": 68,
          "title": "Rejection Sensitive Dysphoria (RSD) Collection",
          "publisher": "AIDE Canada",
          "url": "https://aidecanada.ca/resources/learn/asd-id-core-knowledge/rejection-sensitive-dysphoria-(rsd)-collection",
          "annotation": "Comprehensive RSD resource collection — the symptom our Soft-Track Protocol addresses.",
          "weight": "foundational"
        },
        {
          "id": 29,
          "title": "Rejection Sensitive Dysphoria Toolkit",
          "publisher": "NAMI Mercer",
          "url": "https://namimercer.org/wp-content/uploads/2024/07/Rejection-Sensitive-Dysphoria-Toolkit.pdf",
          "annotation": "Practitioner-developed RSD coping framework.",
          "weight": "supporting"
        },
        {
          "id": 30,
          "title": "Rejection Sensitive Dysphoria (RSD) Problems and Solutions",
          "publisher": "Divergantz",
          "url": "https://divergantz.com.au/wp-content/uploads/2022/07/IAU-and-DC-Problems-and-Solutions-Rejection-Sensitive-Dysphoria-RSD-V2.pdf",
          "annotation": "Practical RSD solution-set used widely in clinical practice.",
          "weight": "supporting"
        }
      ]
    },

    {
      "id": "practitioner-perspectives",
      "title": "Practitioner Perspectives & Practical Guides",
      "description": "Insights from therapists, coaches, and practitioners working directly with ADHD clients. These reflect clinical experience but are not peer-reviewed.",
      "references": [
        {
          "id": 16,
          "title": "The Science of ADHD",
          "publisher": "Huberman Lab",
          "url": "https://www.hubermanlab.com/topics/science-of-adhd",
          "annotation": "Neuroscience-focused podcast content on ADHD mechanisms.",
          "weight": "supporting"
        },
        {
          "id": 19,
          "title": "ADHD Time Blindness: What It Is and How to Manage It",
          "publisher": "Sommer PG",
          "url": "https://sommerpg.com/adhd-time-blindness/",
          "annotation": "Practitioner-written overview of time blindness management.",
          "weight": "contextual"
        },
        {
          "id": 20,
          "title": "ADHD and Motivation",
          "publisher": "Think ADHD",
          "url": "https://thinkadhd.co.uk/adhd-and/adhd-and-motivation/",
          "annotation": "Coach-written piece on ADHD motivation.",
          "weight": "contextual"
        },
        {
          "id": 24,
          "title": "The Power of Positive Reinforcement for ADHD Children",
          "publisher": "Dandelion Family Counseling",
          "year": 2026,
          "url": "https://dandelionfamilycounseling.com/2026/02/23/the-power-of-positive-reinforcement-for-adhd-children/",
          "annotation": "Counselor-written piece on reinforcement strategies.",
          "weight": "contextual"
        },
        {
          "id": 26,
          "title": "ADHD Frustration Triggers and Simple Ways to Respond",
          "publisher": "The Vibe With Ky",
          "url": "https://thevibewithky.com/2025/08/14/adhd-frustration-triggers-and-simple-ways-to-respond/",
          "annotation": "The 'broken pause button' framing of emotional dysregulation we cite directly.",
          "weight": "supporting"
        },
        {
          "id": 27,
          "title": "5 Tools for ADHD Frustration",
          "publisher": "The Vibe With Ky Podcast",
          "url": "https://podcasts.apple.com/us/podcast/s6-e34-5-tools-for-adhd-frustration-the-vibe-with-ky-podcast/id1527116818",
          "annotation": "Podcast episode on practical frustration management.",
          "weight": "contextual"
        },
        {
          "id": 28,
          "title": "The RSD Survival Toolkit for ADHD Women: What to Do When",
          "publisher": "Flourishing Women",
          "url": "https://www.flourishingwomen.net/?page_id=5713",
          "annotation": "Practitioner toolkit for RSD management.",
          "weight": "contextual"
        },
        {
          "id": 31,
          "title": "Understanding and Managing Rejection Sensitive Dysphoria",
          "publisher": "Bay Area CBT Center",
          "url": "https://bayareacbtcenter.com/rejection-sensitive-dysphoria/",
          "annotation": "CBT-informed RSD management framework.",
          "weight": "contextual"
        },
        {
          "id": 32,
          "title": "The Vibe With Ky Podcast",
          "publisher": "The Vibe With Ky",
          "url": "https://podcasts.apple.com/us/podcast/the-vibe-with-ky-podcast/id1527116818",
          "annotation": "Podcast series on ADHD lived experience.",
          "weight": "contextual"
        },
        {
          "id": 50,
          "title": "Time Blindness — An ADHD or Executive Dysfunction Trait",
          "publisher": "Therapy in a Nutshell",
          "url": "https://therapyinanutshell.com/time-blindness/",
          "annotation": "Therapist-written content on time blindness.",
          "weight": "contextual"
        },
        {
          "id": 51,
          "title": "ADHD Time Management Strategies: Powerful Low-Tech Solutions",
          "publisher": "The MBA Tutors",
          "url": "https://thembatutors.com/adhd-time-management-strategies/",
          "annotation": "Educator-written practical strategies.",
          "weight": "contextual"
        },
        {
          "id": 53,
          "title": "Does Music Help ADHD? What the Research Actually Says",
          "publisher": "Brain.fm",
          "url": "https://www.brain.fm/blog/does-music-help-adhd-research-guide",
          "annotation": "Research synthesis on auditory stimulation and ADHD focus.",
          "weight": "supporting"
        },
        {
          "id": 21,
          "title": "ADHD Productivity: Evidence-Based Strategies",
          "publisher": "Brain.fm",
          "url": "https://www.brain.fm/blog/adhd-productivity-evidence-based-strategies",
          "annotation": "Research-informed productivity strategies for ADHD.",
          "weight": "contextual"
        },
        {
          "id": 22,
          "title": "ADHD Time Blindness: What It Is and How to Fight It",
          "publisher": "Brain.fm",
          "url": "https://www.brain.fm/blog/adhd-time-blindness-planning-tools-time-management",
          "annotation": "Practical time blindness mitigation including the analog timer concept.",
          "weight": "supporting"
        },
        {
          "id": 48,
          "title": "How to Cope With ADHD Time Blindness in Daily Life",
          "publisher": "ReachLink",
          "url": "https://reachlink.com/advice/adhd/adhd-time-blindness/",
          "annotation": "Daily-life coping strategies for time blindness.",
          "weight": "contextual"
        },
        {
          "id": 55,
          "title": "Using Backward Design to Set Up Schedules for Adults with ADHD",
          "publisher": "YouTube (educational content)",
          "url": "https://www.youtube.com/watch?v=9YCeMVDLa_0",
          "annotation": "Practitioner walkthrough of backward design scheduling — the basis for our Doorknob mode.",
          "weight": "supporting"
        },
        {
          "id": 60,
          "title": "Point of Performance — How to Implement That for Using a Planner",
          "publisher": "Reddit r/ADHD (community discussion)",
          "url": "https://www.reddit.com/r/ADHD/comments/18v558v/point_of_performance_how_to_implement_that_for/",
          "annotation": "Community discussion of practical Point-of-Performance implementations.",
          "weight": "contextual"
        },
        {
          "id": 61,
          "title": "Managing Time Blindness",
          "publisher": "Stanford Center for Teaching and Learning",
          "url": "https://ctl.stanford.edu/managing-time-blindness",
          "annotation": "Stanford CTL guidance on time blindness in academic settings.",
          "weight": "supporting"
        },
        {
          "id": 62,
          "title": "Dial in Your Dopamine: Motivation, Focus, and the ADHD Brain at Work",
          "publisher": "Nerd Journey",
          "url": "https://nerd-journey.com/dial-in-your-dopamine-motivation-focus-and-the-adhd-brain-at-work-with-skye-waterson-1-2/",
          "annotation": "Practitioner interview on workplace ADHD strategies.",
          "weight": "contextual"
        },
        {
          "id": 63,
          "title": "ADHD Body Doubling: The Productivity Hack You Might Be Missing",
          "publisher": "Ready Health",
          "url": "https://readyhealth.co.uk/blog/adhd-body-doubling-the-productivity-hack-you-might-be-missing",
          "annotation": "Health-service overview of body doubling.",
          "weight": "contextual"
        },
        {
          "id": 65,
          "title": "Body Doubling for ADHD: The Weird Productivity Hack That Actually Works",
          "publisher": "Medium (James Carter)",
          "url": "https://medium.com/@jamescarter19/body-doubling-for-adhd-the-weird-productivity-hack-that-actually-works-13fdaa4ec189",
          "annotation": "First-person account of body doubling effectiveness.",
          "weight": "contextual"
        },
        {
          "id": 71,
          "title": "ADHD? Your Thoughts Are Faster Than Your Pen (Use Voice)",
          "publisher": "Lound",
          "url": "https://lound.ai/blog/voice-journaling-for-adhd-racing-thoughts/",
          "annotation": "Practitioner case for voice journaling in ADHD — basis for our Voice Dump.",
          "weight": "supporting"
        },
        {
          "id": 72,
          "title": "Every Person With ADHD Should Voice Journal",
          "publisher": "Juicy Memo",
          "url": "https://juicymemo.com/blog/every-person-with-adhd-should-voice-journal/",
          "annotation": "Practitioner advocacy for voice-first capture in ADHD.",
          "weight": "contextual"
        },
        {
          "id": 73,
          "title": "476 — RSD Toolkit: Strategies for Managing Your Sensitivities",
          "publisher": "ADHD Experts Podcast",
          "url": "https://podcasts.apple.com/no/podcast/476-rsd-toolkit-strategies-for-managing-your-sensitivities/id668174671",
          "annotation": "Expert podcast episode on RSD management.",
          "weight": "contextual"
        },
        {
          "id": 74,
          "title": "How Positive Reinforcement Can Help Children with ADHD",
          "publisher": "Psychowellness Center",
          "url": "https://www.psychowellnesscenter.com/Blog/how-positive-reinforcement-can-help-children-with-adhd/",
          "annotation": "Clinical perspective on reinforcement strategies.",
          "weight": "contextual"
        },
        {
          "id": 75,
          "title": "Speak & Solve — ADHD Voicenote Support",
          "publisher": "Rachel Walker",
          "url": "https://rachelwalker.co/adhd-voicenote-support",
          "annotation": "Practitioner offering voicenote-based support.",
          "weight": "contextual"
        }
      ]
    },

    {
      "id": "ux-design-accessibility",
      "title": "UX, Design, & Accessibility Research",
      "description": "Sources informing our design decisions — cognitive accessibility standards, friction research, and neurodivergent-focused UX guidance.",
      "references": [
        {
          "id": 33,
          "title": "Friction Science: Why Users Drop Off",
          "publisher": "UX Magazine",
          "url": "https://uxmag.com/articles/friction-science-why-users-drop-off",
          "annotation": "The 'stacked friction' research — basis for our zero-friction design mandate.",
          "weight": "foundational"
        },
        {
          "id": 36,
          "title": "UX Design for ADHD: When Focus Becomes a Challenge",
          "publisher": "Medium / Design Bootcamp",
          "url": "https://medium.com/design-bootcamp/ux-design-for-adhd-when-focus-becomes-a-challenge-afe160804d94",
          "annotation": "ADHD-specific UX design guidance.",
          "weight": "supporting"
        },
        {
          "id": 37,
          "title": "Cognitive Accessibility Guidelines",
          "publisher": "UK Government Education Accessibility",
          "url": "https://accessibility.education.gov.uk/guidelines/coga",
          "annotation": "Practical COGA implementation guidance.",
          "weight": "foundational"
        },
        {
          "id": 38,
          "title": "Introductory Guide to Cognitive Accessibility (COGA)",
          "publisher": "DigitalA11Y",
          "url": "https://www.digitala11y.com/navigating-the-world-of-cognitive-disabilities-and-cognitive-accessibility-coga/",
          "annotation": "Accessible introduction to COGA principles.",
          "weight": "supporting"
        },
        {
          "id": 39,
          "title": "Designing Accessible Services: Don't Exclude the Neurodiverse",
          "publisher": "UK Department for Work & Pensions Digital Blog",
          "url": "https://dwpdigital.blog.gov.uk/2022/06/30/designing-accessible-services-dont-exclude-the-neurodiverse/",
          "annotation": "Government-design perspective on neurodivergent inclusion.",
          "weight": "supporting"
        },
        {
          "id": 40,
          "title": "Accessibility is Excluding the Neurodivergent",
          "publisher": "Computer Weekly",
          "url": "https://www.computerweekly.com/blog/WITsend/Accessibility-is-excluding-the-neurodivergent",
          "annotation": "Critical perspective on gaps in standard accessibility approaches.",
          "weight": "supporting"
        },
        {
          "id": 41,
          "title": "How to Design for ADHD and Neurodiversity in UX",
          "publisher": "Welcoming Web",
          "url": "https://welcomingweb.com/blogs/designing-for-neurodiversity-adhd-ux",
          "annotation": "Practical neurodivergent UX patterns.",
          "weight": "supporting"
        },
        {
          "id": 42,
          "title": "Making Content Usable for People with Cognitive and Learning Disabilities",
          "publisher": "W3C",
          "url": "https://www.w3.org/TR/coga-usable/",
          "annotation": "The authoritative W3C standard for cognitive accessibility — directly cited in our design system.",
          "weight": "foundational"
        },
        {
          "id": 43,
          "title": "Software Accessibility for Users with Attention Deficit Disorder (ADHD)",
          "publisher": "UX Collective (uxdesign.cc)",
          "url": "https://uxdesign.cc/software-accessibility-for-users-with-attention-deficit-disorder-adhd-f32226e6037c",
          "annotation": "Software-specific ADHD accessibility patterns.",
          "weight": "supporting"
        },
        {
          "id": 45,
          "title": "UI/UX for ADHD: Designing Interfaces That Actually Help Students",
          "publisher": "Din Studio",
          "url": "https://din-studio.com/ui-ux-for-adhd-designing-interfaces-that-actually-help-students/",
          "annotation": "Educational-context ADHD interface design.",
          "weight": "contextual"
        },
        {
          "id": 46,
          "title": "Designing for the 15%: Why Neurodivergent UX Is the Future",
          "publisher": "Print Magazine",
          "url": "https://www.printmag.com/industry-perspectives/why-neurodivergent-ux-is-the-future/",
          "annotation": "Industry perspective on neurodivergent UX.",
          "weight": "contextual"
        }
      ]
    },

    {
      "id": "industry-comparisons",
      "title": "Industry & Tool Comparisons",
      "description": "Reviews and comparisons of existing ADHD-focused digital tools, used to understand the competitive landscape and learn from prior efforts.",
      "references": [
        {
          "id": 13,
          "title": "Using an LMS to Scaffold Executive Function for Clients With ADHD",
          "publisher": "eLearning Industry",
          "url": "https://elearningindustry.com/using-an-lms-to-scaffold-executive-function-for-clients-with-adhd",
          "annotation": "Learning-management-system patterns applicable to ADHD scaffolding.",
          "weight": "contextual"
        },
        {
          "id": 56,
          "title": "Reverse Scheduling",
          "publisher": "Mastt",
          "url": "https://www.mastt.com/glossary/reverse-scheduling",
          "annotation": "Industry definition of backward-scheduling methodology.",
          "weight": "contextual"
        },
        {
          "id": 57,
          "title": "Backward Scheduling — Best Way to Optimise Production Process",
          "publisher": "ActOuch",
          "url": "https://www.actouch.com/knowledgebase/backward-scheduling/",
          "annotation": "Production-management application of backward scheduling.",
          "weight": "contextual"
        },
        {
          "id": 58,
          "title": "Backward Design: The Simplest, Yet Most Powerful Tool",
          "publisher": "Medium (Israfil Iskandarov)",
          "url": "https://medium.com/@israfil.iskandarov/backward-design-the-simplest-yet-most-powerful-tool-for-software-engineers-c21f7c76f674",
          "annotation": "Software-engineering perspective on backward design.",
          "weight": "contextual"
        },
        {
          "id": 66,
          "title": "16 Body Doubling Apps for ADHD and Focus",
          "publisher": "Flown",
          "url": "https://flown.com/blog/adhd/best-body-doubling-apps",
          "annotation": "Comparison of existing body-doubling tools.",
          "weight": "contextual"
        },
        {
          "id": 67,
          "title": "Best Body Doubling Apps for ADHD (2026 Comparison)",
          "publisher": "Get Motivated",
          "year": 2026,
          "url": "https://getmotivated.ai/blog/body-doubling-adhd-app",
          "annotation": "Recent comparison of body-doubling tools.",
          "weight": "contextual"
        },
        {
          "id": 69,
          "title": "7 Best Body Doubling Apps for ADHD (2024)",
          "publisher": "Shimmer Care",
          "year": 2024,
          "url": "https://www.shimmer.care/blog/best-body-doubling-apps",
          "annotation": "Earlier comparison of body-doubling tools.",
          "weight": "contextual"
        }
      ]
    }
  ]
}
```

### 3.3 Reference Statistics (For Internal Reference)

| Category | Count | Foundational | Supporting | Contextual |
|---|---|---|---|---|
| Clinical & Peer-Reviewed Research | 9 | 3 | 5 | 1 |
| Clinical Guidelines & Authoritative | 7 | 4 | 2 | 1 |
| Education & Advocacy | 15 | 1 | 3 | 11 |
| Practitioner Perspectives | 26 | 0 | 6 | 20 |
| UX, Design, Accessibility | 11 | 3 | 6 | 2 |
| Industry & Tool Comparisons | 7 | 0 | 0 | 7 |
| **Total** | **75** | **11** | **22** | **42** |

---

## 4. The About Page

URL: `/about`
Linked from: Footer + Settings

### 4.1 Page Content

```markdown
# About Focus Forge

Focus Forge is a productivity tool built specifically for adults with
Attention-Deficit/Hyperactivity Disorder.

## Why We Exist

Most productivity tools assume you have a reliable internal reward system,
accurate time perception, and consistent executive function. For ADHD
brains, those assumptions are biologically wrong.

We're not trying to fix you. We're trying to build a tool that fits the
brain you actually have — one that externalizes the executive functions
ADHD makes harder, while respecting the emotional reality of living with
this condition.

## How We Built It

Focus Forge was designed by a multi-disciplinary team grounded in current
clinical research, neuroscience, behavioral therapy, cognitive accessibility
standards, and UX research. Every feature traces back to specific evidence
about how the ADHD brain works — or doesn't.

You can read the full reference list here: [References](/about/references)

## Our Principles

- **Forgiveness over guilt.** Missed days happen. Streaks don't break.
  Tasks don't fail.
- **Externalize, don't demand.** The app remembers, schedules, and
  scaffolds — so you don't have to hold it all in your head.
- **Cognitive accessibility first.** Single-column layouts, literal
  labels, no red alerts, no shame mechanics.
- **Honest pricing.** Most features are free forever. Paid tier covers
  the actual costs of AI and video infrastructure.

## What We Don't Do

- We don't diagnose ADHD. Please work with a licensed clinician for that.
- We don't replace therapy or coaching.
- We don't track or sell your data. See our [Privacy Policy](/privacy).

## Contact

Questions, feedback, or a dead reference link? Email us at
[contact@example.com](mailto:contact@example.com).
```

### 4.2 Page Layout

Single column, generous whitespace, body text at `--text-base` (16px) with `max-w-[65ch]`. Section headings use `--text-2xl`. No hero image. No call-to-action buttons.

This is a quiet page. It earns trust by being calm and unsales-y.

---

## 5. Footer Content

Persistent across all pages (except auth screens, which are minimal).

### 5.1 Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Focus Forge                                                      │
│                                                                   │
│  About · References · Privacy · Terms · Refunds · Contact         │
│                                                                   │
│  Built with care for ADHD brains.                                 │
│  © 2026 Focus Forge. All rights reserved.                         │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Footer Links

| Link | URL |
|---|---|
| About | `/about` |
| References | `/about/references` |
| Privacy | `/privacy` |
| Terms | `/terms` |
| Refunds | `/refunds` |
| Contact | `mailto:contact@example.com` |

### 5.3 Footer Copy Constraints

- **Tagline:** "Built with care for ADHD brains."
  - We approves this. It's warm without being saccharine.
- **No mailing list signup in the footer.** The Note: every email-capture field is friction. We don't need an email list.
- **No social media icons.** We're not on social media. Don't put placeholder icons.
- **Copyright line is subtle, not prominent.**

---

## 6. CI Link Checker

### 6.1 What It Does

- Reads `apps/web/data/references.json`
- Performs HEAD request to every URL
- Reports: status code, response time, redirect chain
- Flags: 404s, 500s, redirects to obviously-wrong destinations (parking pages, sale pages)
- Updates `lastUpdated` field to current ISO date when run
- Posts a summary to GitHub PR comments OR fails the build (configurable)

### 6.2 Workflow File

`.github/workflows/check-references.yml`:

```yaml
name: Check Reference Links

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday 9am UTC
  workflow_dispatch:      # Manual trigger
  pull_request:
    paths:
      - 'apps/web/data/references.json'

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g linkinator
      - name: Extract URLs from references.json
        run: |
          node -e "
            const data = require('./apps/web/data/references.json');
            const urls = data.categories.flatMap(c => c.references.map(r => r.url));
            require('fs').writeFileSync('urls.txt', urls.join('\n'));
          "
      - name: Check links
        id: check
        continue-on-error: true
        run: |
          linkinator urls.txt --format json > link-results.json
      - name: Post results
        if: always()
        run: |
          # Custom script that comments on PR or opens issue
          node scripts/post-link-check-results.js
```

### 6.3 Result Handling Policy

- **Scheduled run (weekly):** Opens a GitHub issue if any links are broken. Doesn't fail any builds.
- **PR run (when references.json changes):** Comments on the PR with results. Fails the check if a NEW broken link was added; warns about existing ones.
- **Manual run:** Reports to console.

This separates "the world has rotted" (scheduled check, low-urgency) from "this PR is adding broken links" (PR check, blocking).

### 6.4 What "Broken" Means

The checker flags as broken:

- HTTP 404, 410 (gone)
- HTTP 5xx (server error — retried 3 times)
- Connection timeout after 10 seconds
- Redirect to a domain that doesn't match (often: domain expiry parking)

The checker does NOT flag as broken:

- Redirects within the same domain (HTTPS upgrades, URL canonicalization)
- HTTP 403 / 401 (some sites block bots — manual verification needed)
- HTTP 429 (rate limiting — temporary)

---

## 7. Acceptance Criteria

The reference and content system is "done" when:

- [ ] `references.json` exists with all 75 references categorized
- [ ] Each reference has at minimum: id, title, publisher, url, weight
- [ ] Foundational and supporting references have annotations
- [ ] `/about` page exists with content from §4
- [ ] `/about/references` page renders categorized references with disclaimer
- [ ] All external links open in new tab with `rel="noopener noreferrer"`
- [ ] Footer present on all non-auth pages with correct links
- [ ] Search/filter input on references page works
- [ ] Page layout matches design system (single column, dark mode default)
- [ ] axe-core: 0 violations on About and References pages
- [ ] CI link checker workflow runs successfully on first commit
- [ ] CI link checker correctly identifies a deliberately broken URL (test)
- [ ] No tracking on outbound link clicks
- [ ] `lastUpdated` displays correctly on References page
- [ ] All content keyboard-navigable
- [ ] Content reads at 8th-grade level or below (Flesch-Kincaid check)

---

## 8. Future Maintenance

### 8.1 Adding A New Reference

1. Edit `apps/web/data/references.json`
2. Add to appropriate category, with annotation if foundational/supporting
3. Open PR
4. CI link checker validates
5. Merge

### 8.2 Removing A Dead Reference

If a link genuinely dies and there's no replacement:

1. Mark `"status": "archived"` in JSON (add this field as optional)
2. UI renders archived references with strikethrough + "no longer available" note
3. Don't silently delete — the citation remains valid even if the URL doesn't

### 8.3 Adding A New Category

Categories are stable; don't add lightly. If genuinely needed:

1. Add to JSON with id, title, description
2. Place in array order matching priority of source authority
3. Verify rendering on References page
