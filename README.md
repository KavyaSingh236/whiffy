# Whiffy ✳
### A little whiff of a memory.

Whiffy turns a written or spoken scent memory into an editable scent brief, live molecular odor predictions, familiar home scent references, and perfumes to explore.

Think jasmine outside a window, coffee in a grandmother’s kitchen, or old wooden bookshelves. Whiffy helps explore those details through molecular machine learning without claiming to recover the exact smell of the past.

## How it works

1. **Describe a memory.** Type a story or use the microphone where browser speech recognition is supported.
2. **LLM interpretation.** A server-side language model extracts wanted and unwanted OpenPOM odor labels. The user confirms the suggestions and adjusts their importance.
3. **Grounded molecule selection.** The LLM selects candidate IDs from a catalog of 30 known molecules. The backend resolves their SMILES; the LLM cannot invent chemical structures.
4. **Live OpenPOM inference.** RDKit validates the structures. OpenPOM scores the selected molecules during the request, producing 138 odor-label probabilities and 256-dimensional embeddings. Ranking rewards wanted notes and penalizes excluded notes.
5. **Evidence-grounded recommendations.** A final LLM receives the actual model scores, the confirmed brief, approved household references, and a sourced perfume catalog. It writes a personal explanation and selects references and perfumes from those options.
6. **Keep a little memory.** Download a text keepsake or save a compact result snapshot to a private, Google-authenticated memory shelf.

There is no silent keyword, browser-LLM, or cached-prediction fallback in the live flow. If an external service or the model fails, the app displays an error and allows a retry.

## Features

- Editable scent notes, exclusions, and importance sliders.
- Google sign-in, first-name greeting, private memory shelves, and sign-out.
- Voice-to-text input with a typed-text alternative.
- Real per-request OpenPOM predictions, SMILES, model scores, and molecular embedding neighbors.
- Step-by-step home scent references using familiar materials, selected using model evidence.
- Perfume names, source links, and brand-page photos when metadata is accessible.
- Google Shopping and Amazon search links for the selected perfumes.
- Responsive scrapbook-inspired interface with downloadable text keepsakes.

## The model’s role

OpenPOM accepts **single-molecule SMILES**, not memories, fragrance notes, or mixtures. The LLM bridges the language-to-molecule step, while OpenPOM supplies molecular odor evidence that the final LLM must use.

The live runtime defaults to upstream **experiments_1** for a smaller CPU footprint. It supports 1–10 upstream checkpoints and reports the number actually used. Embeddings always come from experiments_1; independently trained embedding spaces are not averaged. A single-checkpoint deployment must not be described as reproducing an ensemble benchmark.

The repository also retains a genuine historical 10-checkpoint prediction dataset for regression tests and reproducibility. The live frontend loads catalog metadata only; historical predictions are not substituted for live inference.

## Recommendation limits

Home instructions are approved sensory exercises selected by the LLM, rather than unrestricted generated chemistry recipes. They evoke parts of a memory using separate familiar materials; they are not validated blends, wearable formulations, or exact reconstructions.

Perfume recommendations are limited to **seven sourced catalog entries**. Candidate selection uses confirmed notes and model-supported scent families, followed by LLM selection. The finished perfume’s formula and combined smell are not predicted by OpenPOM. Product photos are read from brand-page metadata when available; an explicitly labeled illustration appears if the image cannot be retrieved or displayed. Shopping links are search queries, not verified offers. Prices, stock, seller authenticity, and resemblance are not guaranteed.

The model does not assess safety, allergies, regulations, skin suitability, or scent intensity. Some catalog structures leave stereochemistry unspecified. Exclusions filter known catalog notes; they do not establish the absence of an ingredient or allergen in a product.

## Architecture

| Layer | Technology |
| --- | --- |
| Interface | HTML, CSS, JavaScript modules |
| Speech input | Browser SpeechRecognition where supported |
| Language model | Server-side Groq API or local Ollama |
| API | Python 3.10, FastAPI, HTTPX |
| Molecular ML | OpenPOM, PyTorch CPU, DeepChem, DGL, RDKit |
| Accounts and storage | Supabase Auth, Google OAuth, PostgreSQL row-level security |
| Delivery | GitHub Pages frontend workflow and Python backend Docker image |

GitHub Pages serves the interface; live inference requires a separately running Python backend. LLM credentials belong only in that backend’s environment. Google OAuth client secrets belong in Supabase. Public frontend configuration contains only the API origin, Supabase URL, and publishable key.

## Privacy and access

Submitting a memory sends its text to the backend and the configured LLM provider. Saving is a separate user action. Supabase stores saved memories under the authenticated user, with row-level security enforcing ownership. The backend validates bearer tokens through Supabase, limits per-account requests, and runs one live inference job at a time per process. These in-memory limits target a single-worker portfolio deployment, not a distributed production service.

Voice transcription may send audio to the browser provider’s speech service. Whiffy does not store recordings. Brand photos and shopping links contact external services. There are no affiliate links.

## Repository

- `dist/`: web interface, catalog, account and voice modules, historical prediction fixture.
- `backend/`: authenticated API, grounded recommendation pipeline, live OpenPOM runtime, curated references, and model downloader.
- `supabase/`: database schema, ownership policies, and isolation checks.
- `tests/`: JavaScript checks for model ranking, accounts, speech, and live API behavior.
- `.github/workflows/`: frontend test and deployment workflow plus backend unit tests.
- `Dockerfile`: Python CPU backend image; upstream checkpoints download during build.

## Validation

Automated checks cover label validation, wanted/excluded-note handling, live evidence propagation into the final LLM prompt, rejection of invented molecule/product IDs, authentication, explicit failure behavior, compact saved snapshots, account switching, and microphone lifecycle behavior. The real CPU checkpoint was also exercised against all 30 catalog molecules and through an integration run with scripted LLM responses. External LLM calls, Google OAuth, product-image availability, and deployed database policies still require deployment-specific verification.

## References

- [OpenPOM source and checkpoints](https://github.com/ARY2260/openpom)
- [A principal odor map unifies diverse tasks in olfactory perception — Lee et al., Science (2023)](https://doi.org/10.1126/science.ade4401)
- Individual compound and brand source links are included with the app’s references.

Created by **Kavya Singh**.
