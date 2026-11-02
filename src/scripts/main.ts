// ===== 深色模式切换 =====
function initDarkMode() {
  const toggle = document.getElementById('dark-mode-toggle')
  const moonIcon = document.querySelector('.dark-mode-icon-moon') as HTMLElement | null
  const sunIcon = document.querySelector('.dark-mode-icon-sun') as HTMLElement | null

  function syncIcon() {
    const isDark = document.documentElement.classList.contains('dark')
    if (moonIcon && sunIcon) {
      moonIcon.style.display = isDark ? 'none' : ''
      sunIcon.style.display = isDark ? '' : 'none'
    }
  }

  // 初次同步图标
  syncIcon()

  toggle?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      document.documentElement.classList.remove('dark')
      try { localStorage.setItem('color-mode', 'light') } catch (e) {}
    } else {
      document.documentElement.classList.add('dark')
      try { localStorage.setItem('color-mode', 'dark') } catch (e) {}
    }
    syncIcon()
  })
}

// ===== 移动端侧边栏 =====
function initSidebar() {
  const toggle = document.getElementById('top-nav-toggle')
  const sidebar = document.getElementById('sidebar-menu')
  const overlay = document.getElementById('sidebar-overlay')

  function open() {
    sidebar?.classList.add('mobile-open')
    if (overlay) overlay.style.display = ''
    sidebar?.setAttribute('data-mobile-open', 'true')
    overlay?.setAttribute('data-mobile-open', 'true')
  }

  function close() {
    sidebar?.classList.remove('mobile-open')
    if (overlay) overlay.style.display = 'none'
    sidebar?.setAttribute('data-mobile-open', 'false')
    overlay?.setAttribute('data-mobile-open', 'false')
  }

  // 默认隐藏遮罩（移动端 CSS 控制可见性，桌面端隐藏）
  if (overlay) overlay.style.display = 'none'

  toggle?.addEventListener('click', open)
  overlay?.addEventListener('click', close)

  // 子菜单展开/折叠
  const submenuToggles = document.querySelectorAll('[data-submenu-toggle]')
  submenuToggles.forEach((t) => {
    t.addEventListener('click', (e) => {
      e.preventDefault()
      const name = (t as HTMLElement).getAttribute('data-submenu-toggle')
      if (!name) return
      const submenu = document.querySelector(`[data-submenu="${CSS.escape(name)}"]`) as HTMLElement | null
      const arrow = document.querySelector(`[data-arrow="${CSS.escape(name)}"]`) as HTMLElement | null
      if (submenu) {
        const isOpen = submenu.classList.contains('submenu-open')
        submenu.classList.toggle('submenu-open')
        if (arrow) {
          arrow.style.transform = isOpen ? '' : 'rotate(180deg)'
        }
      }
    })
  })

  // 锚点滚动 + 移动端关闭侧边栏
  const anchorLinks = document.querySelectorAll('[data-anchor]')
  anchorLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const anchor = (link as HTMLElement).getAttribute('data-anchor')
      if (!anchor) return
      const el = document.getElementById(anchor)
      if (el) {
        // 当前页面存在锚点，平滑滚动
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else {
        // 当前页面不存在锚点（如 about 页），跳转到首页对应位置
        window.location.href = `/#${anchor}`
      }
      close()
    })
  })
}

