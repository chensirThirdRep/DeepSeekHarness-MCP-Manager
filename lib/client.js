// dsh-mcp-manager — durable client half (web bundle, ModuleLoader CJS format).
// Registers the "MCP 管理" settings page. Talks to the host half through the
// exact-path HTTP route /dsh-mcp-manager/api (same origin) instead of the
// dynamic-only host.call channel.
const factory = (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const CSS =
      '.mcpm-wrap{font-size:13px;line-height:1.6;display:flex;flex-direction:column;gap:14px;padding:4px 2px;color:inherit}' +
      '.mcpm-wrap h2{margin:0;font-size:16px}' +
      '.mcpm-sub{opacity:.75;font-size:12px}' +
      '.mcpm-msg{padding:8px 10px;border-radius:6px;font-size:12px}' +
      '.mcpm-msg.ok{background:rgba(46,160,67,.15);border:1px solid rgba(46,160,67,.4)}' +
      '.mcpm-msg.err{background:rgba(248,81,73,.15);border:1px solid rgba(248,81,73,.4)}' +
      '.mcpm-msg.info{background:rgba(88,166,255,.15);border:1px solid rgba(88,166,255,.5)}' +
      '.mcpm-path{font-family:monospace;font-size:11px;opacity:.7;word-break:break-all}' +
      '.mcpm-btn{font-size:12px;padding:3px 10px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));background:transparent;color:inherit;cursor:pointer;white-space:nowrap}' +
      '.mcpm-btn:disabled{opacity:.5;cursor:default}' +
      '.mcpm-btn.primary{border-color:rgba(88,166,255,.7)}' +
      '.mcpm-btn.danger{border-color:rgba(248,81,73,.7)}' +
      '.mcpm-backup{display:flex;flex-direction:column;gap:8px;border:1px dashed var(--dsw-alias-border-l2, rgba(128,128,128,.45));border-radius:8px;padding:10px 12px}' +
      '.mcpm-backup .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}' +
      '.mcpm-json{width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;min-height:70px;background:var(--mcpm-field-bg, transparent);color:inherit;color-scheme:var(--mcpm-scheme, normal);border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.4));border-radius:5px;padding:6px;white-space:pre;overflow:auto}' +
      '.mcpm-report{font-family:monospace;font-size:11px;opacity:.85;word-break:break-all}' +
      '.mcpm-warn{font-size:11px;color:rgba(248,81,73,.95)}' +
      '.mcpm-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35));border-radius:8px;padding:12px}' +
      '.mcpm-form h3{margin:0;grid-column:1/-1;font-size:13px}' +
      '.mcpm-form label{display:flex;flex-direction:column;gap:3px;font-size:12px}' +
      '.mcpm-form .full{grid-column:1/-1}' +
      '.mcpm-form input,.mcpm-form select,.mcpm-form textarea{font-size:12px;padding:4px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));background:var(--mcpm-field-bg, transparent);color:inherit;color-scheme:var(--mcpm-scheme, normal)}' +
      '.mcpm-form textarea{font-family:monospace;resize:vertical;min-height:44px}' +
      '.mcpm-row{border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35));border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}' +
      '.mcpm-row.editing{border-color:rgba(88,166,255,.75);box-shadow:inset 0 0 0 1px rgba(88,166,255,.25)}' +
      '.mcpm-row.editing .mcpm-form{border:0;padding:0;background:transparent}' +
      '.mcpm-row-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
      '.mcpm-name{font-weight:600}' +
      '.mcpm-chip{font-size:11px;padding:1px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));white-space:nowrap}' +
      '.mcpm-chip.on{background:rgba(46,160,67,.18);border-color:rgba(46,160,67,.55)}' +
      '.mcpm-chip.off{background:rgba(128,128,128,.15)}' +
      '.mcpm-chip.live{background:rgba(88,166,255,.15);border-color:rgba(88,166,255,.5)}' +
      '.mcpm-chip.bad{background:rgba(248,81,73,.18);border-color:rgba(248,81,73,.6)}' +
      '.mcpm-chip.warn{background:rgba(219,154,4,.18);border-color:rgba(219,154,4,.6)}' +
      '.mcpm-row-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}' +
      '.mcpm-detail{font-family:monospace;font-size:11px;opacity:.75;word-break:break-all}' +
      '.mcpm-mask{position:fixed;inset:0;background:var(--dsw-alias-bg-mask-drop);display:flex;align-items:center;justify-content:center;z-index:99999}' +
      '.mcpm-dialog{background:var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-base, #fff));border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));border-radius:10px;padding:16px 18px;min-width:300px;max-width:440px;box-shadow:0 10px 34px rgba(0,0,0,.35);color:inherit}' +
      '.mcpm-dialog-title{font-size:14px;font-weight:600;margin-bottom:8px}' +
      '.mcpm-dialog-body{font-size:12px;opacity:.88;line-height:1.7;margin-bottom:16px;word-break:break-all}' +
      '.mcpm-dialog-actions{display:flex;justify-content:flex-end;gap:8px}' +
      '.mcpm-version{margin-left:8px;font-size:11px;font-weight:500;opacity:.55;letter-spacing:.3px;vertical-align:middle}' +
      '.mcpm-token{display:flex;align-items:center;gap:8px;font-size:12px;opacity:.85}' +
      '.mcpm-token input{font-size:12px;padding:3px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));background:var(--mcpm-field-bg, transparent);color:inherit;color-scheme:var(--mcpm-scheme, normal);flex:1;max-width:260px}' +
      '.mcpm-dialog-tools{max-width:560px;max-height:70vh;display:flex;flex-direction:column}' +
      '.mcpm-dialog-tools .mcpm-dialog-body{flex:1;min-height:0;overflow:auto;margin-bottom:12px}' +
      '.mcpm-tools-list{display:flex;flex-direction:column;gap:8px;padding-right:4px}' +
      '.mcpm-tool{border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.3));border-radius:6px;padding:8px 10px}' +
      '.mcpm-tool-name{font-family:monospace;font-size:12px;font-weight:600;word-break:break-all}' +
      '.mcpm-tool-params{display:flex;flex-direction:column;gap:2px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--dsw-alias-border-l2, rgba(128,128,128,.3))}' +
      '.mcpm-tool-param{display:flex;gap:8px;font-size:11px;align-items:baseline}' +
      '.mcpm-tool-param-key{font-family:monospace;font-weight:600;min-width:80px;word-break:break-all}' +
      '.mcpm-tool-param-type{opacity:.6;min-width:60px}' +
      '.mcpm-tool-param-desc{opacity:.8;flex:1;word-break:break-all}' +
      // Native <select> popups are drawn by the browser/OS and ignore most CSS;
      // explicit option colors plus a matching color-scheme are what actually
      // keep them dark. The --mcpm-* variables are written by applyTheme().
      '.mcpm-form select option,.mcpm-scope select option{background:var(--mcpm-option-bg,#ffffff);color:var(--mcpm-option-fg,#1f1f1f)}' +
      '.mcpm-scope{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
      '.mcpm-scope select{font-size:12px;padding:3px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));background:var(--mcpm-field-bg, transparent);color:inherit;color-scheme:var(--mcpm-scheme, normal)}' +
      '.mcpm-note{font-size:11px;opacity:.72}'

    function ensureCss() {
      if (typeof document === 'undefined') return
      const id = 'dsh-mcp-manager'
      if (document.querySelector('style[data-plugin-css="' + id + '"]')) return
      const tag = document.createElement('style')
      tag.dataset.plugin = id
      tag.dataset.pluginCss = id
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    // ---- theme bridge ------------------------------------------------------
    // DSH projects the active theme onto the document (documentElement.style
    // .colorScheme plus body[data-ds-dark-theme]). Native <select> popups are
    // drawn by the browser, so the only levers are `color-scheme` on the
    // control and explicit option colors; both read the variables written here.
    // We never touch DSH's own inline style - the variables live in a plugin
    // owned <style> node, so DSH's ThemePresenter stays the single writer.
    let themeTag = null
    let themeScheme = ''
    function currentTheme() {
      let dark = false
      let seen = false
      try {
        const root = document.documentElement
        const scheme = String((root && root.style && root.style.colorScheme) || '').toLowerCase()
        if (scheme) { seen = true; if (scheme.indexOf('dark') >= 0) dark = true }
        const body = document.body
        if (body && body.hasAttribute && body.hasAttribute('data-ds-dark-theme')) { seen = true; dark = true }
        if (!seen && window.matchMedia) dark = !!window.matchMedia('(prefers-color-scheme: dark)').matches
      } catch (e) { /* keep light */ }
      return dark ? 'dark' : 'light'
    }
    function applyTheme(force) {
      if (typeof document === 'undefined' || !document.head) return
      const theme = currentTheme()
      if (!force && theme === themeScheme) return
      themeScheme = theme
      const vars = theme === 'dark'
        ? '--mcpm-scheme:dark;--mcpm-field-bg:rgba(18,18,22,.55);--mcpm-option-bg:#1f1f24;--mcpm-option-fg:#e8e8ea'
        : '--mcpm-scheme:light;--mcpm-field-bg:rgba(255,255,255,.6);--mcpm-option-bg:#ffffff;--mcpm-option-fg:#1f1f1f'
      const id = 'dsh-mcp-manager-theme'
      if (!themeTag || !themeTag.isConnected) {
        themeTag = document.querySelector('style[data-plugin-css="' + id + '"]')
        if (!themeTag) {
          themeTag = document.createElement('style')
          themeTag.dataset.plugin = 'dsh-mcp-manager'
          themeTag.dataset.pluginCss = id
          document.head.appendChild(themeTag)
        }
      }
      themeTag.textContent = ':root{' + vars + '}'
    }
    function ensureTheme() {
      if (typeof document === 'undefined') return
      applyTheme(true)
      if (typeof MutationObserver === 'undefined') return
      const watch = (el, filter) => {
        if (el) new MutationObserver(() => applyTheme()).observe(el, { attributes: true, attributeFilter: filter })
      }
      watch(document.documentElement, ['style', 'class', 'data-ds-theme-source'])
      if (document.body) watch(document.body, ['class', 'data-ds-dark-theme'])
      else document.addEventListener('DOMContentLoaded', () => watch(document.body, ['class', 'data-ds-dark-theme']), { once: true })
      try {
        if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme())
      } catch (e) { /* older engines only fire the initial read */ }
    }

    // Optional access token for write ops (host config.token or
    // DSH_MCP_MANAGER_TOKEN). Kept in localStorage so the user enters it once;
    // sent as `x-dsh-token` on every request (host ignores it when unset).
    let TOKEN = ''
    try { TOKEN = window.localStorage.getItem('dsh-mcp-manager-token') || '' } catch (e) { /* storage unavailable */ }
    function getToken() { return TOKEN }
    function setToken(v) {
      TOKEN = String(v || '').trim()
      try { if (TOKEN) window.localStorage.setItem('dsh-mcp-manager-token', TOKEN); else window.localStorage.removeItem('dsh-mcp-manager-token') } catch (e) { /* ignore */ }
    }

    function apiCall(op, args) {
      // `x-dsh-plugin` is the cross-site (CSRF) gate header the host half
      // requires on every request; a cross-origin page cannot attach it
      // without a CORS preflight that this route never answers.
      const headers = { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-mcp-manager' }
      if (TOKEN) headers['x-dsh-token'] = TOKEN
      return fetch('/dsh-mcp-manager/api', {
        method: 'POST',
        headers,
        body: JSON.stringify({ op, args: args || {} }),
      }).then((r) => r.json()).catch((e) => ({ ok: false, error: String((e && e.message) || e) }))
    }

    // Small version badge shown next to each settings-page title; reads the
    // package version from the host (plugin-version op) so it always matches
    // the installed release.
    function VersionBadge() {
      const [v, setV] = React.useState(null)
      React.useEffect(() => {
        let alive = true
        apiCall('plugin-version', {}).then((r) => { if (alive && r && r.ok) setV(r.version) }).catch(() => {})
        return () => { alive = false }
      }, [])
      return v ? React.createElement('span', { className: 'mcpm-version' }, 'v' + v) : null
    }

    // Optional access-token row: shown on both settings pages; only needed
    // when the host has token auth enabled (write ops would 401 otherwise).
    function TokenRow() {
      const [val, setVal] = React.useState(getToken())
      return React.createElement('label', { className: 'mcpm-token' },
        '访问令牌（可选，写操作鉴权）',
        React.createElement('input', { value: val, onChange: (e) => { setVal(e.target.value); setToken(e.target.value) }, placeholder: '留空 = 不鉴权' }))
    }

    module.exports = {
      name: 'dsh-mcp-manager-client',
      inject: ['timer'],
      apply(ctx) {
        ensureCss()
        ensureTheme()
        const slots = ctx.get('slots')
        if (slots === undefined) return

        // timeoutSeconds stays a string like every other form value; the host owns
        // the range check (1-3600 whole seconds). '60' is the client default and is
        // never written to the patch file.
        const emptyForm = () => ({ serverName: '', transport: 'streamable-http', url: '', command: '', args: '', headers: '', env: '', level: 'project', timeoutSeconds: '60' })
        const kvToLines = (obj) => (obj ? Object.keys(obj).map((k) => k + '=' + obj[k]).join('\n') : '')

        function MCPPage() {
          const [state, setState] = React.useState({ loading: true, error: null, rows: [], paths: null, errors: [], profiles: [], activeProfile: '', scope: 'active' })
          const [scope, setScope] = React.useState('active')
          const [formOpen, setFormOpen] = React.useState(false)
          const [editing, setEditing] = React.useState(null)
          const [busy, setBusy] = React.useState(null)
          const [msg, setMsg] = React.useState(null)
          const [form, setForm] = React.useState(emptyForm())
          const [restartInfo, setRestartInfo] = React.useState(null)
          const [tick, setTick] = React.useState(0)
          const [backup, setBackup] = React.useState(null)
          const [importText, setImportText] = React.useState('')
          const [confirmRow, setConfirmRow] = React.useState(null)
          const [toolPreview, setToolPreview] = React.useState(null)
          const [toolPreviewErr, setToolPreviewErr] = React.useState(null)
          const [toolPreviewBusy, setToolPreviewBusy] = React.useState(false)

          // Profile list + active profile come from the host on every refresh;
          // the "view scope" selector only decides which patch files the list
          // covers (writes always target whatever `form.level` says).
          const profiles = state.profiles || []
          const activeProfile = state.activeProfile || (state.paths && state.paths.profile) || ''
          const scopeRef = React.useRef(scope)
          scopeRef.current = scope

          const refresh = (nextScope) => {
            const sc = nextScope === undefined ? scopeRef.current : nextScope
            apiCall('mcpm-list', { scope: sc }).then((res) => {
              setState({
                loading: false,
                error: res && res.ok ? null : ((res && res.error) || '加载失败'),
                rows: (res && res.rows) || [],
                paths: (res && res.paths) || null,
                errors: (res && res.errors) || [],
                profiles: (res && res.profiles) || [],
                activeProfile: (res && res.paths && res.paths.profile) || '',
                scope: (res && res.scope) || sc,
              })
            }).catch((e) => setState({ loading: false, error: String((e && e.message) || e), rows: [], paths: null, errors: [], profiles: [], activeProfile: '', scope: sc }))
          }

          React.useEffect(() => { refresh() }, [scope])
          React.useEffect(() => ctx.interval(() => setTick((t) => t + 1), 1000), [])
          React.useEffect(() => ctx.interval(() => refresh(), 3000), [])
          React.useEffect(() => {
            if (!msg) return
            const d = ctx.timeout(() => setMsg(null), msg.kind === 'info' ? 9000 : 3000)
            return d
          }, [msg])

          const run = (method, args, label, onOk) => {
            setMsg(null)
            setBusy(label)
            apiCall(method, args).then((res) => {
              if (res && res.ok) {
                // Writes into a profile this instance does not load succeed on
                // disk but only take effect after that profile restarts, so the
                // host returns warning text that must stay visible for a while.
                const warn = res.warning ? '  ·  ' + res.warning : ''
                setMsg({ kind: warn ? 'info' : 'ok', text: '操作成功' + warn })
                refresh()
                if (onOk) onOk()
              } else setMsg({ kind: 'err', text: (res && res.error) || '操作失败' })
            }).catch((e) => setMsg({ kind: 'err', text: String((e && e.message) || e) })).then(() => { setBusy(null); setRestartInfo(null) })
          }

          const doExport = () => {
            setMsg(null)
            apiCall('mcpm-export', {}).then((res) => {
              if (res && res.ok) { setBackup({ mode: 'export', json: res.json, savedTo: res.savedTo }); setMsg({ kind: 'ok', text: '已导出' }) }
              else setMsg({ kind: 'err', text: (res && res.error) || '导出失败' })
            }).catch((e) => setMsg({ kind: 'err', text: String((e && e.message) || e) }))
          }
          const doImport = () => {
            setMsg(null)
            apiCall('mcpm-import', { json: importText }).then((res) => {
              if (res && res.ok) {
                setBackup({ mode: 'import', added: res.added || [], skipped: res.skipped || [] })
                setImportText('')
                setMsg({
                  kind: res.warning ? 'info' : 'ok',
                  text: '导入完成：新增 ' + (res.added || []).length + '，跳过 ' + (res.skipped || []).length + (res.warning ? '  ·  ' + res.warning : ''),
                })
                refresh()
              } else setMsg({ kind: 'err', text: (res && res.error) || '导入失败' })
            }).catch((e) => setMsg({ kind: 'err', text: String((e && e.message) || e) }))
          }

          const setF = (k) => (ev) => setForm(Object.assign({}, form, { [k]: ev.target.value }))

          const defaultLevel = () => (activeProfile ? 'profile:' + activeProfile : 'project')
          const openAdd = () => { setEditing(null); setForm(Object.assign(emptyForm(), { level: defaultLevel() })); setFormOpen(true) }
          const openEdit = (row) => {
            setEditing({ id: row.id, level: row.level })
            setForm({
              serverName: row.serverName || '',
              transport: row.transport === 'stdio' ? 'stdio' : 'streamable-http',
              url: row.url || '',
              command: row.command || '',
              args: (row.args || []).join('\n'),
              headers: kvToLines(row.headers),
              env: kvToLines(row.env),
              level: row.level || defaultLevel(),
              // null/undefined means nothing is persisted, i.e. the default applies.
              timeoutSeconds: row.timeoutSeconds === null || row.timeoutSeconds === undefined ? '60' : String(row.timeoutSeconds),
            })
            setFormOpen(true)
          }
          const cancelForm = () => { setFormOpen(false); setEditing(null) }

          const submitForm = () => {
            const payload = Object.assign({}, form)
            if (payload.transport === 'stdio') { payload.url = ''; payload.headers = '' }
            else { payload.command = ''; payload.args = ''; payload.env = '' }
            // A cleared box means "follow the default" (60s), not "unlimited".
            if (payload.timeoutSeconds === undefined || String(payload.timeoutSeconds).trim() === '') payload.timeoutSeconds = '60'
            const onOk = () => { setFormOpen(false); setEditing(null) }
            // fromLevel tells the host where the entry currently lives; level is
            // where it should end up (a change moves the block between files).
            if (editing) run('mcpm-edit', Object.assign({ id: editing.id, fromLevel: editing.level }, payload), 'form', onOk)
            else run('mcpm-add', payload, 'form', onOk)
          }

          const rowsLocked = formOpen || busy !== null
          // Inline editor: the edit form is mounted inside the row it edits, so hold a
          // ref on that row and scroll it into view whenever the edit target changes.
          const editRowRef = React.useRef(null)
          React.useEffect(() => {
            if (!editing) return
            const node = editRowRef.current
            if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }, [editing && editing.id])
          const renderForm = () => React.createElement('div', { className: 'mcpm-form' },
              React.createElement('h3', null, editing ? '编辑 MCP 服务：' + editing.id : '新增 MCP 服务'),
              React.createElement('label', null, '服务名称 serverName（唯一，1-32 位）', React.createElement('input', { value: form.serverName, onChange: setF('serverName'), placeholder: 'e.g. github' })),
              React.createElement('label', null, '传输方式', React.createElement('select', { value: form.transport, onChange: setF('transport') },
                React.createElement('option', { value: 'streamable-http' }, 'streamable-http'),
                React.createElement('option', { value: 'stdio' }, 'stdio'))),
              React.createElement('label', { className: 'full' }, '级别', React.createElement('select', { value: lvValue, onChange: setF('level') },
                lvOpts.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)))),
              form.transport === 'streamable-http'
                ? React.createElement('label', { className: 'full' }, '服务 URL', React.createElement('input', { value: form.url, onChange: setF('url'), placeholder: 'https://host/mcp' }))
                : React.createElement('label', { className: 'full' }, '启动命令', React.createElement('input', { value: form.command, onChange: setF('command'), placeholder: 'npx -y @modelcontextprotocol/server-github' })),
              form.transport === 'stdio' && React.createElement('label', { className: 'full' }, '参数（空格/换行分隔）', React.createElement('textarea', { value: form.args, onChange: setF('args'), placeholder: '-y\n@modelcontextprotocol/server-github' })),
              form.transport === 'stdio' && React.createElement('label', { className: 'full' }, '环境变量（每行 key=value）',
                React.createElement('div', { className: 'mcpm-sub', style: { marginBottom: '3px' } }, '路径按系统路径写法填（Windows 用 \\，macOS/Linux 用 /）'),
                React.createElement('textarea', { value: form.env, onChange: setF('env'), placeholder: 'GITHUB_TOKEN=xxx' })),
              form.transport === 'streamable-http' && React.createElement('label', { className: 'full' }, '请求头（每行 key=value）', React.createElement('textarea', { value: form.headers, onChange: setF('headers'), placeholder: 'Authorization=Bearer xxx' })),
              React.createElement('label', { className: 'full' }, '工具调用超时（秒，1-3600）',
                React.createElement('input', { type: 'number', min: '1', max: '3600', step: '1', value: form.timeoutSeconds, onChange: setF('timeoutSeconds'), placeholder: '60' }),
                React.createElement('div', { className: 'mcpm-sub', style: { marginTop: '3px' } },
                  '仅作用于工具调用（tools/call）；填 60 或留空 = 跟随默认，不写入配置。连接/初始化超时不受此设置影响。')),
              React.createElement('label', { className: 'full' }, ' ',
                React.createElement('div', { style: { display: 'flex', gap: '8px' } },
                  React.createElement('button', { className: 'mcpm-btn primary', disabled: busy === 'form', onClick: submitForm }, editing ? '保存' : '添加'),
                  React.createElement('button', { className: 'mcpm-btn', onClick: cancelForm }, '取消'))))
          const toggleRow = (row) => run('mcpm-set-enabled', { id: row.id, level: row.level, enabled: row.disabled }, row.id + ':toggle')
          const restartRow = (row) => {
            setTick(0)
            setRestartInfo({ id: row.id, name: row.serverName, startedAt: Date.now() })
            run('mcpm-restart', { id: row.id, level: row.level }, row.id + ':restart')
          }
          const removeRow = (row) => setConfirmRow(row)
          const confirmDelete = () => {
            const row = confirmRow
            setConfirmRow(null)
            if (row) run('mcpm-remove', { id: row.id, level: row.level }, row.id + ':remove')
          }
          const openToolPreview = (row) => {
            setToolPreviewErr(null)
            setToolPreviewBusy(true)
            setToolPreview({ serverName: row.serverName, tools: [] })
            apiCall('mcpm-tools', { serverName: row.serverName }).then((res) => {
              if (res && res.ok) { setToolPreview({ serverName: row.serverName, tools: (res.tools) || [] }) }
              else setToolPreviewErr((res && res.error) || '加载工具失败')
            }).catch((e) => setToolPreviewErr(String((e && e.message) || e))).then(() => setToolPreviewBusy(false))
          }

          const rows = state.rows || []

          // Level labels are dynamic: "project" means the profile this instance
          // is running, "profile:<name>" is any profile discovered under home.
          const levelLabelOf = (level) => {
            if (level === 'global') return '全局'
            if (level === 'loader') return '已加载(loader)'
            if (typeof level === 'string' && level.indexOf('profile:') === 0) {
              const name = level.slice(8)
              return (name && name === activeProfile ? '当前 profile：' : 'profile：') + name
            }
            if (level === 'project') return activeProfile ? '当前 profile：' + activeProfile : '当前 profile'
            return level ? String(level) : '?'
          }
          const levelOptions = () => {
            const out = [{
              value: defaultLevel(),
              label: activeProfile
                ? '当前 profile：' + activeProfile + '（' + ((state.paths && state.paths.project) || '') + '）'
                : '当前 profile',
            }]
            for (const pf of profiles) {
              if (pf.active || pf.name === activeProfile) continue
              out.push({ value: 'profile:' + pf.name, label: 'profile：' + pf.name + '（' + (pf.patch || '') + '）' })
            }
            out.push({ value: 'global', label: '全局（所有 profile：' + ((state.paths && state.paths.global) || '~/.dsh/cordis.patch.yml') + '）' })
            return out
          }
          const scopeOptions = () => {
            const out = [{ value: 'active', label: '当前 profile' + (activeProfile ? '（' + activeProfile + '）' : '') + ' + 全局' }]
            for (const pf of profiles) {
              if (pf.active || pf.name === activeProfile) continue
              out.push({ value: 'profile:' + pf.name, label: 'profile：' + pf.name + ' + 全局' })
            }
            out.push({ value: 'all', label: '全部 profile + 全局' })
            return out
          }
          const lvOpts = levelOptions()
          const lvValue = lvOpts.some((o) => o.value === form.level) ? form.level : lvOpts[0].value
          const scOpts = scopeOptions()

          const maskKv = (obj) => {
            if (!obj) return null
            return Object.keys(obj).map((k) => k + ': ' + String(obj[k]).replace(/^(.{4}).*$/, '$1****')).join('  ')
          }

          const liveChip = (row) => {
            if (!row.live) return null
            const phase = row.live.phase
            if (phase === 'failed') {
              return React.createElement('span', { className: 'mcpm-chip bad' }, 'loader: 失败')
            }
            if (!row.live.enabled) {
              return React.createElement('span', { className: 'mcpm-chip live' }, 'loader: off')
            }
            if (phase && phase !== 'active') {
              return React.createElement('span', { className: 'mcpm-chip live' }, 'loader: on · ' + phase)
            }
            const tc = typeof row.toolCount === 'number' ? row.toolCount : null
            const cls = tc === 0 ? 'mcpm-chip warn' : 'mcpm-chip live'
            return React.createElement('span', { className: cls }, 'loader: on · active' + (tc === null ? '' : ' · ' + tc + ' 工具'))
          }
          const liveHint = (row) => {
            if (!row.live) return null
            if (row.live.phase === 'failed') {
              return React.createElement('div', { className: 'mcpm-warn' }, '⚠ loader 启动失败：请检查 URL / 命令 / 凭证 / 网络，然后点“重启”重试')
            }
            if (row.live.phase === 'active' && typeof row.toolCount === 'number' && row.toolCount === 0) {
              return React.createElement('div', { className: 'mcpm-warn' }, '⚠ 已连接但未注册任何工具：服务端可能未就绪或工具列表为空')
            }
            return null
          }

          return React.createElement('div', { className: 'mcpm-wrap' },
            React.createElement('h2', null, 'MCP 服务管理', React.createElement(VersionBadge, null)),
            React.createElement(TokenRow, null),
            React.createElement('div', { className: 'mcpm-sub' },
              '管理 dsh-mcp-client 服务：可写入任意 profile 或 全局(home) 的 cordis.patch.yml。当前实例加载的层级经 HMR 实时生效；其他 profile 需重启其 DSH 实例后生效。'),
            restartInfo && React.createElement('div', { className: 'mcpm-msg info' },
              '重启中… ' + restartInfo.name + '（已等待 ' + Math.floor((Date.now() - restartInfo.startedAt) / 1000) + ' 秒，完成后自动刷新）'),
            msg && React.createElement('div', { className: 'mcpm-msg ' + msg.kind }, msg.text),
            state.error && React.createElement('div', { className: 'mcpm-msg err' }, state.error),
            state.errors && state.errors.length > 0 && React.createElement('div', { className: 'mcpm-msg err' }, '读取补丁告警: ' + state.errors.join('; ')),
            state.paths && React.createElement('div', { className: 'mcpm-path' },
              '当前 profile' + (activeProfile ? '(' + activeProfile + ')' : '') + ': ' + state.paths.project + '\n全局: ' + state.paths.global),
            React.createElement('div', { className: 'mcpm-backup' },
              React.createElement('div', { className: 'row' },
                React.createElement('span', { className: 'mcpm-sub' }, '备份 / 恢复'),
                React.createElement('button', { className: 'mcpm-btn', disabled: busy !== null, onClick: doExport }, '导出配置'),
                React.createElement('button', { className: 'mcpm-btn', disabled: busy !== null, onClick: () => { setBackup({ mode: 'import', added: [], skipped: [] }); setImportText('') } }, '导入配置'),
                backup && React.createElement('button', { className: 'mcpm-btn', onClick: () => { setBackup(null); setImportText('') } }, '收起')),
              backup && backup.mode === 'export' && React.createElement('div', null,
                React.createElement('div', { className: 'mcpm-report' }, '已同时保存到: ' + (backup.savedTo || '（未落盘）')),
                React.createElement('textarea', { className: 'mcpm-json', readOnly: true, value: backup.json })),
              backup && backup.mode === 'import' && React.createElement('div', null,
                React.createElement('textarea', { className: 'mcpm-json', placeholder: '粘贴导出的 JSON（数组或 { rows: [...] }）', value: importText, onChange: (ev) => setImportText(ev.target.value) }),
                React.createElement('div', { className: 'row' },
                  React.createElement('button', { className: 'mcpm-btn primary', disabled: busy !== null || !importText.trim(), onClick: doImport }, '执行导入'),
                  React.createElement('span', { className: 'mcpm-report' }, '新增: ' + (backup.added || []).join(', ') + '   跳过: ' + (backup.skipped || []).map((s) => s.id + '(' + s.reason + ')').join(', ')))),
              (!backup || backup.mode === 'export') && React.createElement('div', { className: 'mcpm-sub' }, '提示：导入会合并新增，已存在的条目自动跳过；先“导出配置”可获得模板。')),
            React.createElement('div', { className: 'mcpm-scope' },
              React.createElement('span', { className: 'mcpm-sub' }, '查看范围'),
              React.createElement('select', { value: scope, onChange: (ev) => setScope(ev.target.value) },
                scOpts.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label))),
              React.createElement('span', { className: 'mcpm-note' }, '每行都列出该 profile 的补丁条目与全局层条目')),
            React.createElement('div', null,
              React.createElement('button', { className: 'mcpm-btn primary', disabled: !!editing, onClick: () => (formOpen && !editing ? cancelForm() : openAdd()) },
                editing ? '正在编辑：' + editing.id + '（表单在下方该行内）' : (formOpen ? '收起表单' : '+ 新增 MCP 服务'))),
            formOpen && !editing && renderForm(),

            state.loading
              ? React.createElement('div', { className: 'mcpm-sub' }, '加载中…')
              : rows.length === 0
                ? React.createElement('div', { className: 'mcpm-sub' }, '暂无 MCP 服务。点击“+ 新增 MCP 服务”添加。')
                : rows.map((row) => React.createElement('div', {
                    key: row.id,
                    className: 'mcpm-row' + (editing && editing.id === row.id ? ' editing' : ''),
                    ref: editing && editing.id === row.id ? editRowRef : undefined,
                  },
                    React.createElement('div', { className: 'mcpm-row-head' },
                      React.createElement('span', { className: 'mcpm-name' }, row.serverName),
                      React.createElement('span', { className: 'mcpm-chip ' + (row.disabled ? 'off' : 'on') }, row.disabled ? '已禁用' : '已启用'),
                      React.createElement('span', { className: 'mcpm-chip' }, levelLabelOf(row.level)),
                      row.liveEligible === false && React.createElement('span', { className: 'mcpm-chip warn' }, '需重启该 profile 生效'),
                      liveChip(row),
                      !row.managed && row.level !== 'loader' && React.createElement('span', { className: 'mcpm-chip off' }, '手动添加')),
                    liveHint(row),
                    React.createElement('div', { className: 'mcpm-detail' },
                      'id: ' + row.id + ' · ' + (row.transport || '?') + (row.url ? ' · ' + row.url : '') + (row.command ? ' · ' + row.command + ((row.args && row.args.length) ? ' ' + row.args.join(' ') : '') : '')),
                    row.level !== 'loader' && React.createElement('div', { className: 'mcpm-detail' },
                      '工具调用超时: ' + (row.timeoutSeconds === null || row.timeoutSeconds === undefined ? '默认 60s（未写入配置）' : row.timeoutSeconds + 's')),
                    (row.headers || row.env) && React.createElement('div', { className: 'mcpm-detail' },
                      (row.headers ? 'headers: ' + maskKv(row.headers) + '  ' : '') + (row.env ? 'env: ' + Object.keys(row.env).map((k) => k + ': ****').join('  ') : '')),
                    React.createElement('div', { className: 'mcpm-row-actions' },
                      row.level !== 'loader' && React.createElement('button', { className: 'mcpm-btn', disabled: rowsLocked, onClick: () => openEdit(row) }, '编辑'),
                      typeof row.toolCount === 'number' && row.toolCount > 0 && React.createElement('button', { className: 'mcpm-btn', disabled: toolPreviewBusy, onClick: () => openToolPreview(row) }, '工具 (' + row.toolCount + ')'),
                      React.createElement('button', { className: 'mcpm-btn', disabled: rowsLocked, onClick: () => toggleRow(row) }, row.disabled ? '启用' : '禁用'),
                      // Restart only applies to entries this instance loads.
                      row.liveEligible !== false && React.createElement('button', { className: 'mcpm-btn', disabled: rowsLocked, onClick: () => restartRow(row) }, '重启'),
                      row.level !== 'loader' && React.createElement('button', { className: 'mcpm-btn danger', disabled: rowsLocked, onClick: () => removeRow(row) }, '删除')),
                    editing && editing.id === row.id && renderForm())),
            confirmRow && React.createElement('div', { className: 'mcpm-mask', onClick: () => setConfirmRow(null) },
              React.createElement('div', { className: 'mcpm-dialog', onClick: (ev) => ev.stopPropagation() },
                React.createElement('div', { className: 'mcpm-dialog-title' }, '删除 MCP 服务'),
                React.createElement('div', { className: 'mcpm-dialog-body' },
                  '确定要删除“' + confirmRow.serverName + '”吗？\n删除后该服务的配置将从补丁文件中移除，相关工具立即下线，此操作不可撤销。'
                  + (confirmRow.liveEligible === false ? '\n该条目位于 profile “' + (confirmRow.profileName || '') + '”，需重启该 profile 的 DSH 实例后生效。' : '')),
                React.createElement('div', { className: 'mcpm-dialog-actions' },
                  React.createElement('button', { className: 'mcpm-btn', onClick: () => setConfirmRow(null) }, '取消'),
                  React.createElement('button', { className: 'mcpm-btn danger', onClick: confirmDelete }, '删除')))),
            toolPreview && React.createElement('div', { className: 'mcpm-mask', onClick: () => setToolPreview(null) },
              React.createElement('div', { className: 'mcpm-dialog mcpm-dialog-tools', onClick: (ev) => ev.stopPropagation() },
                React.createElement('div', { className: 'mcpm-dialog-title' }, '工具预览：' + toolPreview.serverName + '（' + (toolPreviewBusy ? '加载中…' : (toolPreview.tools || []).length + ' 个工具') + '）'),
                React.createElement('div', { className: 'mcpm-dialog-body' },
                  toolPreviewErr
                    ? React.createElement('div', { className: 'mcpm-warn' }, '⚠ ' + toolPreviewErr)
                    : toolPreviewBusy
                      ? React.createElement('div', { className: 'mcpm-sub' }, '正在获取工具列表…')
                      : (toolPreview.tools || []).length === 0
                        ? React.createElement('div', { className: 'mcpm-sub' }, '该服务暂无已注册工具' + (toolPreview.emptyHint || ''))
                        : React.createElement('div', { className: 'mcpm-tools-list' },
                            (toolPreview.tools || []).map((t) =>
                              React.createElement('div', { className: 'mcpm-tool' },
                                React.createElement('div', { className: 'mcpm-tool-name' }, t.name),
                                React.createElement('div', { className: 'mcpm-sub' }, t.description || '（无描述）'),
                                (t.parameters && t.parameters.length > 0) &&
                                  React.createElement('div', { className: 'mcpm-tool-params' },
                                    t.parameters.map((p) =>
                                      React.createElement('div', { className: 'mcpm-tool-param' },
                                        React.createElement('span', { className: 'mcpm-tool-param-key' },
                                          p.key + (p.required ? ' *' : '')),
                                        React.createElement('span', { className: 'mcpm-tool-param-type' }, p.type || 'any'),
                                        React.createElement('span', { className: 'mcpm-tool-param-desc' }, p.description || '')))))))),
                React.createElement('div', { className: 'mcpm-dialog-actions' },
                  React.createElement('button', { className: 'mcpm-btn', onClick: () => setToolPreview(null) }, '关闭'))))
          )
        }

        slots.inject('settings.section', () => slots.register(
          { name: 'settings.section', id: 'mcp-manager', order: 16, label: 'MCP 管理' },
          () => React.createElement(MCPPage)
        ))

      },
    }
    return module.exports
  }

  // Register the client bundle under both names: the official CLI mounts the
  // bundle under the loader entry id `dsh-mcp-manager` (cordis.patch.yml
  // insert row), and the scoped npm package is `@xxxyz/dsh-mcp-manager`. The
  // boot graph row id must match the id the bundle registers, so both are
  // registered — the unused one is inert.
  window.__ModuleLoader__.load({ id: 'dsh-mcp-manager', factory })
  window.__ModuleLoader__.load({ id: '@xxxyz/dsh-mcp-manager', factory })
