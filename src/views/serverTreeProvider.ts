import * as vscode from 'vscode';
import { Server, ServerGroup } from '../models/serverModel';
import { LocalizationService } from '../services/localizationService';
import { ServerService } from '../services/serverService';

export class ServerTreeProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private localization = LocalizationService.getInstance();

    constructor(private serverService: ServerService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!element) {
            // Корневой уровень: показываем группы и серверы без группы
            const groups = await this.serverService.getGroups();
            const groupItems: TreeItem[] = groups.map(group => new GroupTreeItem(group, this.localization));

            // Добавляем категорию "Без группы" только если есть серверы без группы
            const ungroupedServers = await this.serverService.getUngroupedServers();
            if (ungroupedServers.length > 0) {
                groupItems.push(new UngroupedServersItem(this.localization));
            }

            return groupItems;
        } else if (element instanceof GroupTreeItem) {
            // Запрашиваем серверы для конкретной группы
            const servers = await this.serverService.getServersInGroup(element.group.id);
            return servers.map(server => new ServerTreeItem(server, this.localization));
        } else if (element instanceof UngroupedServersItem) {
            // Запрашиваем серверы без группы
            const servers = await this.serverService.getUngroupedServers();
            return servers.map(server => new ServerTreeItem(server, this.localization));
        }

        return [];
    }
}

// Базовый класс для элементов дерева
export abstract class TreeItem extends vscode.TreeItem {
    constructor(
        label: string,
        collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
    }
}

// Элемент для группы серверов
export class GroupTreeItem extends TreeItem {
    constructor(
        public readonly group: ServerGroup,
        private localization: LocalizationService
    ) {
        super(group.name, vscode.TreeItemCollapsibleState.Expanded);
        this.tooltip = group.description || group.name;
        this.contextValue = 'group';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

// Элемент для категории "Без группы"
export class UngroupedServersItem extends TreeItem {
    constructor(
        private localization: LocalizationService
    ) {
        super(localization.localize('group.ungrouped') || 'Без группы', vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'ungrouped';
        this.iconPath = new vscode.ThemeIcon('folder-opened');
    }
}

// Элемент для отдельного сервера
export class ServerTreeItem extends TreeItem {
    constructor(
        public readonly server: Server,
        private localization: LocalizationService
    ) {
        super(server.name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `${server.username}@${server.host}:${server.port}`;
        this.description = `${server.username}@${server.host}`;
        this.contextValue = 'server';
        this.iconPath = new vscode.ThemeIcon('server');

        // Добавляет команду, которая будет вызываться при клике на элемент
        this.command = {
            command: 'save-serve.connectToServer',
            title: this.localization.localize('command.connectToServer'),
            arguments: [server]
        };
    }
}
