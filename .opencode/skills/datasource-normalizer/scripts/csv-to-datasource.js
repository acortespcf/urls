#!/usr/bin/env node

const fs = require("fs")
const path = require("path")

function parseArgs(argv) {
  const args = { input: null, output: null, startId: null }

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!args.input && !arg.startsWith("--")) {
      args.input = arg
      continue
    }
    if (arg === "--output") {
      args.output = argv[i + 1]
      i += 1
      continue
    }
    if (arg === "--start-id") {
      args.startId = Number(argv[i + 1])
      i += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  if (!args.input) throw new Error("Usage: csv-to-datasource.js <input.csv> [--output file] [--start-id N]")
  if (args.startId !== null && Number.isNaN(args.startId)) throw new Error("--start-id must be a number")

  return args
}

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ",") {
      row.push(cell)
      cell = ""
      continue
    }
    if (char === "\n") {
      row.push(cell.replace(/\r$/, ""))
      rows.push(row)
      row = []
      cell = ""
      continue
    }

    cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""))
    rows.push(row)
  }

  return rows
}

function clean(value) {
  return (value || "").trim()
}

function slugFromUrl(url) {
  const trimmed = clean(url).replace(/\/+$/, "") || "/"
  return trimmed === "/" ? "/" : `/${trimmed.replace(/^\//, "").replace(/\//g, "-")}`
}

function itemFromHierarchy(title) {
  const trimmed = clean(title)
  if (!trimmed) return ""
  const parts = trimmed.split(">").map((part) => clean(part)).filter(Boolean)
  return parts[parts.length - 1] || trimmed
}

function normalizeText(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function abbreviateWord(word) {
  const stripped = normalizeText(word).replace(/[^a-z0-9]/g, "")
  if (!stripped) return ""
  if (stripped.length <= 4) return stripped

  const noVowels = stripped[0] + stripped.slice(1).replace(/[aeiou]/g, "")
  return noVowels.length >= 4 ? noVowels : stripped
}

function shortTailToken(word) {
  const token = abbreviateWord(word)
  if (token.length <= 4) return token
  return token.slice(-4)
}

function titleWords(title) {
  return normalizeText(title)
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word, index, words) => words.length === 1 || !["y", "de", "para", "con", "sin", "and"].includes(word))
}

function datasourceCandidates(words, preferDistinctiveFirst = false) {
  if (words.length === 0) return "item"

  if (words.length === 1) {
    const word = words[0]
    const shifted = word.length > 4 ? `${word.slice(2)}${word.slice(0, 2)}` : word
    const tailFirst = `${shortTailToken(word)}${word.slice(0, 3)}`
    return [word, abbreviateWord(word), tailFirst, shifted]
      .map((value) => value.slice(0, 24))
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index)
  }

  const full = words.join("")
  const compact = words.map(abbreviateWord).join("")
  const reversedCompact = words.slice(1).map(abbreviateWord).join("") + abbreviateWord(words[0])
  const reversedShort = words.slice(1).map(abbreviateWord).join("") + shortTailToken(words[0])
  const tailCompact = words.map(shortTailToken).join("")
  const ordered = preferDistinctiveFirst
    ? [reversedShort, reversedCompact, compact, full, tailCompact]
    : [full, compact, reversedCompact, reversedShort, tailCompact]

  return ordered
    .map((value) => value.slice(0, 24))
    .filter(Boolean)
}

function prefix(value) {
  return value.slice(0, 4)
}

function isFeaturedSeparator(title) {
  const normalized = normalizeText(title)
  return normalized.includes("destacado")
}

