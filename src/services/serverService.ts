import * as vscode from 'vscode';
import { Server } from '../models/serverModel';
import { LocalizationService } from './localizationService';

export class ServerService {
    private context: vscode.ExtensionContext;
    private servers: Server[] = [];
    private localization = LocalizationService.getInstance();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadServers();
    }

    private async loadServers(): Promise<void> {
        // Загружает список серверов из безопасного хранилища
        const serversJson = await this.context.secrets.get('saveServeServers');
        console.log(this.localization.localize('service.loadStart', serversJson
            ? this.localization.localize('service.loadFound')
            : this.localization.localize('service.loadNotFound')));

        if (serversJson) {
            try {
                this.servers = JSON.parse(serversJson);
                console.log(this.localization.localize('service.loadSuccess', this.servers.length));
            } catch (error) {
                console.error(this.localization.localize('service.loadError'), error);
                this.servers = [];
            }
        }
    }

    private async saveServers(): Promise<void> {
        // Сохраняет список серверов в безопасное хранилище
        console.log(this.localization.localize('service.saveStart', this.servers.length));
        const serversJson = JSON.stringify(this.servers);
        await this.context.secrets.store('saveServeServers', serversJson);
        console.log(this.localization.localize('service.saveSuccess'));
    }

    public async getServers(): Promise<Server[]> {
        console.log(this.localization.localize('service.getServers', this.servers.length));
        return [...this.servers];
    }

    public async addServer(server: Omit<Server, 'id'>): Promise<Server> {
        console.log(this.localization.localize('service.addStart', server.name));
        const newServer: Server = {
            ...server,
            id: this.generateId()
        };

        this.servers.push(newServer);
        await this.saveServers();
        console.log(this.localization.localize('service.addSuccess', newServer.id));
        return newServer;
    }

    public async updateServer(server: Server): Promise<void> {
        console.log(this.localization.localize('service.updateStart', server.id));
        const index = this.servers.findIndex(s => s.id === server.id);
        if (index !== -1) {
            this.servers[index] = server;
            await this.saveServers();
            console.log(this.localization.localize('service.updateSuccess'));
        } else {
            console.error(this.localization.localize('service.updateNotFound', server.id));
            throw new Error(this.localization.localize('service.updateNotFound', server.id));
        }
    }

    public async deleteServer(id: string): Promise<void> {
        console.log(this.localization.localize('service.deleteStart', id));
        const index = this.servers.findIndex(s => s.id === id);
        if (index !== -1) {
            this.servers.splice(index, 1);
            await this.saveServers();
            console.log(this.localization.localize('service.deleteSuccess'));
        } else {
            console.error(this.localization.localize('service.deleteNotFound', id));
        }
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) +
               Math.random().toString(36).substring(2, 15);
    }
}
