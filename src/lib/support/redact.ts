/**
 * Masks sensitive numbers before a message is stored (spec §8): SSN, card numbers (Luhn), bank account / routing numbers
 * next to account words. Returns the masked text and how many values were masked.
 */

const MASK = '•••'

function luhn(digits: string) {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

const ACCOUNT_WORDS = /(account|acct|routing|aba|계좌|은행|라우팅)/i

export function redactSensitive(input: string): { text: string; redactions: number } {
  let redactions = 0
  let text = input

  // SSN: 123-45-6789 / 123 45 6789 (not part of a longer number)
  text = text.replace(/(?<!\d)(\d{3})[- ](\d{2})[- ](\d{4})(?!\d)/g, () => {
    redactions += 1
    return MASK
  })

  // Card numbers: 13–19 digits, spaces/dashes allowed, Luhn valid
  text = text.replace(/(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g, (match) => {
    const digits = match.replace(/\D/g, '')
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) {
      redactions += 1
      return MASK
    }
    return match
  })

  // Bank account / routing numbers: 9–17 digits when the message talks about accounts
  if (ACCOUNT_WORDS.test(text)) {
    text = text.replace(/(?<!\d)\d{9,17}(?!\d)/g, () => {
      redactions += 1
      return MASK
    })
  }

  // Bare 9-digit SSN when the message mentions SSN
  if (/(ssn|social security|사회보장)/i.test(text)) {
    text = text.replace(/(?<!\d)\d{9}(?!\d)/g, () => {
      redactions += 1
      return MASK
    })
  }

  return { text, redactions }
}
