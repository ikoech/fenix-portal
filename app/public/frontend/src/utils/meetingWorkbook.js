import ExcelJS from 'exceljs'

const headerStyle = {
  font: { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5A623' } },
  alignment: { vertical: 'middle', wrapText: true },
}

export async function buildMeetingWorkbook({ title, eventDate, members, attendees }) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Affärsnätverket Fenix'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.subject = 'Möteslista över portalens medlemmar'

  const sheet = workbook.addWorksheet('Medlemmar', {
    views: [{ state: 'frozen', ySplit: 4 }],
    properties: { defaultRowHeight: 18 },
  })
  sheet.columns = [
    { width: 7 },
    { width: 24 },
    { width: 28 },
    { width: 46 },
    { width: 16 },
    { width: 26 },
    { width: 42 },
  ]

  sheet.mergeCells('A1:G1')
  sheet.getCell('A1').value = 'Affärsnätverket Fenix – Möteslista'
  sheet.getCell('A1').font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F8B8D' } }
  sheet.getCell('A1').alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 28

  sheet.addRow(['Möte', title])
  sheet.addRow(['Datum', eventDate])
  const headerRow = sheet.addRow([
    'Nr',
    'Namn',
    'Företag',
    'Är bra på!',
    'Deltagande',
    'Ersättare',
    'Specifika sök',
  ])
  headerRow.height = 24
  headerRow.eachCell(cell => Object.assign(cell, headerStyle))

  const attendingMemberIds = new Set(
    attendees.filter(person => person.type === 'member').map(person => Number(person.id))
  )
  members.forEach((member, index) => {
    sheet.addRow([
      index + 1,
      String(member.name ?? ''),
      String(member.company ?? ''),
      String(member.expertise ?? ''),
      attendingMemberIds.has(Number(member.user_id)) ? 'Ja' : 'Nej',
      String(member.deputy ?? ''),
      String(member.specific_search ?? ''),
    ])
  })

  sheet.autoFilter = {
    from: `A${headerRow.number}`,
    to: `G${Math.max(headerRow.number, sheet.rowCount)}`,
  }
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow.number) return
    row.eachCell(cell => {
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD5E2E3' } },
        left: { style: 'thin', color: { argb: 'FFD5E2E3' } },
        bottom: { style: 'thin', color: { argb: 'FFD5E2E3' } },
        right: { style: 'thin', color: { argb: 'FFD5E2E3' } },
      }
    })
  })

  return workbook.xlsx.writeBuffer()
}

export async function downloadMeetingWorkbook(options) {
  const bytes = await buildMeetingWorkbook(options)
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const filename = options.title
    .toLocaleLowerCase('sv-SE')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'moteslista'
  link.href = url
  link.download = `moteslista_${filename}_${options.eventDate.replace(/\s+/g, '-')}.xlsx`
  link.hidden = true
  document.body.appendChild(link)
  try {
    link.click()
  } finally {
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
