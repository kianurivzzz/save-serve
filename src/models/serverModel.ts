export interface Server {
	id: string
	name: string
	host: string
	port: number
	username: string
	password?: string
	usePrivateKey: boolean
	privateKeyPath?: string
	privateKeyPassword?: string
	groupId?: string
	icon?: string // VS Code ThemeIcon ID для кастомизации иконки
	color?: string // Цвет для группировки/выделения
}

export interface ServerGroup {
	id: string
	name: string
	description?: string
	icon?: string // VS Code ThemeIcon ID для кастомизации иконки группы
	color?: string // Цвет группы для визуального выделения
}
