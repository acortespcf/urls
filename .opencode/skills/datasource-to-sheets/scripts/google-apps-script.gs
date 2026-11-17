const CONFIG = {
  fileId: "1q6cu9H-pE3ETQNNZqqk_v9lBtIEK2L-Y",
  spreadsheetId: "1cUCZQEA5kXdsfu03LVITCTzrLDDEHB0ns43Jj862zCE",
  sheetName: "REAL STATE",
  firstDataRow: 4,
  allowTodoIds: true, // Si es true, cuando el TXT tiene "TODO" actualiza Datasource (B), Título (C) y Orden (U) sin pisar el ID de la Columna A
}

function getUiSafe() {
  try {
    return SpreadsheetApp.getUi()
  } catch (e) {
    return null
  }
}

function notify(title, message) {
  Logger.log(`[${title}]\n${message}`)
  const ui = getUiSafe()
  if (ui) {
    ui.alert(title, message, ui.ButtonSet.OK)
  }
}

function onOpen() {
  const ui = getUiSafe()
  if (!ui) {
    Logger.log("onOpen está pensado para ejecutarse al abrir la planilla. Para probar o importar desde el editor, ejecuta previewImport o importTxt.")
    return
  }
  ui.createMenu("Datasources")
    .addItem("Vista previa", "previewImport")
    .addItem("Importar TXT", "importTxt")
    .addToUi()
}

// Función para probar DIRECTAMENTE desde el editor sin bloqueos de interfaz (se ve en el Log de ejecución)
function testImportLog() {
  previewImport()
}

function previewImport() {
  try {
    const result = buildImport()
    const message = [
      `📄 Archivo Drive ID: ${CONFIG.fileId}`,
      `📊 Spreadsheet Destino ID: ${CONFIG.spreadsheetId}`,
      `📊 Hoja de cálculo: ${CONFIG.sheetName}`,
      `✅ Coincidencias encontradas: ${result.updates.length} filas a actualizar`,
      "",
      `⚠️ Secciones/Categorías sin coincidencia u omitidas (${result.skipped.length}):`,
      result.skipped.length > 0 ? result.skipped.map((s) => " • " + s).join("\n") : " Ninguna",
      "",
      `❌ Errores (${result.errors.length}):`,
      result.errors.length > 0 ? result.errors.map((e) => " • " + e).join("\n") : " Ninguno",
      "",
      "--- Muestra de actualizaciones (primeras 15) ---",
      result.updates
        .slice(0, 15)
        .map((u) => `Fila ${u.row}: ID ${u.id || "(mantener actual)"} | ${u.title} -> DS: "${u.datasource}" | Orden: ${u.order}`)
        .join("\n") || "No se generaron actualizaciones.",
    ].join("\n")

    notify("Vista Previa de Importación", message)
  } catch (err) {
    notify("Error al ejecutar Vista Previa", err.message)
  }
}

function importTxt() {
  try {
    const result = buildImport()
    if (result.errors.length > 0) {
      throw new Error(`No se puede importar debido a los siguientes errores:\n${result.errors.join("\n")}`)
    }
    if (result.updates.length === 0) {
      Logger.log("Omitidos:\n" + result.skipped.join("\n"))
      throw new Error("No se encontraron filas para actualizar. Revisa la Vista previa para ver qué secciones se omitieron.")
    }

    const ui = getUiSafe()
    if (ui) {
      const answer = ui.alert(
        "Confirmar importación",
        `Se actualizarán ${result.updates.length} filas en la hoja "${CONFIG.sheetName}" del documento. ¿Deseas continuar?`,
        ui.ButtonSet.YES_NO,
      )
      if (answer !== ui.Button.YES) return
    }

    const sheet = getTargetSheet()

    result.updates.forEach((update) => {
      if (update.id !== null) {
        // Columna A (ID), Columna B (Datasource), Columna C (Título)
        sheet.getRange(update.row, 1, 1, 3).setValues([[update.id, update.datasource, update.title]])
      } else {
        // Si el ID es TODO, solo actualiza Columna B (Datasource) y Columna C (Título), respetando la Columna A
        sheet.getRange(update.row, 2, 1, 2).setValues([[update.datasource, update.title]])
      }
      // Columna U (Orden)
      sheet.getRange(update.row, 21).setValue(update.order)
    })

    notify("¡Importación Exitosa!", `Se actualizaron correctamente ${result.updates.length} filas en la planilla destino.`)
  } catch (err) {
    notify("Error al Importar", err.message)
  }
}

function getTargetSheet() {
  const doc = SpreadsheetApp.openById(CONFIG.spreadsheetId)

  let sheet = doc.getSheetByName(CONFIG.sheetName)
  if (!sheet) {
    sheet = doc.getSheets().find((s) => normalize(s.getName()) === normalize(CONFIG.sheetName))
  }
  if (!sheet) {
    const available = doc
      .getSheets()
      .map((s) => `"${s.getName()}"`)
      .join(", ")
    throw new Error(`No existe la pestaña "${CONFIG.sheetName}". Pestañas en la planilla destino: ${available}`)
  }
  return sheet
}

function buildImport() {
  const file = findTxtFile(CONFIG.fileId)
  const sections = parseTxt(file.getBlob().getDataAsString("UTF-8"))
  const sheet = getTargetSheet()

  const lastRow = sheet.getLastRow()
  const values =
    lastRow >= CONFIG.firstDataRow
      ? sheet.getRange(CONFIG.firstDataRow, 1, lastRow - CONFIG.firstDataRow + 1, 21).getValues()
      : []

  const updates = []
  const skipped = []
  const errors = []

  sections.forEach((section) => {
    const hasNumericId = /^\d+$/.test(section.id || "")
    if (!hasNumericId && !CONFIG.allowTodoIds) {
      skipped.push(`${section.url} (el ID es "${section.id || "vacío"}", requiere número)`)
      return
    }

    const effectiveId = hasNumericId ? section.id : null

    section.items.forEach((item) => {
      const matches = values
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => matchesRow(row, section.url, item.title))

      if (matches.length === 0) {
        skipped.push(`${section.url} > ${item.title} (no se encontró coincidencia en la hoja)`)
        return
      }

      matches.forEach((match) => {
        updates.push({
          row: CONFIG.firstDataRow + match.index,
          id: effectiveId,
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
    throw new Error(`No se pudo acceder al archivo de Drive (ID: ${fileId}). Asegúrate de autorizar los permisos de DriveApp.`)
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
  const colD = normalize(row[3])
  const firstDiv = normalize(firstSubDiv(row[4]))
  const subDiv = normalize(lastSubDiv(row[4]))

  const matchesLanding = colD === landing || firstDiv === landing
  const matchesTitle = subDiv === normalize(title)

  return matchesLanding && matchesTitle
}

function firstSubDiv(value) {
  const parts = String(value || "")
    .split(">")
    .map((p) => p.trim())
    .filter(Boolean)
  return parts[0] || ""
}

function lastSubDiv(value) {
  const parts = String(value || "").split(">")
  return parts[parts.length - 1].trim()
}

function landingButton(url) {
  const segments = url.split("/").filter(Boolean)
  const section = segments[segments.length - 1] || ""
  return section
    .replace(/[-_]+(.)?/g, (_, character) => (character ? ` ${character.toUpperCase()}` : " "))
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
