---
name: datasource-normalizer
description: Use when editing datasource text files like `datas/*.txt` or importing campaign spreadsheet CSVs into datasource drafts, preserving titles, generating unique datasource names, and adding per-section ordering numbers.
---

# Datasource Normalizer

Use this skill ONLY for datasource work used in landing pages, especially:

- plain text lists under `datas/*.txt`
- spreadsheet exports like `datas/*.csv` coming from Google Sheets

## Expected File Shape

Each section starts with:

```text
/cyber/... or another landing path
<id> /slug
```

Then the section contains repeated item groups.

Original group:

```text
<Titulo>
<datasource>
```

Normalized group:

```text
<Titulo>
<datasource-normalizado>
<orden>
```

## CSV Import Shape

For spreadsheet exports like `mis datas - dia-del-padre.csv`, expect this structure:

- row 1: landing URLs by column
- row 3: button or section names by column
- from the `Menú para Real State` row downward: category cells distributed by column
- column A/B may also contain `> Seccion > Item` and section URL pairs that can be used as fallback

The import should produce datasource text sections in the same `datas/*.txt` format.

## Rules

1. Never modify the title line.
2. The line immediately below the title is the datasource.
3. Add a third line below each datasource with the display order.
4. Restart numbering from `1` inside each section.
5. If a section includes a highlighted separator like `Destacados`, assign it order `1` and continue numbering the remaining items after it.
6. Datasources must avoid collisions with other values that could be considered equivalent, including cross-section names that start too similarly.
7. Prefer short ASCII-like abbreviations without spaces.
8. If two titles are too similar, make the datasource more specific rather than more human-readable.
9. Keep the smallest correct edit; do not rewrite unrelated sections.
10. If the file has broken structure, fix it only enough to restore the pattern consistently.
11. When importing from CSV, derive the section slug from the URL path.
12. When importing from CSV and no real numeric id exists, keep a visible placeholder like `TODO /slug` unless the user provides ids.
13. Within the same section, datasources should avoid sharing the same first two letters whenever possible.
14. If two items share the same leading concept, keep the simpler one readable and move the distinguishing term forward for the other one.
15. For repeated highlighted separators like `Destacados`, derive the datasource from the section URL or slug so each one starts differently, for example `mundialerodest` instead of repeating `destacados`.

## Normalization Heuristics

- Remove spaces and separators.
- Prefer compressed forms such as dropping vowels when useful.
- Keep distinguishing terms when needed.
- Remove accents and other diacritics in datasource values.
- Examples:
  - `Notebooks` -> `notebooks`
  - `Notebooks Gamer` -> `gmrbks`
  - `Monitores` -> `mntrs`
  - `Monitores Gamer` -> `gmrntrs`

## Workflow

1. Read the full datasource file.
2. Detect each section boundary from the landing path line.
3. For every title/datasource pair, preserve the title and normalize only the datasource.
4. Insert or update the numeric order line below the datasource.
5. If a `Destacados`-style item exists in the section, move it to the first position before numbering.
6. Validate that numbering is sequential per section.
7. Validate that the resulting datasources are distinct enough to avoid collisions, especially for repeated labels like `Destacados` across sections.

## CSV Import Workflow

1. Read the CSV export.
2. Detect section columns from the URL row and button-name row.
3. Collect non-empty category cells per section column.
4. If a section column has no category cells, fall back to grouping rows from column A/B by URL.
5. Derive a slug from each section URL by replacing `/` with `-` and keeping the leading `/`.
6. Generate a draft section:

```text
/landing/path
TODO /landing-path

Titulo
datasource
1
```

7. Normalize datasource values and ensure uniqueness within each section.
8. For repeated labels like `Destacados`, generate a datasource from the section URL or slug so the values do not start alike across sections.
9. If a `Destacados`-style item exists in the section, place it first so it receives order `1`.
10. If asked to write the result, save it as a `datas/*.txt` file.

## Helper Script

Use `scripts/csv-to-datasource.js` from this skill when a CSV needs to be converted into a datasource draft.

Example:

```bash
node ".opencode/skills/datasource-normalizer/scripts/csv-to-datasource.js" "datas/mis datas - dia-del-padre.csv"
```

Optional numeric ids:

```bash
node ".opencode/skills/datasource-normalizer/scripts/csv-to-datasource.js" "datas/mis datas - dia-del-padre.csv" --start-id 3000
```

## Output Expectations

- Keep the file as plain text.
- Preserve blank lines already used as separators where possible.
- Do not introduce extra commentary into the file.

## Example Request

```text
Ayúdame a normalizar los datasource de `datas/cyber-2026.txt`, manteniendo los títulos y agregando el orden por sección.
```

```text
Genera un borrador `datas/dia-del-padre.txt` a partir de `datas/mis datas - dia-del-padre.csv` y luego normaliza los datasource.
```

After creating or editing this skill, the user must restart OpenCode for it to be loaded.
