# 🚀 Save Serve [English]

> **Instant SSH connection to your servers right from VS Code**

Save Serve is a Visual Studio Code extension that allows you to save server data and instantly connect to them via SSH without leaving your code editor.

![Version](https://img.shields.io/badge/version-0.0.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🔒 **Security** – server data stored in encrypted form
- 🔑 **Flexible authentication** – support for passwords and SSH keys
- 🖱️ **Quick connection** – access servers with a single click
- 🧠 **Intuitive interface** – convenient server management
- ⚡ **Time saving** – forget about manual SSH command input

## 🛠️ Installation

1. Open Visual Studio Code;
2. Press `Ctrl+P` or `Cmd+P` on macOS;
3. Type `ext install save-serve`;
4. Press Enter.

Or just find "Save Serve" in the VS Code marketplace.

## 📝 How to use

### Adding a server

1. Click on the Save Serve icon in the left sidebar;
2. Click the + button to add a new server;
3. Fill in the server information:
   - **Server name** - A meaningful name for display in the list
   - **Host** - IP address or domain
   - **Port** - Default is 22
   - **Username** - Login for connection
   - **Authentication method**:
     - 🔑 **By password** - Enter and save password
     - 🔐 **By SSH key** - Select key file and key password if any

### Connecting to a server

Simply click on a server in the list – and VS Code will instantly open a terminal with an SSH connection

## 🔐 Security

Save Serve uses VS Code's built-in secure storage:

- **Windows**: Windows Credential Manager;
- **macOS**: Keychain;
- **Linux**: libsecret.

All credentials are securely encrypted and never shared with third parties.

## 🧩 Commands

Use the command palette F1 or Ctrl+Shift+P:

| Command | Description |
|---------|----------|
| `Save Serve: Add server` | Create a new server entry |
| `Save Serve: Edit server` | Change server settings |
| `Save Serve: Delete server` | Delete server entry |
| `Save Serve: Connect to server` | Open SSH connection |
| `Save Serve: Refresh server list` | Update panel |

## 🐛 Report an issue

Found a bug or have a suggestion for improvement? Create an [issue](https://github.com/kianurivzzz/save-serve/issues) on GitHub.

## 📜 License

[MIT](LICENSE)

---

# 🚀 Save Serve [Russian]

> **Мгновенное SSH-подключение к твоим серверам прямо из VS Code**

Save Serve — это расширение для Visual Studio Code, которое позволяет сохранять данные серверов и мгновенно подключаться к ним через SSH, не выходя из редактора кода.

![Версия](https://img.shields.io/badge/version-0.0.2-blue)
![Лицензия](https://img.shields.io/badge/license-MIT-green)

## ✨ Возможности

- 🔒 **Безопасность** – данные серверов хранятся в зашифрованном видеж
- 🔑 **Гибкая аутентификация** – поддержка паролей и SSH-ключей;
- 🖱️ **Быстрое подключение** – доступ к серверам в один клик
- 🧠 **Интуитивный интерфейс** – удобное управление серверами;
- ⚡ **Экономия времени** – забудь о ручном вводе команд.

## 🛠️ Установка

1. Открой Visual Studio Code;
2. Нажми `Ctrl+P` или`Cmd+P` на macOS;
3. Введи `ext install save-serve`;
4. Нажми Enter.

Или просто найди "Save Serve" в маркетплейсе VS Code.

## 📝 Как использовать

### Добавление сервера

1. Нажми на иконку Save Serve в левом сайдбаре;
2. Нажми на кнопку + чтобы добавить новый сервер;
3. Заполни информацию о сервере:
   - **Имя сервера** – понятное название для отображения в списке
   - **Хост** – IP-адрес или домен
   - **Порт** – по умолчанию 22
   - **Имя пользователя** – логин для подключения
   - **Способ аутентификации**:
     - 🔑 **По паролю** – введи и сохрани пароль
     - 🔐 **По SSH-ключу** – выбери файл ключа и пароль от ключа, если есть

### Подключение к серверу

Просто нажми на сервер в списке – и VS Code мгновенно откроет терминал с SSH-подключением

## 🔐 Безопасность

Save Serve использует встроенное в VS Code защищённое хранилище:

- **Windows**: Windows Credential Manager;
- **macOS**: Keychain;
- **Linux**: libsecret.

Все учётные данные надёжно шифруются и никогда не передаются третьим лицам.

## 🧩 Команды

Используй палитру команд F1 или Ctrl+Shift+P:

| Команда | Описание |
|---------|----------|
| `Save Serve: Добавить сервер` | Создать новую запись о сервере |
| `Save Serve: Редактировать сервер` | Изменить настройки сервера |
| `Save Serve: Удалить сервер` | Удалить запись о сервере |
| `Save Serve: Подключиться к серверу` | Открыть SSH-подключение |
| `Save Serve: Обновить список серверов` | Обновить панель |

## 🐛 Сообщить о проблеме

Есть ошибка или предложение по улучшению? Создай [issue](https://github.com/kianurivzzz/save-serve/issues) на GitHub.

## 📜 Лицензия

[MIT](LICENSE)