// ===== 回到顶部 =====
function initBackToTop() {
  const btn = document.getElementById('back-to-top')
  if (!btn) return

  function onScroll() {
    if (btn) btn.style.display = window.scrollY > 300 ? '' : 'none'
  }

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

// ===== 链接卡片 URL 提示框 + Winget 安装 =====
function initLinkCard() {
  // 创建 tooltip 元素（追加到 body，等价于 Vue 的 Teleport）
  const tooltip = document.createElement('div')
  tooltip.className = 'nav-card-tooltip'
  tooltip.style.display = 'none'
  document.body.appendChild(tooltip)

  // 创建 toast 容器（等价于 Vue 的 Teleport）
  const toastOverlay = document.createElement('div')
  toastOverlay.className = 'nav-card-toast-overlay'
  toastOverlay.style.display = 'none'
  toastOverlay.innerHTML = `
    <div class="nav-card-toast">
      <button class="nav-card-toast-close" type="button">
        <i class="fas fa-times"></i>
      </button>
      <div class="nav-card-toast-header">
        <i class="fas fa-check-circle"></i>
        <span>安装命令已复制到剪贴板</span>
      </div>
      <div class="nav-card-toast-command"></div>
      <div class="nav-card-toast-warning" style="display: none">
        <i class="fas fa-bullhorn"></i>
        <span>该软件可能包含用户不想要的功能，包括但不限于弹窗广告、推广其他软件、静默修改默认程序等。请在安装或使用时多加留意，并作一些妥当的配置调优。</span>
      </div>
      <p class="nav-card-toast-hint">请在 Windows 终端中粘贴执行</p>
    </div>
  `
  document.body.appendChild(toastOverlay)

  const toastCommand = toastOverlay.querySelector('.nav-card-toast-command') as HTMLElement
  const toastClose = toastOverlay.querySelector('.nav-card-toast-close') as HTMLElement
  const toastCard = toastOverlay.querySelector('.nav-card-toast') as HTMLElement
  const toastWarning = toastOverlay.querySelector('.nav-card-toast-warning') as HTMLElement

  function showToast(command: string, isPup: boolean) {
    if (toastCommand) toastCommand.textContent = command
    if (toastWarning) toastWarning.style.display = isPup ? '' : 'none'
    toastOverlay.style.display = ''
  }

  function hideToast() {
    toastOverlay.style.display = 'none'
  }

  toastClose?.addEventListener('click', hideToast)
  toastOverlay.addEventListener('click', (e) => {
    // 仅点击遮罩（非卡片）时关闭
    if (e.target === toastOverlay) hideToast()
  })
  toastCard?.addEventListener('click', (e) => e.stopPropagation())

  // 卡片悬停显示 URL
  const cards = document.querySelectorAll('[data-nav-card]')
  cards.forEach((card) => {
    const url = (card as HTMLElement).getAttribute('data-card-url') || ''

    card.addEventListener('mouseenter', () => {
      const rect = card.getBoundingClientRect()
      tooltip.style.top = `${rect.bottom + 8}px`
      tooltip.style.left = `${rect.left + rect.width / 2}px`
      tooltip.textContent = url
      tooltip.style.display = ''
    })

    card.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none'
    })
  })

  // Winget 安装按钮
  const wingetButtons = document.querySelectorAll('[data-winget]')
  wingetButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const wingetId = (btn as HTMLElement).getAttribute('data-winget')
      if (!wingetId) return
      const command = `winget install --id "${wingetId}"`
      const isPup = (btn as HTMLElement).classList.contains('pup')
      const writePromise = navigator.clipboard
        ? navigator.clipboard.writeText(command)
        : Promise.reject(new Error('no clipboard'))
      writePromise.then(() => showToast(command, isPup)).catch(() => showToast(command, isPup))
    })
  })
}

