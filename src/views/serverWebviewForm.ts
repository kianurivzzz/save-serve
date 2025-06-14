import * as vscode from 'vscode';
import { Server } from '../models/serverModel';
import { LocalizationService } from '../services/localizationService';
import { ServerService } from '../services/serverService';

export class ServerWebviewForm {
    private localization = LocalizationService.getInstance();
    private currentPanel?: vscode.WebviewPanel;

    constructor(private serverService: ServerService, private context: vscode.ExtensionContext) {}

    async showAddServerWebview(): Promise<Server | undefined> {
        return this.showServerWebview(undefined);
    }

    async showEditServerWebview(server: Server): Promise<Server | undefined> {
        return this.showServerWebview(server);
    }

    private async showServerWebview(existingServer?: Server): Promise<Server | undefined> {
        const isEdit = !!existingServer;
        const title = isEdit
            ? this.localization.localize('form.editServer', existingServer!.name)
            : this.localization.localize('form.addServer');

        // Закрываем предыдущую панель, если она открыта
        if (this.currentPanel) {
            this.currentPanel.dispose();
        }

        // Создаем новую webview панель
        this.currentPanel = vscode.window.createWebviewPanel(
            'serverForm',
            title,
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true, // Ключевой параметр для сохранения состояния
                localResourceRoots: []
            }
        );

        // Получаем группы для dropdown
        const groups = await this.serverService.getGroups();

        // Устанавливаем HTML содержимое
        this.currentPanel.webview.html = this.getWebviewContent(existingServer, groups);

