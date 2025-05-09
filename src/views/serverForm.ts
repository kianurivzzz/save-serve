import * as vscode from 'vscode';
import { Server } from '../models/serverModel';
import { LocalizationService } from '../services/localizationService';
import { ServerService } from '../services/serverService';

export class ServerForm {
    private localization = LocalizationService.getInstance();

    constructor(private serverService: ServerService) {}

    async showAddServerForm(): Promise<void> {
        try {
            console.log(this.localization.localize('log.openAddForm'));
            const server = await this.collectServerInfo();
            if (server) {
                console.log(this.localization.localize('log.serverDataCollected') + ':', JSON.stringify(server, null, 2));
                await this.serverService.addServer(server);
                vscode.window.showInformationMessage(this.localization.localize('form.serverAdded', server.name));
            } else {
                console.log(this.localization.localize('log.addCancelled'));
            }
        } catch (error) {
            console.error('Ошибка при добавлении сервера:', error);
            vscode.window.showErrorMessage(this.localization.localize('form.addError', error instanceof Error ? error.message : String(error)));
        }
    }

    async showEditServerForm(serverToEdit: Server): Promise<void> {
        try {
            console.log(this.localization.localize('log.openEditForm', serverToEdit.id));
            const server = await this.collectServerInfo(serverToEdit);
            if (server) {
                console.log(this.localization.localize('log.serverDataUpdated') + ':', JSON.stringify(server, null, 2));
                const updatedServer: Server = { ...server, id: serverToEdit.id };
                await this.serverService.updateServer(updatedServer);
                vscode.window.showInformationMessage(this.localization.localize('form.serverUpdated', server.name));
            } else {
                console.log(this.localization.localize('log.editCancelled'));
            }
        } catch (error) {
            console.error('Ошибка при обновлении сервера:', error);
            vscode.window.showErrorMessage(this.localization.localize('form.updateError', error instanceof Error ? error.message : String(error)));
        }
    }

    private async collectServerInfo(existingServer?: Server): Promise<Omit<Server, 'id'> | undefined> {
        console.log(this.localization.localize('log.infoCollectionStart'));

        // Имя сервера
        const name = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.namePrompt'),
            value: existingServer?.name || '',
            validateInput: value => value ? null : this.localization.localize('form.nameValidation')
        });
        if (name === undefined) {
            console.log(this.localization.localize('log.nameInputCancelled'));
            return undefined;
        }

        // Хост
        const host = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.hostPrompt'),
            value: existingServer?.host || '',
            validateInput: value => value ? null : this.localization.localize('form.hostValidation')
        });
        if (host === undefined) {
            console.log(this.localization.localize('log.hostInputCancelled'));
            return undefined;
        }

        // Порт
        const portStr = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.portPrompt'),
            value: existingServer?.port?.toString() || '22',
            validateInput: value => {
                if (!value) {
                    return null;
                }; // Разрешает пустое значение для порта по умолчанию
                const port = Number(value);
                return (!isNaN(port) && port > 0 && port < 65536) ? null : this.localization.localize('form.portValidation');
            }
        });
        if (portStr === undefined) {
            console.log(this.localization.localize('log.portInputCancelled'));
            return undefined;
        }
        // Если строка пустая, используем порт 22 по умолчанию
        const port = portStr === '' ? 22 : Number(portStr);
        console.log('Порт сервера:', port);

        // Имя пользователя
        const username = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.usernamePrompt'),
            value: existingServer?.username || '',
            validateInput: value => value ? null : this.localization.localize('form.usernameValidation')
        });
        if (username === undefined) {
            console.log(this.localization.localize('log.usernameInputCancelled'));
            return undefined;
        }

        // Способ аутентификации
        const authOptions = [
            this.localization.localize('form.authSshKey'),
            this.localization.localize('form.authPassword')
        ];
        const authMethod = await vscode.window.showQuickPick(authOptions, {
            placeHolder: this.localization.localize('form.authMethod'),
        });
        if (authMethod === undefined) {
            console.log(this.localization.localize('log.authMethodCancelled'));
            return undefined;
        }

        const usePrivateKey = authMethod === this.localization.localize('form.authSshKey');
        console.log(this.localization.localize('log.usePrivateKey', usePrivateKey));

        let password: string | undefined;
        let privateKeyPath: string | undefined;
        let privateKeyPassword: string | undefined;

        if (usePrivateKey) {
            // Путь к SSH-ключу
            const keyFiles = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                title: this.localization.localize('form.sshKeyFile'),
                defaultUri: existingServer?.privateKeyPath
                    ? vscode.Uri.file(existingServer.privateKeyPath)
                    : undefined
            });
            if (!keyFiles || keyFiles.length === 0) {
                console.log(this.localization.localize('log.sshKeyCancelled'));
                return undefined;
            }
            privateKeyPath = keyFiles[0].fsPath;
            console.log(this.localization.localize('log.sshKeySelection', privateKeyPath));

            // Пароль для SSH-ключа (опционально)
            privateKeyPassword = await vscode.window.showInputBox({
                prompt: this.localization.localize('form.sshKeyPasswordPrompt'),
                password: true,
                value: existingServer?.privateKeyPassword || ''
            });
            if (privateKeyPassword === undefined) {
                console.log(this.localization.localize('log.sshKeyPasswordCancelled'));
                return undefined;
            }
        } else {
            // Пароль для сервера
            password = await vscode.window.showInputBox({
                prompt: this.localization.localize('form.passwordPrompt'),
                password: true,
                value: existingServer?.password || ''
            });
            if (password === undefined) {
                console.log(this.localization.localize('log.passwordCancelled'));
                return undefined;
            }
        }

        console.log(this.localization.localize('log.infoCollectionComplete'));

        return {
            name,
            host,
            port,
            username,
            password,
            usePrivateKey,
            privateKeyPath,
            privateKeyPassword
        };
    }
}
