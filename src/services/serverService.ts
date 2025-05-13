import * as vscode from 'vscode';
import { Server, ServerGroup } from '../models/serverModel';
import { LocalizationService } from './localizationService';

export class ServerService {
    private context: vscode.ExtensionContext;
    private servers: Server[] = [];
    private groups: ServerGroup[] = [];
    private localization = LocalizationService.getInstance();

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.loadServers();
        this.loadGroups();
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

    private async loadGroups(): Promise<void> {
        // Загружает список групп серверов из хранилища
        const groupsJson = await this.context.secrets.get('saveServeGroups');
        console.log('Загрузка групп:', groupsJson ? 'найдены группы' : 'группы не найдены');

        if (groupsJson) {
            try {
                this.groups = JSON.parse(groupsJson);
                console.log(`Успешно загружено ${this.groups.length} групп`);
            } catch (error) {
                console.error('Ошибка при загрузке групп:', error);
                this.groups = [];
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

    private async saveGroups(): Promise<void> {
        // Сохраняет список групп в безопасное хранилище
        console.log(`Сохранение ${this.groups.length} групп`);
        const groupsJson = JSON.stringify(this.groups);
        await this.context.secrets.store('saveServeGroups', groupsJson);
        console.log('Группы успешно сохранены');
    }

    public async getServers(): Promise<Server[]> {
        console.log(this.localization.localize('service.getServers', this.servers.length));
        return [...this.servers];
    }

    public async getGroups(): Promise<ServerGroup[]> {
        console.log(`Получение списка групп (${this.groups.length})`);
        return [...this.groups];
    }

    public async getServersInGroup(groupId: string): Promise<Server[]> {
        console.log(`Получение серверов в группе ${groupId}`);
        return this.servers.filter(server => server.groupId === groupId);
    }

    public async getUngroupedServers(): Promise<Server[]> {
        console.log('Получение серверов без группы');
        return this.servers.filter(server => !server.groupId);
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

    public async addGroup(groupName: string, description?: string): Promise<ServerGroup> {
        console.log(`Добавление группы: ${groupName}`);
        const newGroup: ServerGroup = {
            id: this.generateId(),
            name: groupName,
            description
        };

        this.groups.push(newGroup);
        await this.saveGroups();
        console.log(`Группа успешно добавлена: ${newGroup.id}`);
        return newGroup;
    }

    public async updateGroup(group: ServerGroup): Promise<void> {
        console.log(`Обновление группы: ${group.id}`);
        const index = this.groups.findIndex(g => g.id === group.id);
        if (index !== -1) {
            this.groups[index] = group;
            await this.saveGroups();
            console.log('Группа успешно обновлена');
        } else {
            console.error(`Группа не найдена: ${group.id}`);
            throw new Error(`Группа не найдена: ${group.id}`);
        }
    }

    public async deleteGroup(id: string, removeServers: boolean = false): Promise<void> {
        console.log(`Удаление группы: ${id}`);
        const index = this.groups.findIndex(g => g.id === id);
        if (index !== -1) {
            this.groups.splice(index, 1);

            // Если указано, удаляем серверы в группе, иначе просто удаляем ссылки на группу
            if (removeServers) {
                this.servers = this.servers.filter(server => server.groupId !== id);
            } else {
                this.servers = this.servers.map(server => {
                    if (server.groupId === id) {
                        return { ...server, groupId: undefined };
                    }
                    return server;
                });
            }

            await Promise.all([this.saveGroups(), this.saveServers()]);
            console.log('Группа успешно удалена');
        } else {
            console.error(`Группа не найдена: ${id}`);
        }
    }

    public async moveServerToGroup(serverId: string, groupId?: string): Promise<void> {
        console.log(`Перемещение сервера ${serverId} в группу ${groupId || "без группы"}`);
        const server = this.servers.find(s => s.id === serverId);

        if (!server) {
            console.error(`Сервер не найден: ${serverId}`);
            throw new Error(`Сервер не найден: ${serverId}`);
        }

        // Если указан groupId, проверяем существование группы
        if (groupId && !this.groups.some(g => g.id === groupId)) {
            console.error(`Группа не найдена: ${groupId}`);
            throw new Error(`Группа не найдена: ${groupId}`);
        }

        server.groupId = groupId;
        await this.saveServers();
        console.log(`Сервер успешно перемещен в группу ${groupId || "без группы"}`);
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) +
               Math.random().toString(36).substring(2, 15);
    }
}