function sectionSlugToken(url) {
  const parts = clean(url)
    .replace(/\/+$/, "")
    .split("/")
    .filter(Boolean)

  const preferredPart = parts[parts.length - 1] || "section"
  const words = preferredPart
    .split("-")
    .map((word) => normalizeText(word).replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .filter((word) => !["papa", "regalos", "dia", "del", "de", "para", "y"].includes(word))

  const base = words.length > 0 ? words.join("") : normalizeText(preferredPart).replace(/[^a-z0-9]/g, "")
  return (base || "section").slice(0, 18)
}

function featuredDatasourceForSection(url, used, usedPrefixes) {
  const base = `${sectionSlugToken(url)}dest`.slice(0, 24)
  let candidate = base
  let suffix = 2

  while (used.has(candidate) || usedPrefixes.has(prefix(candidate))) {
    candidate = `d${suffix}${base}`.slice(0, 24)
    suffix += 1
  }

  used.add(candidate)
  usedPrefixes.add(prefix(candidate))
  return candidate
}

function prioritizeFeaturedItems(items) {
  const featured = []
  const regular = []

  for (const item of items) {
    if (isFeaturedSeparator(item)) {
      featured.push(item)
      continue
    }

    regular.push(item)
  }

  return [...featured, ...regular]
}

function uniqueDatasource(title, url, used, usedPrefixes, usedLeadingWords) {
  if (isFeaturedSeparator(title)) {
    return featuredDatasourceForSection(url, used, usedPrefixes)
  }

  const words = titleWords(title)
  const preferDistinctiveFirst = words.length > 1 && usedLeadingWords.has(words[0])
  const rawCandidates = datasourceCandidates(words, preferDistinctiveFirst)
  const candidates = Array.isArray(rawCandidates) ? rawCandidates : [rawCandidates]

  for (const candidate of candidates) {
    if (!used.has(candidate) && !usedPrefixes.has(prefix(candidate))) {
      used.add(candidate)
      usedPrefixes.add(prefix(candidate))
      if (words[0]) usedLeadingWords.add(words[0])
      return candidate
    }
  }

  const base = candidates[0] || "item"
  const fallbackBases = [
    `x${base}`,
    `${base.slice(2)}${base.slice(0, 2)}`,
    `${shortTailToken(base)}${base.slice(0, 3)}`,
  ]

  for (const fallbackBase of fallbackBases) {
    const candidate = fallbackBase.slice(0, 24)
    if (candidate && !used.has(candidate) && !usedPrefixes.has(prefix(candidate))) {
      used.add(candidate)
      usedPrefixes.add(prefix(candidate))
      if (words[0]) usedLeadingWords.add(words[0])
      return candidate
    }
  }

  let suffix = 2
  let candidate = `x${suffix}${base}`.slice(0, 24)

  while (used.has(candidate) || usedPrefixes.has(prefix(candidate))) {
    suffix += 1
    candidate = `x${suffix}${base}`.slice(0, 24)
  }

  used.add(candidate)
  usedPrefixes.add(prefix(candidate))
  if (words[0]) usedLeadingWords.add(words[0])
  return candidate
}

function collectSections(rows) {
  const urlRow = rows[0] || []
  const labelRow = rows[2] || []
  const menuStartIndex = rows.findIndex((row) => clean(row[0]).toLowerCase().includes("menú para real state"))
  const dataStart = menuStartIndex >= 0 ? menuStartIndex + 1 : 8
  const sections = new Map()
  const fallbackItems = new Map()

  for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || []
    const rawTitle = clean(row[0])
    const rawUrl = clean(row[1])

    if (rawTitle && rawUrl) {
      const item = itemFromHierarchy(rawTitle)
      if (item) {
        if (!fallbackItems.has(rawUrl)) fallbackItems.set(rawUrl, [])
        fallbackItems.get(rawUrl).push(item)
      }
    }
  }

  for (let column = 2; column < urlRow.length; column += 1) {
    const url = clean(urlRow[column])
    if (!url) continue

    const label = clean(labelRow[column])
    const items = []
    const seen = new Set()

    for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
      const value = clean((rows[rowIndex] || [])[column])
      if (!value || /^separadores$/i.test(value)) continue
      if (!seen.has(value)) {
        items.push(value)
        seen.add(value)
      }
    }

    if (items.length === 0 && fallbackItems.has(url)) {
      for (const value of fallbackItems.get(url)) {
        if (!seen.has(value)) {
          items.push(value)
          seen.add(value)
        }
      }
    }

    if (items.length === 0 && label) {
      items.push(label)
    }

    if (items.length > 0) {
      sections.set(url, { url, label, items })
    }
  }

  return Array.from(sections.values())
}

function renderSections(sections, startId) {
  let nextId = startId
  const used = new Set()
  const usedPrefixes = new Set()
  const usedLeadingWords = new Set()

  return sections
    .map((section) => {
      const header = nextId === null ? `TODO ${slugFromUrl(section.url)}` : `${nextId++} ${slugFromUrl(section.url)}`
      const lines = [section.url, header, ""]
      const orderedItems = prioritizeFeaturedItems(section.items)

      orderedItems.forEach((title, index) => {
        const datasource = uniqueDatasource(title, section.url, used, usedPrefixes, usedLeadingWords)
        lines.push(title)
        lines.push(datasource)
        lines.push(String(index + 1))
        lines.push("")
      })

      return lines.join("\n").trimEnd()
    })
    .join("\n\n----------\n\n") + "\n"
}

function main() {
  const args = parseArgs(process.argv)
  const inputPath = path.resolve(args.input)
  const csv = fs.readFileSync(inputPath, "utf8")
  const rows = parseCsv(csv)
  const sections = collectSections(rows)

  if (sections.length === 0) {
    throw new Error("No sections detected in CSV")
  }

  const output = renderSections(sections, args.startId)

  if (args.output) {
    fs.writeFileSync(path.resolve(args.output), output)
    return
  }

  process.stdout.write(output)
}

main()
