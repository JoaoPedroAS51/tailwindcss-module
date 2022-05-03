import * as _nuxt_schema from '@nuxt/schema';
import { TailwindConfig } from 'tailwindcss/tailwind-config';

interface ModuleHooks {
    'tailwindcss:config': (tailwindConfig: any) => void;
}
interface ModuleOptions {
    /**
     * Define the path of the Tailwind configuration file.
     *
     * @default "tailwind.config.js"
     *
     * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#configpath}
     * @see [Tailwind Config section]{@link https://tailwindcss.nuxtjs.org/tailwind/config}
     */
    configPath: string;
    /**
     * Define the path of the Tailwind CSS file. If the file does not exist, the module's default CSS file will be
     * imported instead.
     *
     * @default "~/assets/css/tailwind.css"
     *
     * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#csspath}
     */
    cssPath: string;
    /**
     * You can directly extend the Tailwind config with the config property. It uses defu.fn to overwrite the defaults.
     *
     * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#config}
     * @see [Default]{@link https://tailwindcss.nuxtjs.org/tailwind/config}
     * @see [Overwriting Tailwind config]{@link https://tailwindcss.nuxtjs.org/tailwind/config#overwriting-the-configuration}
     */
    config: TailwindConfig;
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
    viewer: boolean;
    /**
     * If you need to resolve the tailwind config in runtime, you can enable the `exposeConfig` option.
     *
     * @default false
     *
     * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#exposeconfig}
     * @see [Referencing in the application]{@link https://tailwindcss.nuxtjs.org/tailwind/config#referencing-in-the-application}
     */
    exposeConfig: boolean;
    /**
     * You can use any integer to adjust the position of the
     * [global CSS](https://v3.nuxtjs.org/api/configuration/nuxt.config#css) injection, which affects the CSS priority.
     *
     * @default 0
     *
     * @see [Documentation]{@link https://tailwindcss.nuxtjs.org/options#injectposition}
     * @see [Overwriting Tailwind config]{@link https://tailwindcss.nuxtjs.org/tailwind/config#overwriting-the-configuration}
     */
    injectPosition: number;
}
declare const _default: _nuxt_schema.NuxtModule<ModuleOptions>;

export { ModuleHooks, ModuleOptions, _default as default };
