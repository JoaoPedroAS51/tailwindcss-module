// Learn more at https://tailwindcss.com/docs/configuration
export default ({ srcDir }) => ({
  theme: {
    extend: {}
  },
  plugins: [],
  content: [
    `${srcDir}/components/**/*.{vue,js,ts}`,
    `${srcDir}/layouts/**/*.vue`,
    `${srcDir}/pages/**/*.vue`,
    `${srcDir}/composables/**/*.{js,ts}`,
    `${srcDir}/plugins/**/*.{js,ts}`,
    // TODO: This makes issues with import protection
    // Split in two files to avoid watching issues (https://github.com/nuxt-community/tailwindcss-module/issues/359)
    `${srcDir}/App.js`,
    `${srcDir}/App.ts`,
    `${srcDir}/App.vue`,
    `${srcDir}/app.js`,
    `${srcDir}/app.ts`,
    `${srcDir}/app.vue`
    // `${rootDir}/nuxt.config.js`,
    // `${rootDir}/nuxt.config.ts`
  ]
})
