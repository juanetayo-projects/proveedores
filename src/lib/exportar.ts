import ExcelJS from 'exceljs'

export type Filtro = { label: string; valor: string }

/** Logo institucional embebido en los reportes (Excel y PDF). Se carga desde
 * /public para no inflar el bundle con un base64 fijo. */
async function cargarLogoBase64(): Promise<{ base64: string; extension: 'png' | 'jpeg' } | null> {
  try {
    const url = `${import.meta.env.BASE_URL}images/logo_cacsb2.png`
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    return { base64, extension: blob.type.includes('jpeg') ? 'jpeg' : 'png' }
  } catch {
    return null
  }
}

export async function exportarExcel(
  nombre: string,
  titulo: string,
  filtros: Filtro[],
  columnas: { header: string; key: string; width?: number }[],
  filas: Record<string, unknown>[],
  /** Color de fondo ARGB (ej. "FF16A34A") por fila, indexado por la key de la columna. */
  coloresPorFila?: (Record<string, string> | undefined)[],
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Datos')
  ws.columns = columnas.map((c) => ({ key: c.key, width: c.width ?? 18 }))
  const numCols = columnas.length

  let fila = 1
  const logo = await cargarLogoBase64()
  if (logo) {
    const imageId = wb.addImage({ base64: logo.base64, extension: logo.extension })
    ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 130, height: 46 } })
    ws.getRow(1).height = 34
    ws.getRow(2).height = 10
    fila = 3
  }

  ws.getCell(fila, 1).value = titulo
  ws.getCell(fila, 1).font = { bold: true, size: 14, color: { argb: 'FF0D2D6B' } }
  ws.mergeCells(fila, 1, fila, Math.max(numCols, 2))
  fila++

  for (const f of filtros) {
    ws.getCell(fila, 1).value = `${f.label}: ${f.valor}`
    ws.getCell(fila, 1).font = { italic: true, size: 10, color: { argb: 'FF475569' } }
    ws.mergeCells(fila, 1, fila, Math.max(numCols, 2))
    fila++
  }
  fila++

  const filaHeader = fila
  columnas.forEach((c, i) => {
    ws.getCell(filaHeader, i + 1).value = c.header
  })
  ws.getRow(filaHeader).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2D6B' } }
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
  })
  fila++

  filas.forEach((f, i) => {
    columnas.forEach((c, colIdx) => {
      ws.getCell(fila, colIdx + 1).value = f[c.key] as ExcelJS.CellValue
    })
    const colores = coloresPorFila?.[i]
    if (colores) {
      for (const [key, argb] of Object.entries(colores)) {
        const colIdx = columnas.findIndex((c) => c.key === key) + 1
        if (colIdx > 0) {
          const cell = ws.getCell(fila, colIdx)
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
        }
      }
    }
    fila++
  })

  const buf = await wb.xlsx.writeBuffer()
  descargar(new Blob([buf]), `${nombre}.xlsx`)
}

export async function exportarPDF(
  nombre: string,
  titulo: string,
  filtros: Filtro[],
  headers: string[],
  filas: (string | number)[][],
  /** Color hex (ej. "#16a34a") por celda, indexado por posición de columna dentro de `filas`. */
  coloresPorFila?: (Record<number, string> | undefined)[],
) {
  const pdfMakeModule = await import('pdfmake/build/pdfmake')
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule
  const pdfFonts = (pdfFontsModule as any).default ?? pdfFontsModule
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs

  const logo = await cargarLogoBase64()

  const cuerpo = [
    headers.map((h) => ({ text: h, color: 'white', bold: true, fillColor: '#0D2D6B' })),
    ...filas.map((fila, i) => {
      const colores = coloresPorFila?.[i]
      return fila.map((valor, colIdx) => {
        const color = colores?.[colIdx]
        if (color) return { text: String(valor), color: 'white', bold: true, fillColor: color }
        return { text: String(valor), fillColor: i % 2 ? '#F1F5F9' : undefined }
      })
    }),
  ]

  const content: any[] = []
  if (logo) content.push({ image: logo.base64, width: 90, margin: [0, 0, 0, 6] })
  content.push({ text: titulo, style: 'h' })
  if (filtros.length > 0) {
    content.push({ text: filtros.map((f) => `${f.label}: ${f.valor}`).join('   ·   '), style: 'filtros' })
  }
  content.push({
    table: { headerRows: 1, body: cuerpo },
    layout: { hLineColor: '#c3cbe0', vLineColor: '#c3cbe0' },
    margin: [0, 8, 0, 0],
  })

  pdfMake
    .createPdf({
      pageOrientation: 'landscape',
      content,
      styles: {
        h: { fontSize: 14, bold: true, color: '#0D2D6B', margin: [0, 0, 0, 4] },
        filtros: { fontSize: 9, italics: true, color: '#475569' },
      },
      defaultStyle: { fontSize: 8 },
    })
    .download(`${nombre}.pdf`)
}

/** Plantilla Excel simple (encabezado azul + filas de ejemplo) para carga masiva. */
export async function descargarPlantillaExcel(
  nombre: string,
  columnas: { header: string; key: string; width?: number }[],
  filasEjemplo: Record<string, unknown>[] = [],
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Plantilla')
  ws.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D2D6B' } }
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
  })
  filasEjemplo.forEach((f) => ws.addRow(f))
  const buf = await wb.xlsx.writeBuffer()
  descargar(new Blob([buf]), `${nombre}.xlsx`)
}

/** Lee la primera hoja de un .xlsx subido por el usuario y devuelve las filas
 * (fila 1 = encabezados) como objetos `{ encabezado: valor }`, texto sin
 * espacios sobrantes. Omite filas totalmente vacías. */
export async function leerExcel(file: File): Promise<Record<string, string>[]> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())
  const ws = wb.worksheets[0]
  if (!ws) return []
  const headers: string[] = []
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim()
  })
  const filas: Record<string, string>[] = []
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const obj: Record<string, string> = {}
    let vacia = true
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1]
      if (!header) return
      const valor = cell.value == null ? '' : String(cell.value).trim()
      if (valor) vacia = false
      obj[header] = valor
    })
    if (!vacia) filas.push(obj)
  })
  return filas
}

function descargar(blob: Blob, archivo: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo
  a.click()
  URL.revokeObjectURL(url)
}
