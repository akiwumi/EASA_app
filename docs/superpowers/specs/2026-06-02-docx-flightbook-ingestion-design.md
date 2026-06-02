# DOCX Flight Book Ingestion Design

## Goal

Allow users to upload Microsoft Word `.docx` flight books through the existing Flight Books upload screen. Preserve the original file, extract its text, split it into sections, and index it for AI compliance comparison.

Legacy `.doc` files remain unsupported.

## Architecture

Add `mammoth` as a server-side dependency. The existing `POST /api/flightbooks/upload` route will identify `.docx` filenames, pass the uploaded bytes to Mammoth, and send the extracted raw text through the route's existing `detectSections` function.

The rest of the upload path remains unchanged:

1. Preserve the original file in the private Supabase `flightbooks` storage bucket.
2. Create or update the flight book record.
3. Insert detected sections.
4. Generate embeddings on a best-effort basis.

The storage bucket already accepts unrestricted MIME types, so no Supabase SQL change is needed.

## Upload Behavior

Supported extensions become:

- `.pdf`
- `.docx`
- `.txt`
- `.md`
- `.json`

For `.docx`, the route extracts raw text using Mammoth. If Mammoth cannot extract text or reports a parsing failure, the upload stops with a clear DOCX-specific error. The route must not store a partially processed DOCX file or create flight book records after extraction failure.

For `.doc`, the route returns the existing unsupported-file response, updated to list supported formats.

## User Interface

Update the Flight Books upload screen:

- Add `.docx` to the file input `accept` attribute.
- List DOCX alongside the existing supported formats.
- Explain that Word text is extracted, sectioned, stored, and indexed.

Update help content and the FAQ to state that DOCX uploads are supported. Remove guidance requiring Word users to export DOCX files as PDF.

## Testing

Add focused automated regression coverage that confirms:

- The upload route contains a `.docx` branch using Mammoth extraction before `detectSections`.
- The unsupported-file response lists DOCX.
- The upload file picker accepts `.docx`.
- Upload UI copy, help content, and FAQ mention DOCX support.
- `.doc` is not added to the accepted extension list.

Run:

```bash
npm run test:unit
npm run build
npm run lint -- --quiet
```

The existing unrelated lint issue in `src/components/home/FeaturesSection.tsx` may remain outside this feature scope.
