import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Server } from '../models/serverModel';

export class SshService {
    public async connectToServer(server: Server): Promise<void> {
        try {
            console.log('Подключение к серверу:', JSON.stringify(server, null, 2));

            // Проверяет, что все поля имеют значения
            if (!server || !server.host || !server.username) {
                throw new Error('Не указаны обязательные параметры подключения. Хост или имя пользователя');
            }

            // Создает терминал для подключения
            const terminal = vscode.window.createTerminal(`SSH: ${server.name}`);
            terminal.show();

            // Если используется пароль, подключается через скрипт автоматизации
            if (!server.usePrivateKey && server.password) {
                await this.connectWithPassword(terminal, server);
            }
            // Если используется ключ, подключается обычным способом
            else {
                await this.connectWithKey(terminal, server);
            }

        } catch (error) {
            console.error('Ошибка при подключении к серверу:', error);
            vscode.window.showErrorMessage(`Ошибка при подключении к серверу: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Подключение с использованием пароля
     */
    private async connectWithPassword(terminal: vscode.Terminal, server: Server): Promise<void> {
        const host = server.host;
        const port = server.port || 22;
        const username = server.username;
        const password = server.password || '';

        // Информирует пользователя без лишних подробностей
        terminal.sendText(`echo "Подключение к ${server.name}..."`);

        // Определяет платформу для правильного выбора метода автоматизации
        const platform = os.platform();

        // На macOS и Linux можно использовать "expect" через AppleScript или "script"
        if (platform === 'darwin') {
            // На macOS используем AppleScript для надёжного ввода пароля
            await this.connectWithMacOSMethod(terminal, server);
        }
        else if (platform === 'linux') {
            // На Linux пробует использовать sshpass если установлен
            await this.connectWithLinuxMethod(terminal, server);
        }
        else if (platform === 'win32') {
            // На Windows используется PowerShell
            await this.connectWithWindowsMethod(terminal, server);
        }
        else {
            // Для неизвестных платформ просто показывается пароль
            terminal.sendText(`echo "Пароль для SSH: ${password}"`);

            // Формирует SSH команду
            let sshCommand = 'ssh';
            if (port !== 22) { sshCommand += ` -p ${port}`; }
            sshCommand += ` -o StrictHostKeyChecking=no ${username}@${host}`;

            terminal.sendText(sshCommand);
        }
    }

    /**
     * Метод подключения для macOS
     */
    private async connectWithMacOSMethod(terminal: vscode.Terminal, server: Server): Promise<void> {
        const host = server.host;
        const port = server.port || 22;
        const username = server.username;
        const password = server.password || '';

        // Создаёт уникальные имена файлов
        const sessionId = crypto.randomBytes(8).toString('hex');
        const tmpDir = os.tmpdir();
        const expectScriptPath = path.join(tmpDir, `ss_expect_${sessionId}`);

        // Содержимое expect скрипта (улучшенная версия)
        const expectScript = `#!/usr/bin/expect -f
# Устанавливаем таймаут ожидания (увеличиваем для медленных соединений)
set timeout 60

# Запускаем SSH подключение
spawn ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}

# Ожидаем запрос на ввод пароля или других возможных запросов
expect {
    # Обрабатываем запрос на проверку подлинности сервера
    "yes/no" {
        send "yes\\r"
        exp_continue
    }
    # Обрабатываем запрос на ввод пароля (разные варианты запроса)
    "password:" {
        send "${password}\\r"
    }
    "Password:" {
        send "${password}\\r"
    }
    "пароль:" {
        send "${password}\\r"
    }
    "Пароль:" {
        send "${password}\\r"
    }
    # Таймаут - завершаем с ошибкой
    timeout {
        exit 1
    }
    # Ошибка - завершаем с ошибкой
    eof {
        exit 1
    }
}

# Переходим в интерактивный режим
interact`;

        try {
            // Записывает expect скрипт и устанавливает права на выполнение
            await fs.promises.writeFile(expectScriptPath, expectScript, { mode: 0o755 });

            // Проверяем наличие expect корректно
            terminal.sendText(`if command -v expect >/dev/null 2>&1; then`);

            // Если expect установлен, запускаем скрипт
            terminal.sendText(`  chmod +x "${expectScriptPath}" && "${expectScriptPath}"`);
            terminal.sendText(`else`);

            // Запасной вариант - используем обычный SSH
            terminal.sendText(`  ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}`);
            terminal.sendText(`fi`);

            // Удаляет временный файл через некоторое время
            setTimeout(() => {
                try {
                    fs.unlinkSync(expectScriptPath);
                    console.log(`Временный expect скрипт удален: ${expectScriptPath}`);
                } catch (error) {
                    console.log('Ошибка при удалении временного файла:', error);
                }
            }, 10000); // Увеличиваем время до удаления

        } catch (error) {
            console.error('Ошибка при создании expect скрипта:', error);

            // Используем обычный SSH без показа пароля
            terminal.sendText(`ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}`);
        }
    }

    /**
     * Метод подключения для Linux
     */
    private async connectWithLinuxMethod(terminal: vscode.Terminal, server: Server): Promise<void> {
        const host = server.host;
        const port = server.port || 22;
        const username = server.username;
        const password = server.password || '';

        // Проверяем наличие sshpass без вывода в терминал
        terminal.sendText(`if command -v sshpass >/dev/null 2>&1; then`);
        // Используем sshpass, если доступен
        terminal.sendText(`  sshpass -p "${password}" ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}`);
        terminal.sendText(`else`);

        // Проверяем наличие expect без вывода в терминал
        terminal.sendText(`  if command -v expect >/dev/null 2>&1; then`);

        // Создаем сессионный ID для временных файлов
        const sessionId = crypto.randomBytes(8).toString('hex');
        const tmpDir = os.tmpdir();
        const expectScriptPath = path.join(tmpDir, `ss_expect_${sessionId}`);

        // Содержимое expect скрипта
        const expectScript = `#!/usr/bin/expect -f
