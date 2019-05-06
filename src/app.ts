interface App {
    commands: {
        yarn: {
            [propName: string]: string;
        },
        npm: {
            [propName: string]: string;
        },
        cnpm: {
            [propName: string]: string;
        }
    },
    configuration: {
        manager?: string;
        ext?: string;
        terminalTitle?: string;
    },
    types: {
        [propName: string]: string;
    },
    defaults: {
        manager: string;
        ext: string;
        terminalTitle: string;
    }
}
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
    defaults: {
        manager: 'npm',
        ext: '^js|jsx|ts|vue$',
        terminalTitle: 'npm module helper'
    }
}
export default app
