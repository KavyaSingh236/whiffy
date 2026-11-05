# Whiffy
### A little whiff of a memory

Whiffy explores a simple question: **what if you could find your way back to a memory through its scent?**

Describe a person, place, or moment—your grandmother’s kitchen, a garden after rain, a quiet bookshop—and Whiffy turns the remembered smells into an editable scent brief. It uses molecular odor predictions to find individual scent references, then suggests familiar materials or perfumes that may evoke parts of the scene.

## Features

- **Text or voice memories:** type a story or dictate it, then review and edit the words.
- **A personal scent brief:** confirm wanted notes, remove unwanted ones, and adjust their importance.
- **Molecular matches:** explore real OpenPOM predictions alongside molecular structures and descriptor scores.
- **At-home scent references:** discover simple ways to explore familiar aspects of a memory using materials already available.
- **Perfumes to explore:** browse fragrances with overlapping brand-published notes and explanations of where they may differ.
- **Personal Memory Shelves:** Google sign-in and private account-based saving are supported when the authentication service is connected.
- **Downloadable keepsakes:** keep a text copy of a memory and its results.

## How it works

1. **Describe the memory.** The visitor writes or speaks the scent details they remember.
2. **Confirm the scent notes.** An on-device language model suggests descriptors. Local keyword extraction keeps the experience available when the language model is slow or unavailable.
3. **Find molecular references.** OpenPOM’s odor-label predictions rank a curated catalog of individual molecules against the confirmed brief.
4. **Explore the result.** The visitor inspects molecular evidence, familiar at-home references, and a separate selection of perfumes based on published notes.
5. **Keep the memory.** Visitors can download a keepsake or, with a connected account service, save it to their private shelf.

## The role of OpenPOM

OpenPOM is the molecular prediction engine behind Whiffy’s reference search. It processes molecular structures represented as SMILES and predicts scores across **138 odor labels**.

The app includes genuine cached inference for **30 individual molecules**, averaged across **10 trained OpenPOM models**. It also includes **256-dimensional embeddings** from one checkpoint for molecular-neighbor comparisons. Caching makes those results available in the browser without requiring a visitor to run a molecular ML server.

The ranking rewards predicted wanted descriptors and penalizes unwanted descriptors. Its score is a search heuristic, not a measured percentage of similarity to a remembered smell.

## Technology

| Layer | Technology |
| --- | --- |
| Interface | HTML, CSS, JavaScript |
| Molecular predictions | OpenPOM, DeepChem, DGL, PyTorch |
| Molecular validation and drawings | RDKit |
| On-device language assistance | Transformers.js, SmolLM2 |
| Voice input | Browser Speech Recognition API |
| Accounts and private storage | Supabase Auth, Google OAuth, PostgreSQL row-level security |
| Optional developer API | Python, FastAPI |
| Static hosting | GitHub Pages or Netlify |

## Privacy and personal shelves

Visitors can explore a scent memory without signing in. When the account service is connected, **Continue with Google** creates an account or signs a returning visitor in. The header displays their first name, and saved memories belong to their authenticated user ID.

Database row-level security restricts memory access to the owner. Account names are used for display, never for authorization. Signing out clears the displayed shelf, and late responses from a previous account are discarded.

Voice recognition depends on browser support and microphone permission. Some browsers process speech through their provider’s service. Whiffy does not store voice recordings.

## Scope and limitations

Whiffy offers a **scent interpretation**, not an exact reconstruction of a memory.

- OpenPOM predicts individual molecules, not finished perfumes, household materials, or mixtures.
- Molecular rankings do not establish which chemicals were present in the original scene.
- Household references are exploratory scent experiences, not validated blending or skin-use recipes.
- Perfume suggestions use published note overlap separately from OpenPOM; their actual formulas are unknown.
- The model does not assess safety, allergenicity, exposure, or suitability for use.
- Some catalog structures leave stereochemistry unspecified.
- Google sign-in and cloud saving require an owner-configured authentication service. Voice and on-device AI availability vary by browser.

## Project structure

| Folder | Purpose |
| --- | --- |
| `dist/` | Browser application, molecular prediction cache, and visual assets |
| `backend/` | Molecular catalog, OpenPOM inference, and optional FastAPI service |
| `supabase/` | Private memory schema, access policies, and database isolation checks |
| `scripts/` | Hosting configuration helpers |
| `tests/` | Molecular matching, account-boundary, and voice-input checks |
| `.github/workflows/` | Automated checks and GitHub Pages deployment |

## Validation

The JavaScript suite contains **25 passing checks** covering prediction-data integrity, scent matching, unwanted-note handling, account ownership boundaries, late-response isolation, and speech-input behavior.

Account and speech-provider checks use mocks. A live Google OAuth deployment, real-database isolation, and actual microphone transcription must be verified in the configured deployment; they are not implied by the automated test count.

## References

- [OpenPOM](https://github.com/ARY2260/openpom) — open-source Principal Odor Map replication.
- Lee et al., [A principal odor map unifies diverse tasks in olfactory perception](https://doi.org/10.1126/science.ade4401), *Science* (2023).
- [Transformers.js](https://github.com/huggingface/transformers.js) and [SmolLM2](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct).
- Brand sources for perfume notes are linked in the app and recorded in `dist/data.js`.

The broader relationship between scent and memory has existing research and creative work. Whiffy is an independent software exploration of that space.

Created by **Kavya Balaji Singh**.