set timeout 30
spawn ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}
expect {
    "yes/no" { send "yes\\r"; exp_continue }
    "password:" { send "${password}\\r" }
    "Password:" { send "${password}\\r" }
    "пароль:" { send "${password}\\r" }
    "Пароль:" { send "${password}\\r" }
}
interact
`;

        try {
            // Записывает expect скрипт
            await fs.promises.writeFile(expectScriptPath, expectScript, { mode: 0o700 });

            // Запускает expect скрипт
            terminal.sendText(`    "${expectScriptPath}"`);

            // Удаляет временный файл через некоторое время
            setTimeout(() => {
                try {
                    fs.unlinkSync(expectScriptPath);
                } catch (error) {
                    console.log('Ошибка при удалении временного файла:', error);
                }
            }, 5000);

        } catch (error) {
            console.error('Ошибка при создании expect скрипта:', error);

            // Запускает обычный SSH без показа пароля
            terminal.sendText(`    ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}`);
        }

        // Если нет expect, используем обычный SSH
        terminal.sendText(`  else`);
        terminal.sendText(`    ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}`);
        terminal.sendText(`  fi`);
        terminal.sendText(`fi`);
    }

        /**
     * Метод подключения для Windows
     */
    private async connectWithWindowsMethod(terminal: vscode.Terminal, server: Server): Promise<void> {
        const host = server.host;
        const port = server.port || 22;
        const username = server.username;
        const password = server.password || '';

        // Создаём уникальные имена файлов
        const sessionId = crypto.randomBytes(8).toString('hex');
        const tmpDir = os.tmpdir();
        const pwdFilePath = path.join(tmpDir, `ss_pwd_${sessionId}.txt`);
        const batScriptPath = path.join(tmpDir, `ss_connect_${sessionId}.bat`);

        try {
            // Создаём временный файл с паролем
            await fs.promises.writeFile(pwdFilePath, password);

            // Создаём batch скрипт для скрытой передачи пароля
            const batScriptContent = `@echo off
echo Подключение к ${server.name}...

rem Создаём временную переменную с паролем
for /f "delims=" %%i in ('type "${pwdFilePath}"') do set "SSH_PASSWORD=%%i"

rem Удаляем файл с паролем сразу после чтения
del /q "${pwdFilePath}" 2>nul

rem Используем echo для передачи пароля в SSH через pipe
echo %SSH_PASSWORD% | ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no -o PasswordAuthentication=yes ${username}@${host}

rem Если SSH завершился неудачно, попробуем ещё раз интерактивно
if %ERRORLEVEL% neq 0 (
    echo Повторная попытка подключения...
    ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}
)

