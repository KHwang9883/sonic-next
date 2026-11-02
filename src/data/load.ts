import fs from 'fs'
import path from 'path'
import { load as yamlLoad } from 'js-yaml'
import { marked } from 'marked'
import type { NavItem, NavData, WingetPreset } from './types'

const dataDir = path.join(process.cwd(), 'data')
const IMG_BASE_URL = '/images/'

function processImgUrl(img: string | undefined): string | undefined {
  if (!img) return img
  if (img.startsWith('/') || img.startsWith('http')) return img
  return IMG_BASE_URL + img
}

function processNavItemImg(item: NavItem): NavItem {
  return { ...item, img: processImgUrl(item.img)! }
}

// 允许 winget_presets 写成单个字符串或字符串数组
function normalizePresets(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    const id = value.trim()
    return id ? [id] : undefined
  }
  if (Array.isArray(value)) {
    const ids = value.map((v) => String(v).trim()).filter(Boolean)
    return ids.length ? ids : undefined
  }
  return undefined
}

function processNavItem(item: NavItem): NavItem {
  return {
    ...processNavItemImg(item),
    winget_presets: normalizePresets((item as any).winget_presets),
  }
}

function loadYaml(filename: string): any {
  const filePath = path.join(dataDir, filename)
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    return yamlLoad(content)
  }
  return []
}

function loadMarkdown(filename: string): string {
  const filePath = path.join(dataDir, filename)
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8')
    return marked(content) as string
  }
  return ''
}

function formatDate(date: Date): string {
  // 显式使用 Asia/Shanghai 时区（GMT+8），避免 CI 环境时区差异导致日期偏差
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' })
}

export function getNavData(): NavData {
  // Load menu configuration
  const webstackConfig = loadYaml('webstack.yml') as any

  // Load all category data files
  const categoryData: Record<string, NavItem[]> = {}
  const dataFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.yml') && f !== 'webstack.yml')

  for (const file of dataFiles) {
    const key = file.replace('.yml', '')
    const items = loadYaml(file) as NavItem[]
    // Process img field to add base URL
    categoryData[key] = items.map(processNavItem)
  }

  // Build structured menu with data
  const menu = webstackConfig.menu.map((item: any) => {
    if (item.submenu) {
      return {
        ...item,
        submenu: item.submenu.map((sub: any) => ({
          ...sub,
          items: categoryData[sub.config] || [],
        })),
      }
    }
    if (item.config) {
      return {
        ...item,
        items: categoryData[item.config] || [],
      }
    }
    return item
  })

  // 组装批量安装预设：显式声明的按声明顺序在前，条目上打过标签但未声明的自动追加
  const declaredPresets: WingetPreset[] = (webstackConfig.wingetPresets ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name ?? String(p.id),
    description: p.description,
  }))

  const discoveredPresetIds = new Set<string>()
  const collectPresets = (items?: NavItem[]) => {
    items?.forEach((item) => item.winget_presets?.forEach((id) => discoveredPresetIds.add(id)))
  }
  menu.forEach((item: any) => {
    if (item.submenu) {
      item.submenu.forEach((sub: any) => collectPresets(sub.items))
    } else {
      collectPresets(item.items)
    }
  })

  const declaredIds = new Set(declaredPresets.map((p) => p.id))
  const wingetPresets: WingetPreset[] = [
    ...declaredPresets,
    ...[...discoveredPresetIds]
      .filter((id) => !declaredIds.has(id))
      .map((id) => ({ id, name: id })),
  ]

  // Build date for "最后更新"
  const buildDate = formatDate(new Date())

  // Process aboutPage - load markdown if specified
  const aboutPage = webstackConfig.aboutPage
  if (aboutPage?.website?.md) {
    aboutPage.website.html = loadMarkdown(aboutPage.website.md)
  }
  if (aboutPage?.webmaster?.md) {
    aboutPage.webmaster.html = loadMarkdown(aboutPage.webmaster.md)
  }
  // Process webmaster img URL
  if (aboutPage?.webmaster?.img) {
    aboutPage.webmaster.img = processImgUrl(aboutPage.webmaster.img)
  }

  return {
    title: webstackConfig.title ?? '',
    subtitle: webstackConfig.subtitle ?? '',
    favicon: webstackConfig.favicon ?? '/favicon.svg',
    banner: webstackConfig.banner,
    logo: webstackConfig.logo,
    menu,
    about: webstackConfig.about,
    aboutPage,
    since: webstackConfig.since,
    lastUpdate: buildDate,
    wingetPresets,
  }
}
