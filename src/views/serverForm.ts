import * as vscode from 'vscode';
import { Server } from '../models/serverModel';
import { LocalizationService } from '../services/localizationService';
import { ServerService } from '../services/serverService';

interface GroupOption {
    label: string;
    id: string | undefined;
}

export class ServerForm {
    private localization = LocalizationService.getInstance();

    constructor(private serverService: ServerService) {}

    async showAddServerForm(): Promise<Server | undefined> {
        try {
            console.log(this.localization.localize('log.openAddForm'));
            const serverData = await this.collectServerInfo();
            if (serverData) {
                console.log(this.localization.localize('log.serverDataCollected') + ':', JSON.stringify(serverData, null, 2));
                const server = await this.serverService.addServer(serverData);
                vscode.window.showInformationMessage(this.localization.localize('form.serverAdded', serverData.name));
                return server;
            } else {
                console.log(this.localization.localize('log.addCancelled'));
                return undefined;
            }
        } catch (error) {
            console.error('Ошибка при добавлении сервера:', error);
            vscode.window.showErrorMessage(this.localization.localize('form.addError', error instanceof Error ? error.message : String(error)));
            return undefined;
        }
    }

    async showEditServerForm(serverToEdit: Server): Promise<Server | undefined> {
        try {
            console.log(this.localization.localize('log.openEditForm', serverToEdit.id));
            const serverData = await this.collectServerInfo(serverToEdit);
            if (serverData) {
                console.log(this.localization.localize('log.serverDataUpdated') + ':', JSON.stringify(serverData, null, 2));
                const updatedServer: Server = { ...serverData, id: serverToEdit.id };
                await this.serverService.updateServer(updatedServer);
                vscode.window.showInformationMessage(this.localization.localize('form.serverUpdated', serverData.name));
                return updatedServer;
            } else {
                console.log(this.localization.localize('log.editCancelled'));
                return undefined;
            }
        } catch (error) {
            console.error('Ошибка при обновлении сервера:', error);
            vscode.window.showErrorMessage(this.localization.localize('form.updateError', error instanceof Error ? error.message : String(error)));
            return undefined;
        }
    }

    private async collectServerInfo(existingServer?: Server): Promise<Omit<Server, 'id'> | undefined> {
        console.log(this.localization.localize('log.infoCollectionStart'));

        // Имя сервера
        const name = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.namePrompt'),
            value: existingServer?.name || '',
            validateInput: (value: string) => value ? null : this.localization.localize('form.nameValidation')
        });
        if (name === undefined) {
            console.log(this.localization.localize('log.nameInputCancelled'));
            return undefined;
        }

        // Хост
        const host = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.hostPrompt'),
            value: existingServer?.host || '',
            validateInput: (value: string) => value ? null : this.localization.localize('form.hostValidation')
        });
        if (host === undefined) {
            console.log(this.localization.localize('log.hostInputCancelled'));
            return undefined;
        }

        // Порт
        const portStr = await vscode.window.showInputBox({
            prompt: this.localization.localize('form.portPrompt'),
            value: existingServer?.port?.toString() || '22',
            validateInput: (value: string) => {
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
            validateInput: (value: string) => value ? null : this.localization.localize('form.usernameValidation')
        });
        if (username === undefined) {
            console.log(this.localization.localize('log.usernameInputCancelled'));
            return undefined;
        }

        // Выбор группы сервера
        let groupId: string | undefined = existingServer?.groupId;
        const groups = await this.serverService.getGroups();

        if (groups.length > 0) {
            // Создаем список групп для выбора
            const groupOptions: GroupOption[] = [
                { label: this.localization.localize('form.noGroup') || 'Без группы', id: undefined }
            ];

            groups.forEach(group => {
                groupOptions.push({ label: group.name, id: group.id });
            });

            // Опция для создания новой группы
            groupOptions.push({ label: this.localization.localize('form.createGroup') || '+ Создать новую группу', id: 'create' });

            const selectedGroup = await vscode.window.showQuickPick(groupOptions, {
                placeHolder: this.localization.localize('form.selectGroup') || 'Выберите группу для сервера',
            });

            if (selectedGroup === undefined) {
                console.log('Выбор группы отменен');
                return undefined;
            }

            // Если выбрано создание новой группы
            if (selectedGroup.id === 'create') {
                const newGroupName = await vscode.window.showInputBox({
                    prompt: this.localization.localize('form.newGroupName') || 'Введите название новой группы',
                    validateInput: (value: string) => value ? null : this.localization.localize('form.groupNameValidation') || 'Название группы не может быть пустым'
                });

                if (newGroupName === undefined) {
                    console.log('Создание группы отменено');
                    return undefined;
                }

                const groupDescription = await vscode.window.showInputBox({
                    prompt: this.localization.localize('form.groupDescription') || 'Введите описание группы (опционально)',
                });

                if (groupDescription === undefined) {
                    console.log('Создание группы отменено');
                    return undefined;
                }

                // Создаем новую группу
                const newGroup = await this.serverService.addGroup(newGroupName, groupDescription || undefined);
                groupId = newGroup.id;
                console.log(`Создана новая группа: ${newGroup.name} (${newGroup.id})`);
            } else {
                groupId = selectedGroup.id;
                console.log(`Выбрана группа: ${selectedGroup.label} (${groupId || 'без группы'})`);
            }
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
            privateKeyPassword,
            groupId
        };
    }
}
