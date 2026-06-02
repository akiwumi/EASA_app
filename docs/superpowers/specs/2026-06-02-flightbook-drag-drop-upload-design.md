# Flight Book Drag-and-Drop Upload Design

## Goal

Allow users to drag and drop one flight book file onto the existing upload form while preserving the current browse-file path.

## Interaction

Replace the plain file input presentation with an accessible drop zone:

- Clicking the zone opens the native file picker.
- Keyboard users can focus the zone and press Enter or Space to browse.
- Dragging a file over the zone adds an accent highlight.
- Dropping one supported file selects it exactly like the existing file input.
- Dropping multiple files shows a clear error.
- Dropping an unsupported extension shows a clear error.

Supported formats remain PDF, DOC, DOCX, TXT, MD, and JSON.

## Architecture

Keep the existing upload API unchanged. Add small client-side helpers inside `FlightbookUpload.tsx`:

- `SUPPORTED_FILE_EXTENSIONS`
- `isSupportedFile(file)`
- `selectFile(file)`
- drop and drag event handlers

The native file input remains mounted but visually hidden. It continues to provide browser file selection and its `accept` attribute.

## Testing

Add source regression coverage for:

- Supported extension list.
- Hidden native input.
- Accessible drop-zone semantics and keyboard behavior.
- Drag highlight state.
- Single-file drop selection.
- Multiple-file and unsupported-file errors.

Run:

```bash
npm run test:unit
npm run build
npm run lint -- --quiet
git diff --check
```

The existing unrelated lint issue in `src/components/home/FeaturesSection.tsx` may remain outside this feature scope.
