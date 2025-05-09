// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Server } from './models/serverModel';
import { LocalizationService } from './services/localizationService';
import { ServerService } from './services/serverService';
import { SshService } from './services/sshService';
import { ServerForm } from './views/serverForm';
import { ServerTreeItem, ServerTreeProvider } from './views/serverTreeProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// Инициализация локализации
	const localization = LocalizationService.getInstance();
	localization.setExtensionContext(context);
	console.log('Расширение активировано:', localization.localize('log.extensionActivated'));

	// Получаем текущий язык и применяем его
	const language = localization.getCurrentLanguage();
	vscode.commands.executeCommand('setContext', 'save-serve.language', language);

	// Инициализация сервисов
	const serverService = new ServerService(context);
	const sshService = new SshService();
	const serverForm = new ServerForm(serverService);

	// Регистрация представления серверов
	const serverTreeProvider = new ServerTreeProvider(serverService);
	const serversView = vscode.window.createTreeView('saveServeServers', {
		treeDataProvider: serverTreeProvider,
		showCollapseAll: false
	});
	context.subscriptions.push(serversView);

	// Регистрация команд
	context.subscriptions.push(
		vscode.commands.registerCommand('save-serve.addServer', async () => {
			console.log(localization.localize('log.addServerCommand'));
			await serverForm.showAddServerForm();
			serverTreeProvider.refresh();
		}),

		vscode.commands.registerCommand('save-serve.editServer', async (item: ServerTreeItem) => {
			console.log(localization.localize('log.editServerCommand', item?.server?.id));
			if (!item || !item.server) {
				console.error('Ошибка – не передан сервер для редактирования');
				vscode.window.showErrorMessage(localization.localize('error.cannotEdit'));
				return;
			}
			await serverForm.showEditServerForm(item.server);
			serverTreeProvider.refresh();
		}),

		vscode.commands.registerCommand('save-serve.deleteServer', async (item: ServerTreeItem) => {
			console.log(localization.localize('log.deleteServerCommand', item?.server?.id));
			if (!item || !item.server) {
				console.error('Ошибка – не передан сервер для удаления');
				vscode.window.showErrorMessage(localization.localize('error.cannotDelete'));
				return;
			}

			const confirm = await vscode.window.showWarningMessage(
				localization.localize('warning.confirmDelete', item.server.name),
				{ modal: true },
				localization.localize('button.yes'), localization.localize('button.no')
			);

			if (confirm === localization.localize('button.yes')) {
				await serverService.deleteServer(item.server.id);
				serverTreeProvider.refresh();
				vscode.window.showInformationMessage(localization.localize('info.serverDeleted', item.server.name));
			}
		}),

		vscode.commands.registerCommand('save-serve.connectToServer', async (server: Server) => {
			console.log(localization.localize('log.connectServerCommand'));

			// Подробно логируем полученный объект для отладки
			console.log('Тип полученного объекта:', typeof server);
			console.log('Полученный объект:', server);

			// Проверяем разные форматы объекта
			if (!server) {
				console.error('Ошибка – не передан сервер для подключения');
				vscode.window.showErrorMessage(localization.localize('error.cannotConnect'));
				return;
			}

			// Обрабатываем случай, когда передан ServerTreeItem вместо Server
			if ('server' in server) {
				console.log('Получен объект ServerTreeItem, извлекаем Server');
				server = (server as any).server;
			}

			// Обрабатываем случай, когда сервер передан внутри аргументов команды
			if ('command' in server && Array.isArray((server as any).command?.arguments)) {
				console.log('Получен объект с аргументами команды, извлекаем Server из аргументов');
				const args = (server as any).command.arguments;
				if (args && args.length > 0) {
					server = args[0];
				}
			}

			console.log('Объект сервера после обработки:', server);

			// Дополнительная проверка полей сервера
			if (!server || !server.host || !server.username) {
				console.error('Ошибка: не заполнены обязательные поля сервера', JSON.stringify(server, null, 2));
				vscode.window.showErrorMessage(localization.localize('error.requiredFields'));
				return;
			}

			try {
				await sshService.connectToServer(server);
				vscode.window.showInformationMessage(localization.localize('info.connectionSuccess', server.name, server.username, server.host));
			} catch (error) {
				console.error('Ошибка при подключении:', error);
				vscode.window.showErrorMessage(localization.localize('error.connectionError', error instanceof Error ? error.message : String(error)));
			}
		}),

		vscode.commands.registerCommand('save-serve.refreshServers', () => {
			console.log(localization.localize('log.refreshServersCommand'));
			serverTreeProvider.refresh();
		}),

		// Добавляем команду для смены языка
		vscode.commands.registerCommand('save-serve.changeLanguage', async () => {
			const currentLanguage = localization.getCurrentLanguage();
			const newLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
			await localization.setLanguage(newLanguage);
			// Для применения новых параметров локализации пользователю нужно перезагрузить расширение
			const reload = await vscode.window.showInformationMessage(
				localization.localize('info.reloadRequired'),
				localization.localize('button.reload')
			);
			if (reload) {
				await vscode.commands.executeCommand('workbench.action.reloadWindow');
			}
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {
	const localization = LocalizationService.getInstance();
	console.log(localization.localize('log.extensionDeactivated'));
}
