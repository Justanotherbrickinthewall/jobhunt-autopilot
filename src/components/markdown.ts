// Only http(s) and mailto links are followed. Anything else is shown as its text.
export const isSafeUrl = (href: string | null | undefined): href is string =>
  !!href && /^(?:https?:|mailto:)/iu.test(href.trim())
