import react from '@vitejs/plugin-react-swc'

const noAttr = () => ({
  name: 'no-attribute',
  transformIndexHtml(html) {
    return html.replace(/ crossorigin(?:="[^"]*")?/g, '')
  }
})

/** @type {import('vite').UserConfig} */
export default {
  root: 'src',
  base: './',
  plugins: [
    react(),
    noAttr()
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true
  }
};
