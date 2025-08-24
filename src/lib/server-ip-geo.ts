import ipaddr from 'ipaddr.js'

const IP_HEADER = (process.env.IP_HEADER || 'cf-connecting-ip').toLowerCase()
const IP_FALLBACK_HEADERS = (process.env.IP_FALLBACK_HEADERS || 'x-forwarded-for,x-real-ip,x-client-ip,fastly-client-ip')
  .split(',')
  .map(h => h.trim().toLowerCase())
  .filter(Boolean)
const COUNTRY_HEADER = (process.env.COUNTRY_HEADER || 'cf-ipcountry').toLowerCase()
const CITY_HEADER = (process.env.CITY_HEADER || '').toLowerCase()
const COUNTRY_NAME_HEADER = (process.env.COUNTRY_NAME_HEADER || 'country_name').toLowerCase()
const COUNTRY_ID_HEADER = (process.env.COUNTRY_ID_HEADER || 'country_id').toLowerCase()
const PROVINCE_NAME_HEADER = (process.env.PROVINCE_NAME_HEADER || 'province_name').toLowerCase()
const PROVINCE_ID_HEADER = (process.env.PROVINCE_ID_HEADER || 'province_id').toLowerCase()
const CITY_NAME_HEADER = (process.env.CITY_NAME_HEADER || 'city_name').toLowerCase()
const CITY_ID_HEADER = (process.env.CITY_ID_HEADER || 'city_id').toLowerCase()
const REFERER_HEADER = (process.env.REFERER_HEADER || 'referer').toLowerCase()

export function extractClientIpFromHeaders(headers: Headers): string {
  const candidates = [headers.get(IP_HEADER) || '']
    .concat(IP_FALLBACK_HEADERS.map(h => headers.get(h) || ''))
  const parts = candidates
    .flatMap(v => v.split(',').map(s => s.trim()))
    .filter(Boolean)

  for (const candidate of parts) {
    try {
      const addr = ipaddr.parse(candidate)
      if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
        const ipv4 = (addr as ipaddr.IPv6).toIPv4Address().toString()
        if (!isPrivateIp(ipv4)) return ipv4
      }
      const text = addr.toString()
      if (!isPrivateIp(text)) return text
    } catch {
      // ignore
    }
  }
  const uaIp = headers.get(IP_HEADER) || headers.get('x-real-ip') || headers.get('x-forwarded-for') || headers.get('remote-addr') || 'unknown'
  return uaIp.split(',')[0].trim()
}

function isPrivateIp(ip: string): boolean {
  try {
    const addr = ipaddr.parse(ip)
    if (addr.kind() === 'ipv6') return addr.range() !== 'unicast'
    const range = (addr as ipaddr.IPv4).range()
    return ['private', 'loopback', 'linkLocal', 'uniqueLocal'].includes(range)
  } catch {
    return false
  }
}

export function geoLookup(ip: string): { country?: string; city?: string } {
  // 保留函数签名，默认不做本地库解析，改为仅使用 CF 头部（在 geoFromHeaders 中）
  return {}
}

export function geoFromHeaders(headers: Headers): {
  country?: string
  city?: string
  countryName?: string
  countryId?: string
  provinceName?: string
  provinceId?: string
  cityName?: string
  cityId?: string
} {
  const country = (COUNTRY_HEADER && headers.get(COUNTRY_HEADER)) || undefined
  const city = (CITY_HEADER && headers.get(CITY_HEADER)) || undefined
  const countryName = (COUNTRY_NAME_HEADER && headers.get(COUNTRY_NAME_HEADER)) || undefined
  const countryId = (COUNTRY_ID_HEADER && headers.get(COUNTRY_ID_HEADER)) || undefined
  const provinceName = (PROVINCE_NAME_HEADER && headers.get(PROVINCE_NAME_HEADER)) || undefined
  const provinceId = (PROVINCE_ID_HEADER && headers.get(PROVINCE_ID_HEADER)) || undefined
  const cityName = (CITY_NAME_HEADER && headers.get(CITY_NAME_HEADER)) || undefined
  const cityId = (CITY_ID_HEADER && headers.get(CITY_ID_HEADER)) || undefined
  return { country, city, countryName, countryId, provinceName, provinceId, cityName, cityId }
}

export function refererFromHeaders(headers: Headers): string {
  const v = headers.get(REFERER_HEADER) || ''
  return v
}


