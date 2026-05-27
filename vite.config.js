import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

const BUILD_VERSION = Date.now().toString()

function versionPlugin() {
  return {
    name: 'version-file',
    buildStart() {
      fs.writeFileSync('public/version.json', JSON.stringify({ v: BUILD_VERSION }))
    },
  }
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  define: {
    __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
  },
})
