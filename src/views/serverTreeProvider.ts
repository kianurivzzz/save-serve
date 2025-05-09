import * as vscode from 'vscode';
import { Server } from '../models/serverModel';
import { LocalizationService } from '../services/localizationService';
import { ServerService } from '../services/serverService';

export class ServerTreeProvider implements vscode.TreeDataProvider<ServerTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ServerTreeItem | undefined | null | void> = new vscode.EventEmitter<ServerTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ServerTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
    private localization = LocalizationService.getInstance();

    constructor(private serverService: ServerService) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ServerTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: ServerTreeItem): Promise<ServerTreeItem[]> {
        if (element) {
            return [];
        } else {
            const servers = await this.serverService.getServers();
            return servers.map(server => new ServerTreeItem(server, this.localization));
        }
    }
}

export class ServerTreeItem extends vscode.TreeItem {
    constructor(
        public readonly server: Server,
        private localization: LocalizationService
    ) {
        super(server.name, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `${server.username}@${server.host}:${server.port}`;
        this.description = `${server.username}@${server.host}`;
        this.contextValue = 'server';
        this.iconPath = new vscode.ThemeIcon('server');

        // Добавляет отладочную информацию при создании элемента
        console.log(this.localization.localize('treeitem.created') + ':', JSON.stringify(server, null, 2));

        // Добавляет команду, которая будет вызываться при клике на элемент
        this.command = {
            command: 'save-serve.connectToServer',
            title: this.localization.localize('command.connectToServer'),
            arguments: [server]
        };
    }
}