rem Очищаем переменную с паролем
set "SSH_PASSWORD="

rem Удаляем этот скрипт
del /q "${batScriptPath}" 2>nul
`;

            // Записываем batch скрипт
            await fs.promises.writeFile(batScriptPath, batScriptContent);

            // Запускаем скрипт
            terminal.sendText(`call "${batScriptPath}"`);

            // Резервная очистка временных файлов
            setTimeout(() => {
                try {
                    if (fs.existsSync(pwdFilePath)) {
                        fs.unlinkSync(pwdFilePath);
                    }
                    if (fs.existsSync(batScriptPath)) {
                        fs.unlinkSync(batScriptPath);
                    }
                    console.log('Временные файлы очищены');
                } catch (error) {
                    console.log('Предупреждение при очистке файлов:', error);
                }
            }, 10000);

        } catch (error) {
            console.error('Ошибка при создании Windows SSH скрипта:', error);

            // Fallback - обычное SSH подключение
            terminal.sendText(`ssh ${port !== 22 ? `-p ${port} ` : ''}-o StrictHostKeyChecking=no ${username}@${host}`);
        }
    }

    /**
     * Экранирует строку для использования в AppleScript
     */
    private escapeAppleScriptString(str: string): string {
        return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    /**
     * Подключение с помощью SSH-ключа
     */
    private async connectWithKey(terminal: vscode.Terminal, server: Server): Promise<void> {
        // Формирует команду для подключения к серверу
        let sshCommand = `ssh`;

        // Добавляет порт, если он не стандартный (22)
        const port = server.port || 22;
        if (port !== 22) {
            sshCommand += ` -p ${port}`;
        }

        // Проверяем путь к ключу и корректируем его при необходимости
        let keyPath = server.privateKeyPath || '';

        // Если путь указывает на .pub файл, убираем расширение .pub
        if (keyPath.endsWith('.pub')) {
            keyPath = keyPath.substring(0, keyPath.length - 4);
            console.log(`Исправлен путь к ключу: ${keyPath}`);
        }

        // Добавляет путь к приватному ключу, если он используется
        if (server.usePrivateKey && keyPath) {
            sshCommand += ` -i "${keyPath}"`;
        }

        // Добавляет имя пользователя и хост
        sshCommand += ` ${server.username}@${server.host}`;

        // Если есть пароль для ключа, скрываем его от вывода
        if (server.usePrivateKey && server.privateKeyPassword) {
            // Создаём expect скрипт для работы с защищенным ключом
            const sessionId = crypto.randomBytes(8).toString('hex');
            const tmpDir = os.tmpdir();
            const expectScriptPath = path.join(tmpDir, `ss_key_${sessionId}`);

            const keyExpectScript = `#!/usr/bin/expect -f
set timeout 30
spawn ssh ${port !== 22 ? `-p ${port} ` : ''}-i "${keyPath}" -o StrictHostKeyChecking=no ${server.username}@${server.host}
expect {
    "yes/no" { send "yes\\r"; exp_continue }
    "passphrase" { send "${server.privateKeyPassword}\\r" }
    "Enter passphrase" { send "${server.privateKeyPassword}\\r" }
    "Введите парольную фразу" { send "${server.privateKeyPassword}\\r" }
}
interact
`;

            try {
                // Записывает expect скрипт
                await fs.promises.writeFile(expectScriptPath, keyExpectScript, { mode: 0o700 });

                // Проверяем наличие expect
                terminal.sendText(`if command -v expect >/dev/null 2>&1; then`);
                terminal.sendText(`  chmod +x "${expectScriptPath}" && "${expectScriptPath}"`);
                terminal.sendText(`else`);
                terminal.sendText(`  ${sshCommand}`);
                terminal.sendText(`fi`);

                // Удаляет временный файл через некоторое время
                setTimeout(() => {
                    try {
                        fs.unlinkSync(expectScriptPath);
                    } catch (error) {
                        console.log('Ошибка при удалении временного файла:', error);
                    }
                }, 5000);
            } catch (error) {
                console.error('Ошибка при создании expect скрипта для ключа:', error);
                terminal.sendText(sshCommand);
            }
        } else {
            terminal.sendText(sshCommand);
        }
    }
}
