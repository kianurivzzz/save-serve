export interface Server {
    id: string;
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    usePrivateKey: boolean;
    privateKeyPath?: string;
    privateKeyPassword?: string;
    groupId?: string;
}

export interface ServerGroup {
    id: string;
    name: string;
    description?: string;
}
