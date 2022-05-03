import { join, relative } from 'path'
import { existsSync } from 'fs'
import defu from 'defu'
import chalk from 'chalk'
import { withTrailingSlash } from 'ufo'
import consola from 'consola'
import {
  defineNuxtModule,
  installModule,
  addTemplate,
  addServerMiddleware,
  resolveAlias,
  requireModule,
  isNuxt2,
  createResolver,
  resolvePath
} from '@nuxt/kit'
import { TailwindConfig } from 'tailwindcss/tailwind-config'
import { name, version } from '../package.json'
import defaultTailwindConfig from './tailwind.config'

const logger = consola.withScope('nuxt:tailwindcss')

export interface ModuleHooks {
  'tailwindcss:config': (tailwindConfig: any) => void
}

export interface ModuleOptions {
  /**
   * Define the path of the Tailwind configuration file.
   *
   * @default "tailwind.config.js"
   *
   * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#configpath}
   * @see [Tailwind Config section]{@link https://tailwindcss.nuxtjs.org/tailwind/config}
   */
  configPath: string
  /**
   * Define the path of the Tailwind CSS file. If the file does not exist, the module's default CSS file will be
   * imported instead.
   *
   * @default "~/assets/css/tailwind.css"
   *
   * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#csspath}
   */
  cssPath: string
  /**
   * You can directly extend the Tailwind config with the config property. It uses defu.fn to overwrite the defaults.
   *
   * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#config}
   * @see [Default]{@link https://tailwindcss.nuxtjs.org/tailwind/config}
   * @see [Overwriting Tailwind config]{@link https://tailwindcss.nuxtjs.org/tailwind/config#overwriting-the-configuration}
   */
  config: TailwindConfig,
  /**
   * This module internally uses tailwind-config-viewer to set up the /_tailwind/ route.
   * To disable the viewer during development, set its value to `false`.
   *
   * **The Tailwind viewer is only available during development (run with nuxi dev command).**
   *
   * @default true
   *
   * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#viewer}
   */
  viewer: boolean
  /**
   * If you need to resolve the tailwind config in runtime, you can enable the `exposeConfig` option.
   *
   * @default false
   *
   * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#exposeconfig}
   * @see [Referencing in the application]{@link https://tailwindcss.nuxtjs.org/tailwind/config#referencing-in-the-application}
   */
  exposeConfig: boolean
  /**
   * You can use any integer to adjust the position of the
   * [global CSS](https://v3.nuxtjs.org/api/configuration/nuxt.config#css) injection, which affects the CSS priority.
   *
   * @default 0
   *
   * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#injectposition}
   * @see [Overwriting Tailwind config]{@link https://tailwindcss.nuxtjs.org/tailwind/config#overwriting-the-configuration}
   */
  injectPosition: number
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name,
    version,
    configKey: 'tailwindcss'
  },
  defaults: nuxt => ({
    configPath: 'tailwind.config',
    cssPath: join(nuxt.options.dir.assets, 'css/tailwind.css'),
    config: defaultTailwindConfig(nuxt.options),
    viewer: true,
    exposeConfig: false,
    injectPosition: 0
  }),
  async setup (moduleOptions, nuxt) {
    const configPath = await resolvePath(moduleOptions.configPath, {
      extensions: ['.js', '.ts']
    })
    const cssPath = moduleOptions.cssPath && resolveAlias(moduleOptions.cssPath)
    const injectPosition = ~~Math.min(moduleOptions.injectPosition, (nuxt.options.css || []).length + 1)

    // Include CSS file in project css
    if (typeof cssPath === 'string') {
      if (existsSync(cssPath)) {
        logger.info(`Using Tailwind CSS from ~/${relative(nuxt.options.srcDir, cssPath)}`)
        nuxt.options.css.splice(injectPosition, 0, cssPath)
      } else {
        const resolver = createResolver(import.meta.url)
        nuxt.options.css.splice(injectPosition, 0, resolver.resolve('runtime/tailwind.css'))
      }
    }

    // Extend the Tailwind config
    let tailwindConfig: any = {}
    if (existsSync(configPath)) {
      tailwindConfig = requireModule(configPath, { clearCache: true })
      logger.info(`Merging Tailwind config from ~/${relative(nuxt.options.srcDir, configPath)}`)
      // Transform purge option from Array to object with { content }
      if (Array.isArray(tailwindConfig.purge)) {
        tailwindConfig.content = tailwindConfig.purge
      }
    }

    // Merge with our default purgecss default
    tailwindConfig = defu.arrayFn(tailwindConfig, moduleOptions.config)

    // Expose resolved tailwind config as an alias
    // https://tailwindcss.com/docs/configuration/#referencing-in-javascript
    if (moduleOptions.exposeConfig) {
      const resolveConfig = await import('tailwindcss/resolveConfig.js').then(r => r.default || r) as any
      const resolvedConfig = resolveConfig(tailwindConfig)
      const template = addTemplate({
        filename: 'tailwind.config.mjs',
        getContents: () => `export default ${JSON.stringify(resolvedConfig, null, 2)}`
      })
      addTemplate({
        filename: 'tailwind.config.d.ts',
        getContents: () => 'declare const config: import("tailwindcss/tailwind-config").TailwindConfig\nexport { config as default }',
        write: true
      })
      nuxt.options.alias['#tailwind-config'] = template.dst
    }

    // Watch the Tailwind config file to restart the server
    if (nuxt.options.dev) {
      nuxt.options.watch.push(configPath)
    }

    // Allow extending tailwindcss config by other modules
    // @ts-ignore
    await nuxt.callHook('tailwindcss:config', tailwindConfig)

    // Compute tailwindConfig hash
    tailwindConfig._hash = String(Date.now())

    // Setup postcss plugins
    // https://tailwindcss.com/docs/using-with-preprocessors#future-css-features
    const postcssOptions =
      nuxt.options.postcss || /* nuxt 3 */
      nuxt.options.build.postcss.postcssOptions || /* older nuxt3 */
      nuxt.options.build.postcss as any
    postcssOptions.plugins = postcssOptions.plugins || {}
    postcssOptions.plugins['tailwindcss/nesting'] = postcssOptions.plugins['tailwindcss/nesting'] ?? {}
    postcssOptions.plugins['postcss-custom-properties'] = postcssOptions.plugins['postcss-custom-properties'] ?? {}
    postcssOptions.plugins.tailwindcss = tailwindConfig

    if (isNuxt2()) {
      await installModule('@nuxt/postcss8')
    }

    // Add _tailwind config viewer endpoint
    if (nuxt.options.dev && moduleOptions.viewer) {
      const route = '/_tailwind/'
      const createServer = await import('tailwind-config-viewer/server/index.js').then(r => r.default || r) as any
      const { withoutTrailingSlash } = await import('ufo')
      const _viewerDevMiddleware = createServer({ tailwindConfigProvider: () => tailwindConfig }).asMiddleware()
      const viewerDevMiddleware = (req, res) => {
        if (req.originalUrl === withoutTrailingSlash(route)) {
          res.writeHead(301, { Location: withTrailingSlash(req.originalUrl) })
          res.end()
        }
        _viewerDevMiddleware(req, res)
      }
      addServerMiddleware({ route, handler: viewerDevMiddleware })
      nuxt.hook('listen', (_, listener) => {
        const fullPath = `${withoutTrailingSlash(listener.url)}${route}`
        logger.info(`Tailwind Viewer: ${chalk.underline.yellow(fullPath)}`)
      })
    }
  }
})
