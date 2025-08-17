# Changelog

## [0.0.1] - Initial Release

- First version of Save Serve extension;
- Basic functionality for server management;
- SSH connection support.

## [0.0.2] - Logo Fix

- Fixed logo;
- Updated README.md.

## [0.0.3] - Connection Fix

- Fixed bug where connection didn't always work on the first try on macOS.

## [0.0.4] - Connection Fix

- Fixed bug where connection didn't always work on the first try on Windows.

## [0.0.5] - Size Reduction

- Extension size reduced to 100 kilobytes.

## [0.0.6] - Error Handling

- Now shows warning if public key is selected instead of private key when connecting via SSH.

## [0.0.7] - Server Grouping

- Added ability to create server groups;
- Added context menu for group management;
- Added ability to move servers between groups;
- Ability to add servers directly to a group.

## [0.0.8] - Size Reduction

- Extension size reduced

## [0.1.0] - Improved Server and Group Creation Process

- **IMPORTANT**: Replaced sequential dialog-based server creation/editing with webview forms;
- Fixed data loss issue when switching between windows during form filling;
- Now you can safely copy passwords from other applications without losing entered data;
- Added form field validation with error display;
- All form fields are visible simultaneously for convenient filling;
- Auto-save form state during input;
- Improved user interface using VS Code styles;
- Similar improvements applied to group creation and editing forms;
- Updated password input when connecting to server in Windows PowerShell.

## [1.0.0] - First Stable Release with UX/UI Improvements

- Added custom icon selection for servers and groups;
- Added color coding to mark servers and groups;
- Added keyboard shortcuts for quick actions:
  - `Ctrl+Alt+S` (`Cmd+Alt+S` on Mac) - Add server;
  - `Ctrl+Alt+C` (`Cmd+Alt+C` on Mac) - Quick connect;
  - `Ctrl+Alt+G` (`Cmd+Alt+G` on Mac) - Add group;
  - `Ctrl+Alt+R` (`Cmd+Alt+R` on Mac) - Refresh list;
- Added quick connect command with search and server filtering;
- Extended server context menu:
  - Server duplication with automatic naming;
  - Export server settings to JSON (without passwords);
  - Quick server movement between groups;
- Updated data models with icon and color support;
- Better VS Code theme integration;
- Added new localization strings for all new features.
