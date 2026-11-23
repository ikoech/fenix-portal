export function formatACFDate(dateStr) {
  if (!dateStr) return 'Ej angivet'
  const date = String(dateStr)
  const ymd = date.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/)
  const dmy = date.match(/^(\d{2})[-/]?(\d{2})[-/]?(\d{4})$/)
  const isValidDate = (year, month, day) => {
    const parsedDate = new Date(Date.UTC(year, month - 1, day))
    return (
      parsedDate.getUTCFullYear() === year &&
      parsedDate.getUTCMonth() === month - 1 &&
      parsedDate.getUTCDate() === day
    )
  }
  const yearFirst =
    ymd && isValidDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]))
  const dayFirst =
    dmy && isValidDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]))
  if (!yearFirst && !dayFirst) return 'Ej angivet'

  const [, y, m, d] = yearFirst
    ? ymd
    : [null, dmy[3], dmy[2], dmy[1]]

  const year = Number(y)
  const month = Number(m)
  const day = Number(d)

  const months = ['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec']
  return `${day} ${months[month - 1]} ${year}`
}