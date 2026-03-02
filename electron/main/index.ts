import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { registerGrammarHandlers } from './ipc/grammar'
import { registerProgrammingHandlers } from './ipc/programming'
import { registerSqlHandlers } from './ipc/sql'
import { registerKnowledgeHandlers } from './ipc/knowledge'
import { registerUserHandlers } from './ipc/user'
import { registerSearchHandlers } from './ipc/search'
import { registerContentHandlers } from './ipc/content'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.on('ready-to-show', () => {
    win.show()
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Register all IPC handlers before creating the window
  registerContentHandlers()
  registerGrammarHandlers()
  registerProgrammingHandlers()
  registerSqlHandlers()
  registerKnowledgeHandlers()
  registerUserHandlers()
  registerSearchHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
