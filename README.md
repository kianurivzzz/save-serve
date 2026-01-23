# 🚀 Save Serve [English]

> **Instant SSH connection to your servers right from VS Code**

Save Serve is a Visual Studio Code extension that allows you to save server data and instantly connect to them via SSH without leaving your code editor.

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🔒 **Security** – server data gets encrypted storage
- 🔑 **Multiple auth methods** – works with passwords and SSH keys
- 🖱️ **One-click connect** – connect to servers with single click
- 🧠 **Simple interface** – manage servers with clear forms
- ⚡ **Fast setup** – skip manual SSH commands
- 📁 **Server groups** – organize servers into custom groups
- 💾 **Persistent forms** – no data loss when switching windows
- ✅ **Form validation** – shows errors in real time
- 🎨 **Custom icons** – pick from many icons for servers and groups
- 🌈 **Color coding** – mark servers with colors
- ⚡ **Keyboard shortcuts** – use hotkeys for quick actions
- 🚀 **Quick connect** – search and connect to servers fast

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
   - **Group** - Optional group to organize servers (you can create new groups here)
   - **Authentication method**:
     - 🔑 **By password** - Enter and save password
     - 🔐 **By SSH key** - Select key file and key password if any

### Managing groups

1. Create groups by clicking the "Add Group" button in the toolbar
2. Organize your servers by assigning them to groups during creation or editing
3. You can add a server directly to a group by right-clicking on the group
4. Edit or delete groups using the context menu

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

| Command                           | Description                     |
| --------------------------------- | ------------------------------- |
| `Save Serve: Add server`          | Create a new server entry       |
| `Save Serve: Edit server`         | Change server settings          |
| `Save Serve: Delete server`       | Delete server entry             |
| `Save Serve: Connect to server`   | Open SSH connection             |
| `Save Serve: Refresh server list` | Update panel                    |
| `Save Serve: Add group`           | Create a new server group       |
| `Save Serve: Edit group`          | Change group settings           |
| `Save Serve: Delete group`        | Delete group                    |
| `Save Serve: Quick Connect`       | Quick server search and connect |
| `Save Serve: Duplicate Server`    | Create a copy of server         |
| `Save Serve: Export Settings`     | Export server to JSON           |
| `Save Serve: Move to Group`       | Move server to another group    |

## 🐛 Report an issue

Found a bug or have a suggestion for improvement? Create an [issue](https://github.com/kianurivzzz/save-serve/issues) on GitHub.

## 📜 License

[MIT](LICENSE)

---

# 🚀 Save Serve [Russian]

> **Мгновенное SSH-подключение к твоим серверам прямо из VS Code**

Save Serve — это расширение для Visual Studio Code, которое позволяет сохранять данные серверов и мгновенно подключаться к ним через SSH, не выходя из редактора кода.

![Версия](https://img.shields.io/badge/version-1.0.1-blue)
![Лицензия](https://img.shields.io/badge/license-MIT-green)

## ✨ Возможности

- 🔒 **Безопасность** – данные серверов хранятся в зашифрованном виде
- 🔑 **Разные способы входа** – работает с паролями и SSH-ключами
- 🖱️ **Быстрое подключение** – доступ к серверам в один клик
- 🧠 **Простой интерфейс** – удобные формы для управления серверами
- ⚡ **Экономия времени** – забудь о ручном вводе команд
- 📁 **Группы серверов** – организуй серверы в удобные группы
- 💾 **Сохранение состояния** – никакой потери данных при переключении окон
- ✅ **Валидация форм** – показывает ошибки в реальном времени
- 🎨 **Кастомные иконки** – выбирай из множества иконок для серверов и групп
- 🌈 **Цветовое кодирование** – отмечай серверы цветами
- ⚡ **Горячие клавиши** – используй сочетания клавиш для быстрых действий
- 🚀 **Быстрое подключение** – ищи и подключайся к серверам быстро

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
   - **Группа** – опциональная группа для организации серверов (можно создать новую)
   - **Способ аутентификации**:
     - 🔑 **По паролю** – введи и сохрани пароль
     - 🔐 **По SSH-ключу** – выбери файл ключа и пароль от ключа, если есть

### Управление группами

1. Создавай группы, нажав на кнопку "Добавить группу" в панели инструментов
2. Распределяй серверы по группам при создании или редактировании
3. Можно добавить сервер непосредственно в группу, нажав правой кнопкой мыши на группу
4. Редактируй или удаляй группы через контекстное меню

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

| Команда                                | Описание                       |
| -------------------------------------- | ------------------------------ |
| `Save Serve: Добавить сервер`          | Создать новую запись о сервере |
| `Save Serve: Редактировать сервер`     | Изменить настройки сервера     |
| `Save Serve: Удалить сервер`           | Удалить запись о сервере       |
| `Save Serve: Подключиться к серверу`   | Открыть SSH-подключение        |
| `Save Serve: Обновить список серверов` | Обновить панель                |
| `Save Serve: Добавить группу`          | Создать новую группу серверов  |
| `Save Serve: Редактировать группу`     | Изменить настройки группы      |
| `Save Serve: Удалить группу`           | Удалить группу                 |
| `Save Serve: Быстрое подключение`      | Быстрый поиск и подключение    |
| `Save Serve: Дублировать сервер`       | Создать копию сервера          |
| `Save Serve: Экспорт настроек`         | Экспорт сервера в JSON         |
| `Save Serve: Переместить в группу`     | Переместить сервер в группу    |

## 🐛 Сообщить о проблеме

Есть ошибка или предложение по улучшению? Создай [issue](https://github.com/kianurivzzz/save-serve/issues) на GitHub.

## 📜 Лицензия

[MIT](LICENSE)
