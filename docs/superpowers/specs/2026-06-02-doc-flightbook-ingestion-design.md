# Legacy DOC Flight Book Ingestion Design

## Goal

Allow users to upload legacy Microsoft Word `.doc` flight books through the existing Flight Books upload screen. Preserve the original file, extract its text, split it into sections, and index it for AI compliance comparison.

## Architecture

Add `word-extractor` as a server-side dependency. It parses legacy binary Word `.doc` files in Node.js without requiring LibreOffice or an external conversion service, so it fits the existing Vercel deployment.

Add a focused `extractDocText(bytes)` helper. The existing `POST /api/flightbooks/upload` route will identify `.doc` filenames, call the helper before storage writes, and send extracted text through the existing `detectSections` function.

The remaining upload path stays unchanged:

1. Preserve the original `.doc` file in the private Supabase `flightbooks` bucket.
2. Create or update the flight book record.
3. Insert detected sections.
4. Generate embeddings on a best-effort basis.

## Upload Behavior

Supported extensions become:

- `.pdf`
- `.doc`
- `.docx`
- `.txt`
- `.md`
- `.json`

If legacy Word parsing fails or produces no readable text, upload stops with a clear DOC-specific message before storage writes or database inserts.

## User Interface

Update the Flight Books upload screen, help article, FAQ, and empty-state guidance to list DOC alongside DOCX and existing formats.

## Testing

Add automated coverage that confirms:

- The DOC helper invokes `word-extractor` and rejects empty extraction.
- A real binary `.doc` fixture is parsed into readable text.
- The upload route runs DOC extraction before storage writes.
- The upload picker and user-facing guidance list DOC.

Run:

```bash
npm run test:unit
npm run build
npm run lint -- --quiet
git diff --check
```

The existing unrelated lint issue in `src/components/home/FeaturesSection.tsx` may remain outside this feature scope.
