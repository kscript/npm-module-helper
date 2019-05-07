export const app: App = {
    commands: {
        yarn: {
            i: '',
            install: 'add',
            rebuild: 'add',
            update: 'upgrade',
            uninstall: 'remove'
        },
        npm: {
            install: 'i'
        },
        cnpm: {
            install: 'i'
        }
    },
    configuration: {
    },
    types: {
        install2: 'install'
    },
    texts: {
        install: '安装',
        uninstall: '卸载',
        update: '更新',
        rebuild: '重装'
    },
    defaults: {
        manager: 'npm',
        ext: '^(js|jsx|ts|vue)$',
        terminalTitle: 'npm module helper'
    }
}
export default app
