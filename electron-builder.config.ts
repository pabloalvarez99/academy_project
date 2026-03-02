import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.eks.app',
  productName: 'EKS',
  copyright: 'Copyright © 2026',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: [
    'out/**/*',
    'resources/**/*',
    '!resources/content/**/*'
  ],
  extraResources: [
    { from: 'resources/content', to: 'content', filter: ['**/*'] },
    { from: 'node_modules/sql.js/dist/sql-wasm.wasm', to: 'sql-js/sql-wasm.wasm' }
  ],
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'resources/icon.ico'
  },
  mac: {
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
    icon: 'resources/icon.icns',
    category: 'public.app-category.education'
  },
  linux: {
    target: [{ target: 'AppImage', arch: ['x64'] }],
    icon: 'resources/icon.png'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true
  }
}

export default config
