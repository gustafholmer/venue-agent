/**
 * Validates Swedish organization numbers (organisationsnummer)
 * Format: XXXXXX-XXXX (10 digits with hyphen after 6th digit)
 * Uses Luhn algorithm for checksum validation
 */
export function validateOrgNumber(orgNumber: string): boolean {
  const formatRegex = /^[0-9]{6}-[0-9]{4}$/
  if (!formatRegex.test(orgNumber)) {
    return false
  }

  const digits = orgNumber.replace('-', '')
  return luhnCheck(digits)
}

function luhnCheck(digits: string): boolean {
  let sum = 0
  let alternate = false

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)

    if (alternate) {
      n *= 2
      if (n > 9) {
        n -= 9
      }
    }

    sum += n
    alternate = !alternate
  }

  return sum % 10 === 0
}

/**
 * Formats a string into org number format
 * Adds hyphen if missing, strips non-digits
 */
export function formatOrgNumber(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 10) {
    return `${digits.slice(0, 6)}-${digits.slice(6)}`
  }
  return input
}