        // Обрабатываем сообщения от webview
        return new Promise((resolve) => {
            if (!this.currentPanel) {
                resolve(undefined);
                return;
            }

            this.currentPanel.webview.onDidReceiveMessage(
                async (message) => {
                    switch (message.type) {
                        case 'submit':
                            try {
                                const serverData = message.data;
                                console.log('Получены данные сервера:', JSON.stringify(serverData, null, 2));

                                // Создаем новую группу, если нужно
                                if (serverData.groupId === 'create' && serverData.newGroupName) {
                                    const newGroup = await this.serverService.addGroup(
                                        serverData.newGroupName,
                                        serverData.newGroupDescription || undefined
                                    );
                                    serverData.groupId = newGroup.id;
                                }

                                // Обрабатываем данные сервера
                                const server = await this.processServerData(serverData, existingServer);

                                if (this.currentPanel) {
                                    this.currentPanel.dispose();
                                    this.currentPanel = undefined;
                                }

                                resolve(server);
                            } catch (error) {
                                console.error('Ошибка при обработке данных сервера:', error);
                                this.currentPanel?.webview.postMessage({
                                    type: 'error',
                                    message: error instanceof Error ? error.message : String(error)
                                });
                            }
                            break;

                        case 'cancel':
                            if (this.currentPanel) {
                                this.currentPanel.dispose();
                                this.currentPanel = undefined;
                            }
                            resolve(undefined);
                            break;

                        case 'selectSshKey':
                            const keyFiles = await vscode.window.showOpenDialog({
                                canSelectFiles: true,
                                canSelectFolders: false,
                                canSelectMany: false,
                                title: this.localization.localize('form.sshKeyFile'),
                                defaultUri: existingServer?.privateKeyPath
                                    ? vscode.Uri.file(existingServer.privateKeyPath)
                                    : undefined
                            });

                            if (keyFiles && keyFiles.length > 0) {
                                this.currentPanel?.webview.postMessage({
                                    type: 'sshKeySelected',
                                    path: keyFiles[0].fsPath
                                });
                            }
                            break;

                        case 'requestGroups':
                            const currentGroups = await this.serverService.getGroups();
                            this.currentPanel?.webview.postMessage({
                                type: 'groupsData',
                                groups: currentGroups
                            });
                            break;
                    }
                },
                undefined,
                this.context.subscriptions
            );

            // Обрабатываем закрытие панели
            this.currentPanel.onDidDispose(() => {
                this.currentPanel = undefined;
                resolve(undefined);
            });
        });
    }

    private async processServerData(data: any, existingServer?: Server): Promise<Server> {
        const serverData = {
            name: data.name,
            host: data.host,
            port: data.port || 22,
            username: data.username,
            usePrivateKey: data.usePrivateKey === 'true',
            groupId: data.groupId === 'none' ? undefined : data.groupId,
            password: data.usePrivateKey === 'true' ? undefined : data.password,
            privateKeyPath: data.usePrivateKey === 'true' ? data.privateKeyPath : undefined,
            privateKeyPassword: data.usePrivateKey === 'true' ? data.privateKeyPassword : undefined
        };

        if (existingServer) {
            // Обновляем существующий сервер
            const updatedServer: Server = { ...serverData, id: existingServer.id };
            await this.serverService.updateServer(updatedServer);
            vscode.window.showInformationMessage(
                this.localization.localize('form.serverUpdated', serverData.name)
            );
            return updatedServer;
        } else {
            // Создаем новый сервер
            const server = await this.serverService.addServer(serverData);
            vscode.window.showInformationMessage(
                this.localization.localize('form.serverAdded', serverData.name)
            );
            return server;
        }
    }

    private getWebviewContent(existingServer?: Server, groups: any[] = []): string {
        const isEdit = !!existingServer;
        const nonce = this.generateNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>${isEdit ? this.localization.localize('form.editServer', existingServer!.name) : this.localization.localize('form.addServer')}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }

        .form-container {
            max-width: 600px;
            margin: 0 auto;
        }

        .form-group {
            margin-bottom: 15px;
        }

        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: var(--vscode-input-foreground);
        }

        input[type="text"], input[type="number"], input[type="password"], select, textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
            font-size: inherit;
            font-family: inherit;
            box-sizing: border-box;
        }

        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }

        .radio-group {
            display: flex;
            gap: 20px;
            margin-top: 5px;
        }

        .radio-option {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .conditional-fields {
            margin-top: 15px;
            padding: 15px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 5px;
            border: 1px solid var(--vscode-input-border);
        }

        .button-group {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-input-border);
        }

        button {
            padding: 8px 16px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: inherit;
            font-family: inherit;
            min-width: 80px;
        }

        .btn-primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .file-select-group {
            display: flex;
            gap: 10px;
            align-items: flex-end;
        }

        .file-select-group input {
            flex: 1;
        }

        .file-select-group button {
            padding: 8px 12px;
            white-space: nowrap;
        }

        .error-message {
            color: var(--vscode-errorForeground);
            font-size: 12px;
            margin-top: 5px;
        }

        .group-creation {
            margin-top: 10px;
            padding: 10px;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 3px;
            border: 1px solid var(--vscode-input-border);
        }

        .required {
            color: var(--vscode-errorForeground);
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h2>${isEdit ? this.localization.localize('form.editServer', existingServer!.name) : this.localization.localize('form.addServer')}</h2>

        <form id="serverForm">
            <div class="form-group">
                <label for="name">${this.localization.localize('form.namePrompt')} <span class="required">*</span></label>
                <input type="text" id="name" name="name" value="${existingServer?.name || ''}" required>
                <div class="error-message" id="nameError"></div>
            </div>

            <div class="form-group">
                <label for="host">${this.localization.localize('form.hostPrompt')} <span class="required">*</span></label>
                <input type="text" id="host" name="host" value="${existingServer?.host || ''}" required>
                <div class="error-message" id="hostError"></div>
            </div>

            <div class="form-group">
                <label for="port">${this.localization.localize('form.portPrompt')}</label>
                <input type="number" id="port" name="port" value="${existingServer?.port || 22}" min="1" max="65535">
                <div class="error-message" id="portError"></div>
            </div>

            <div class="form-group">
                <label for="username">${this.localization.localize('form.usernamePrompt')} <span class="required">*</span></label>
                <input type="text" id="username" name="username" value="${existingServer?.username || ''}" required>
                <div class="error-message" id="usernameError"></div>
            </div>

            <div class="form-group">
                <label>${this.localization.localize('form.selectGroup')}</label>
                <select id="groupId" name="groupId">
                    <option value="none" ${!existingServer?.groupId ? 'selected' : ''}>${this.localization.localize('form.noGroup')}</option>
                    ${groups.map(group =>
                        `<option value="${group.id}" ${existingServer?.groupId === group.id ? 'selected' : ''}>${group.name}</option>`
                    ).join('')}
                    <option value="create">${this.localization.localize('form.createGroup')}</option>
                </select>

                <div id="groupCreation" class="group-creation" style="display: none;">
                    <div class="form-group">
                        <label for="newGroupName">${this.localization.localize('form.newGroupName')} <span class="required">*</span></label>
                        <input type="text" id="newGroupName" name="newGroupName">
                    </div>
                    <div class="form-group">
                        <label for="newGroupDescription">${this.localization.localize('form.groupDescription')}</label>
                        <textarea id="newGroupDescription" name="newGroupDescription" rows="2"></textarea>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>${this.localization.localize('form.authMethod')}</label>
                <div class="radio-group">
                    <div class="radio-option">
                        <input type="radio" id="authKey" name="usePrivateKey" value="true" ${existingServer?.usePrivateKey ? 'checked' : ''}>
                        <label for="authKey">${this.localization.localize('form.authSshKey')}</label>
                    </div>
                    <div class="radio-option">
                        <input type="radio" id="authPassword" name="usePrivateKey" value="false" ${!existingServer?.usePrivateKey ? 'checked' : ''}>
                        <label for="authPassword">${this.localization.localize('form.authPassword')}</label>
                    </div>
                </div>
            </div>

            <div id="sshKeyFields" class="conditional-fields" style="display: ${existingServer?.usePrivateKey ? 'block' : 'none'};">
                <div class="form-group">
                    <label for="privateKeyPath">${this.localization.localize('form.sshKeyFile')} <span class="required">*</span></label>
                    <div class="file-select-group">
                        <input type="text" id="privateKeyPath" name="privateKeyPath" value="${existingServer?.privateKeyPath || ''}" readonly>
                        <button type="button" id="selectKeyBtn" class="btn-secondary">${this.localization.localize('form.selectFile')}</button>
                    </div>
                    <div class="error-message" id="privateKeyPathError"></div>
                </div>

                <div class="form-group">
                    <label for="privateKeyPassword">${this.localization.localize('form.sshKeyPassword')}</label>
                    <input type="password" id="privateKeyPassword" name="privateKeyPassword" value="${existingServer?.privateKeyPassword || ''}">
                </div>
            </div>

            <div id="passwordFields" class="conditional-fields" style="display: ${!existingServer?.usePrivateKey ? 'block' : 'none'};">
                <div class="form-group">
                    <label for="password">${this.localization.localize('form.passwordPrompt')} <span class="required">*</span></label>
                    <input type="password" id="password" name="password" value="${existingServer?.password || ''}">
                    <div class="error-message" id="passwordError"></div>
                </div>
            </div>

            <div class="button-group">
                <button type="button" id="cancelBtn" class="btn-secondary">${this.localization.localize('button.cancel')}</button>
                <button type="submit" id="submitBtn" class="btn-primary">${isEdit ? this.localization.localize('button.update') : this.localization.localize('button.add')}</button>
            </div>
        </form>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        // Восстанавливаем состояние формы
        const state = vscode.getState();
        if (state) {
            restoreFormData(state);
        }

        // Сохраняем состояние при изменении полей
        document.querySelectorAll('input, select, textarea').forEach(element => {
            element.addEventListener('input', saveFormState);
            element.addEventListener('change', saveFormState);
        });

        // Обработка выбора группы
        document.getElementById('groupId').addEventListener('change', function() {
            const groupCreation = document.getElementById('groupCreation');
            if (this.value === 'create') {
                groupCreation.style.display = 'block';
            } else {
                groupCreation.style.display = 'none';
            }
            saveFormState();
        });

        // Обработка выбора метода аутентификации
        document.querySelectorAll('input[name="usePrivateKey"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const sshKeyFields = document.getElementById('sshKeyFields');
                const passwordFields = document.getElementById('passwordFields');

                if (this.value === 'true') {
                    sshKeyFields.style.display = 'block';
                    passwordFields.style.display = 'none';
                } else {
                    sshKeyFields.style.display = 'none';
                    passwordFields.style.display = 'block';
                }
                saveFormState();
            });
        });

        // Выбор SSH-ключа
        document.getElementById('selectKeyBtn').addEventListener('click', function() {
            vscode.postMessage({ type: 'selectSshKey' });
        });

        // Обработка сообщений от расширения
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'sshKeySelected':
                    document.getElementById('privateKeyPath').value = message.path;
                    saveFormState();
                    break;
                case 'error':
                    alert('Ошибка: ' + message.message);
                    break;
            }
        });

        // Отправка формы
        document.getElementById('serverForm').addEventListener('submit', function(e) {
            e.preventDefault();

            if (validateForm()) {
                const formData = new FormData(this);
                const data = Object.fromEntries(formData.entries());

                vscode.postMessage({
                    type: 'submit',
                    data: data
                });

                // Очищаем сохраненное состояние
                vscode.setState(null);
            }
        });

        // Отмена
        document.getElementById('cancelBtn').addEventListener('click', function() {
            vscode.postMessage({ type: 'cancel' });
        });

        function saveFormState() {
            const formData = new FormData(document.getElementById('serverForm'));
            const data = Object.fromEntries(formData.entries());

            // Добавляем состояние radio buttons
            const usePrivateKey = document.querySelector('input[name="usePrivateKey"]:checked');
            if (usePrivateKey) {
                data.usePrivateKey = usePrivateKey.value;
            }

            vscode.setState(data);
        }

        function restoreFormData(data) {
            Object.keys(data).forEach(key => {
                const element = document.querySelector('[name="' + key + '"]');
                if (element) {
                    if (element.type === 'radio') {
                        const radio = document.querySelector('[name="' + key + '"][value="' + data[key] + '"]');
                        if (radio) {
                            radio.checked = true;
                            radio.dispatchEvent(new Event('change'));
                        }
                    } else {
                        element.value = data[key];
                        if (element.id === 'groupId') {
                            element.dispatchEvent(new Event('change'));
                        }
                    }
                }
            });
        }

        function validateForm() {
            let isValid = true;

            // Очищаем предыдущие ошибки
            document.querySelectorAll('.error-message').forEach(error => {
                error.textContent = '';
            });

            // Проверяем обязательные поля
            const requiredFields = ['name', 'host', 'username'];
            requiredFields.forEach(fieldName => {
                const field = document.getElementById(fieldName);
                if (!field.value.trim()) {
                    document.getElementById(fieldName + 'Error').textContent = '${this.localization.localize('form.fieldRequired')}';
                    isValid = false;
                }
            });

            // Проверяем порт
            const port = document.getElementById('port').value;
            if (port && (isNaN(port) || port < 1 || port > 65535)) {
                document.getElementById('portError').textContent = '${this.localization.localize('form.portValidation')}';
                isValid = false;
            }

            // Проверяем поля аутентификации
            const usePrivateKey = document.querySelector('input[name="usePrivateKey"]:checked').value === 'true';
            if (usePrivateKey) {
                const privateKeyPath = document.getElementById('privateKeyPath').value;
                if (!privateKeyPath.trim()) {
                    document.getElementById('privateKeyPathError').textContent = '${this.localization.localize('form.fieldRequired')}';
                    isValid = false;
                }
            } else {
                const password = document.getElementById('password').value;
                if (!password.trim()) {
                    document.getElementById('passwordError').textContent = '${this.localization.localize('form.fieldRequired')}';
                    isValid = false;
                }
            }

            // Проверяем создание новой группы
            const groupId = document.getElementById('groupId').value;
            if (groupId === 'create') {
                const newGroupName = document.getElementById('newGroupName').value;
                if (!newGroupName.trim()) {
                    alert('${this.localization.localize('form.groupNameValidation')}');
                    isValid = false;
                }
            }

            return isValid;
        }

        // Инициализация состояния при загрузке
        document.addEventListener('DOMContentLoaded', function() {
            const usePrivateKey = document.querySelector('input[name="usePrivateKey"]:checked');
            if (usePrivateKey) {
                usePrivateKey.dispatchEvent(new Event('change'));
            }

            const groupId = document.getElementById('groupId');
            groupId.dispatchEvent(new Event('change'));
        });
    </script>
</body>
</html>`;
    }

    private generateNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
