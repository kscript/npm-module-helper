interface App {
    commands: {
        yarn: stringObject,
        npm: stringObject,
        cnpm: stringObject
    },
    configuration: {
        manager?: string;
        ext?: string;
        terminalTitle?: string;
    },
    types: stringObject,
    texts: stringObject,
    defaults: {
        manager: string;
        ext: string;
        terminalTitle: string;
    }
}
