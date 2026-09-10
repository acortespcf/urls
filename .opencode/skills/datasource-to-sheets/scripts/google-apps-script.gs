const CONFIG = {
  fileId: "1VmW3e4hlVwsqIuBTABR8BoaYYl98rSTP",
  spreadsheetId: "1refQut1JTzsP1MmryjeiJRUDB_XakrqaCIaEnXkR3rM",
  sheetName: "REAL STATE",
  firstDataRow: 4,
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Datasources")
    .addItem("Vista previa", "previewImport")
    .addItem("Importar TXT", "importTxt")
    .addToUi()
}

function previewImport() {
  const result = buildImport()
  const message = [
    `Archivo de Drive: ${CONFIG.fileId}`,
    `Filas que se actualizarán: ${result.updates.length}`,
    `Secciones/categorías omitidas: ${result.skipped.join(", ") || "ninguna"}`,
    `Problemas de coincidencia: ${result.errors.join(", ") || "ninguno"}`,
    "",
    result.updates.slice(0, 20).map((update) =>
      `Fila ${update.row}: ${update.title} | ${update.datasource} | orden ${update.order}`
    ).join("\n") || "No se encontraron coincidencias",
  ].join("\n")
  SpreadsheetApp.getUi().alert("Vista previa", message, SpreadsheetApp.getUi().ButtonSet.OK)
}

function importTxt() {
  const result = buildImport()
  if (result.errors.length > 0) {
    throw new Error(`No se puede importar: ${result.errors.join("; ")}`)
  }
  if (result.updates.length === 0) throw new Error("No se encontraron filas para actualizar")

  const ui = SpreadsheetApp.getUi()
  const answer = ui.alert(
    "Confirmar importación",
    `Se actualizarán ${result.updates.length} filas en ${CONFIG.sheetName}. ¿Continuar?`,
    ui.ButtonSet.YES_NO,
  )
  if (answer !== ui.Button.YES) return

  const sheet = SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(CONFIG.sheetName)
  result.updates.forEach((update) => {
    sheet.getRange(update.row, 1, 1, 3).setValues([[update.id, update.datasource, update.title]])
    sheet.getRange(update.row, 21).setValue(update.order)
  })
  ui.alert(`Importación terminada: ${result.updates.length} filas actualizadas.`)
}

function buildImport() {
  const file = findTxtFile(CONFIG.fileId)
  const sections = parseTxt(file.getBlob().getDataAsString("UTF-8"))
  const sheet = SpreadsheetApp.openById(CONFIG.spreadsheetId).getSheetByName(CONFIG.sheetName)
  if (!sheet) throw new Error(`No existe la hoja ${CONFIG.sheetName}`)

  const lastRow = sheet.getLastRow()
  const values = lastRow >= CONFIG.firstDataRow
    ? sheet.getRange(CONFIG.firstDataRow, 1, lastRow - CONFIG.firstDataRow + 1, 21).getValues()
    : []
  const updates = []
  const skipped = []
  const errors = []

  sections.forEach((section) => {
    if (!/^\d+$/.test(section.id || "")) {
      skipped.push(`${section.url} (sin ID numérico)`)
      return
    }
    section.items.forEach((item) => {
      const matches = values
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => matchesRow(row, section.url, item.title))

      if (matches.length === 0) {
        skipped.push(`${section.url} > ${item.title} (sin filas en la hoja)`)
        return
      }

      matches.forEach((match) => {
        updates.push({
          row: CONFIG.firstDataRow + match.index,
          id: section.id,
          datasource: item.datasource,
          title: item.title,
          order: item.order,
        })
      })
    })
  })
  return { updates, skipped, errors }
}

function findTxtFile(fileId) {
  try {
    return DriveApp.getFileById(fileId)
  } catch (error) {
    throw new Error(`No se pudo acceder al archivo de Drive ${fileId}`)
  }
}

function parseTxt(text) {
  const sections = []
  let section = null
  const lines = text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim()
    if (!line || line === "----------") continue
    if (line.charAt(0) === "/") {
      if (section) sections.push(section)
      section = { url: line, id: null, items: [] }
      continue
    }
    if (!section) continue
    if (section.id === null) {
      const idMatch = line.match(/^(\d+|TODO)\s+\S+/i)
      if (idMatch) section.id = idMatch[1]
      continue
    }
    const datasource = lines[i + 1] && lines[i + 1].trim()
    const order = lines[i + 2] && lines[i + 2].trim()
    if (datasource && /^\d+$/.test(order)) {
      section.items.push({ title: line, datasource, order })
      i += 2
    }
  }
  if (section) sections.push(section)
  return sections
}

function matchesRow(row, url, title) {
  const landing = normalize(landingButton(url))
  const subDiv = normalize(lastSubDiv(row[4]))
  return normalize(row[3]) === landing && subDiv === normalize(title)
}

function lastSubDiv(value) {
  const parts = String(value || "").split(">")
  return parts[parts.length - 1].trim()
}

function landingButton(url) {
  const segments = url.split("/").filter(Boolean)
  const section = segments[segments.length - 1] || ""
  return section.replace(/[-_]+(.)?/g, (_, character) => character ? ` ${character.toUpperCase()}` : " ")
    .replace(/^./, (character) => character.toUpperCase())
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}
