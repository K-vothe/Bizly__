const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function cleanText(value, max = 200) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max)
}

function optionalText(value, max = 200) {
  const out = cleanText(value, max)
  return out || null
}

function validEmail(value) {
  const email = cleanText(value, 150).toLowerCase()
  return EMAIL_RE.test(email) ? email : null
}

function validPassword(value) {
  const password = String(value || '')
  if (password.length < 8 || password.length > 72) return false
  return /[A-Za-z]/.test(password) && /\d/.test(password)
}

function positiveMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null
}

function nonNegativeInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 ? n : null
}

function positiveInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

function validDate(value) {
  return DATE_RE.test(String(value || '')) ? value : null
}

function splitName(fullName) {
  const value = cleanText(fullName, 200)
  const parts = value.split(/\s+/).filter(Boolean)
  return {
    nombre: parts.shift() || '',
    apellido: parts.join(' '),
  }
}

module.exports = {
  cleanText,
  optionalText,
  validEmail,
  validPassword,
  positiveMoney,
  nonNegativeInt,
  positiveInt,
  validDate,
  splitName,
}