// ===== 批量安装 =====
function initBatchInstall() {
  const toggle = document.getElementById('batch-install-toggle')
  const bar = document.getElementById('batch-bar')
  const overlay = document.getElementById('batch-overlay')
  if (!toggle || !bar || !overlay) return

  const countEl = document.getElementById('batch-count')
  const modalCountEl = document.getElementById('batch-modal-count')
  const generateBtn = document.getElementById('batch-generate') as HTMLButtonElement | null
  const exitBtn = document.getElementById('batch-exit')
  const closeBtn = document.getElementById('batch-modal-close')
  const copyBtn = document.getElementById('batch-copy') as HTMLButtonElement | null
  const saveBtn = document.getElementById('batch-save') as HTMLButtonElement | null
  const commandArea = document.getElementById('batch-command') as HTMLTextAreaElement | null

  const checkboxes = Array.from(document.querySelectorAll<HTMLInputElement>('[data-batch-checkbox]'))
  const presetButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-preset]'))
  let commands: string[] = []

  function clearActivePreset() {
    presetButtons.forEach((btn) => btn.classList.remove('active'))
  }

  // 按预设应用勾选状态；传入 null 表示清空全部勾选
  function applyPreset(id: string | null) {
    checkboxes.forEach((cb) => {
      const ids = (cb.dataset.presets || '').split(' ')
      cb.checked = !!id && ids.includes(id)
    })
    presetButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.preset === id))
    syncState()
  }

  function selectedBoxes() {
    return checkboxes.filter((cb) => cb.checked)
  }

  function syncState() {
    const count = selectedBoxes().length
    if (countEl) countEl.textContent = String(count)
    if (generateBtn) generateBtn.disabled = count === 0
    checkboxes.forEach((cb) => {
      cb.closest('.nav-card-wrap')?.classList.toggle('selected', cb.checked)
    })
  }

  function closeModal() {
    overlay.hidden = true
  }

  function enterBatchMode() {
    document.body.classList.add('batch-mode')
    toggle?.setAttribute('aria-pressed', 'true')
    toggle?.classList.add('active')
    bar.hidden = false
    // 每次进入批量模式时应用第一个预设（未配置预设则全部不勾选）
    applyPreset(presetButtons[0]?.dataset.preset ?? null)
  }

  function exitBatchMode() {
    document.body.classList.remove('batch-mode')
    toggle?.setAttribute('aria-pressed', 'false')
    toggle?.classList.remove('active')
    bar.hidden = true
    closeModal()
  }

  toggle.addEventListener('click', () => {
    if (document.body.classList.contains('batch-mode')) exitBatchMode()
    else enterBatchMode()
  })

  exitBtn?.addEventListener('click', exitBatchMode)
  closeBtn?.addEventListener('click', closeModal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) closeModal()
  })

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyPreset(btn.dataset.preset ?? null)
    })
  })

  checkboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      // 手动调整后取消预设高亮，表示当前为自定义勾选
      clearActivePreset()
      syncState()
    })
  })

  // 批量模式下点击卡片本身切换勾选状态，而非跳转链接
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-card]').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (!document.body.classList.contains('batch-mode')) return
      const wrap = card.closest<HTMLElement>('.nav-card-wrap')
      if (!wrap || !wrap.classList.contains('nav-card-selectable')) return
      const cb = wrap.querySelector<HTMLInputElement>('[data-batch-checkbox]')
      if (!cb) return
      e.preventDefault()
      cb.checked = !cb.checked
      clearActivePreset()
      syncState()
    })
  })

  generateBtn?.addEventListener('click', () => {
    commands = selectedBoxes().map((cb) => `winget install --id "${cb.dataset.wingetId}"`)
    if (!commands.length) return
    if (commandArea) commandArea.value = commands.join('\r\n')
    if (modalCountEl) modalCountEl.textContent = String(commands.length)
    overlay.hidden = false
    commandArea?.focus()
  })

  copyBtn?.addEventListener('click', () => {
    const text = commands.join('\r\n')
    if (!text) return
    const original = copyBtn.innerHTML
    const done = (ok: boolean) => {
      copyBtn.innerHTML = ok
        ? '<i class="fas fa-check"></i> 已复制'
        : '<i class="fas fa-triangle-exclamation"></i> 请手动复制'
      setTimeout(() => {
        copyBtn.innerHTML = original
      }, 2000)
    }
    const fallback = () => {
      commandArea?.select()
      done(false)
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => done(true)).catch(fallback)
    } else {
      fallback()
    }
  })

  saveBtn?.addEventListener('click', () => {
    if (!commands.length) return
    const content = ['@echo off', ...commands, '', 'pause', ''].join('\r\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const today = new Date()
    const stamp = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('')
    const link = document.createElement('a')
    link.href = url
    link.download = `winget-install-${stamp}.bat`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  })
}

// ===== 关于页站长卡片点击 =====
function initAboutPage() {
  const webmasterCard = document.querySelector('[data-webmaster-url]') as HTMLElement | null
  webmasterCard?.addEventListener('click', () => {
    const url = webmasterCard.getAttribute('data-webmaster-url')
    if (url) window.open(url, '_blank')
  })
}

// ===== 初始化 =====
function init() {
  initDarkMode()
  initSidebar()
  initBackToTop()
  initLinkCard()
  initBatchInstall()
  initAboutPage()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
