export function getUrlWithTrailingSlash(url: string): string {
  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  return url
}

export function getPath(url: string): string {
  // If it's already just a path (starts with /), return it without trailing slash
  if (url.startsWith('/')) {
    return url.endsWith('/') ? url.slice(0, -1) : url
  }

  // Otherwise, parse as full URL
  const parsed = URL.parse(url)
  if (parsed == null) {
    console.error('invalid URL:', url)
    return ''
  }

  return parsed.pathname.endsWith('/') ? parsed.pathname.slice(0, -1) : parsed.pathname
}
