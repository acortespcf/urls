---
name: datasource-to-sheets
description: Use when importing datasource TXT files into configured Google Sheets, matching landing buttons and sub-dividers, and updating ID, datasource, title, and order columns.
---

# Datasource to Google Sheets

## Recommended simple setup

Use `scripts/google-apps-script.gs` directly inside the target spreadsheet. This avoids Google Cloud, service-account credentials, Playwright, and MCP.

1. Upload the TXT file to Google Drive and copy its file ID from the URL.
2. In the spreadsheet, open **Extensions > Apps Script**.
3. Replace the editor contents with `google-apps-script.gs`.
4. Set `CONFIG.fileId` to the uploaded TXT file ID and `CONFIG.spreadsheetId` to the destination spreadsheet ID.
5. Save and reload the spreadsheet.
6. Use **Datasources > Vista previa**.
7. If the rows are correct, use **Datasources > Importar TXT**.

The script asks for Google authorization the first time. It updates only columns A, B, C, and U in `REAL STATE`. Sections with `TODO` are skipped and reported rather than writing invalid IDs.

Use this skill to synchronize `datas/*.txt` files with Google Sheets.

## Safety rules

- Always use `Vista previa` before writing.
- Update only columns A, B, C, and U unless the user explicitly requests otherwise.
- Match existing rows; do not append rows by default.
- Preserve the existing sheet IDs and all other columns.
- Stop without writing if any requested item has no unique matching row.
- Never include Google credentials in the repository or in chat.

## TXT mapping

Each section has a landing path, an ID/slug line, and title/datasource/order groups:

```text
/aniversario
2005 /aniversario

Imperdibles
fiestax
1
```

The final URL segment identifies the `Botón en Landing` (for example, `computadores-y-tablets` becomes `Computadores y Tablets`). The section path and title identify the `SUB-DIV (Separador)` row. The numeric ID is written to column A, the datasource to B, the title to C, and the order to U.

After modifying this skill, restart OpenCode so it is loaded.
