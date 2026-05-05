// Гард для обеспечения read-only контракта админ-панели
// Этот файл определяет, какие страницы и действия разрешены в режиме "только для чтения"

export interface AdminPageRoute {
  path: string;
  allowedMethods: ('GET' | 'POST' | 'PUT' | 'DELETE')[];
  readOnly: boolean;
  description: string;
}

export interface ReadOnlyContract {
  allowedPages: AdminPageRoute[];
  forbiddenActions: string[];
  allowedActions: string[];
}

/**
 * Read-only контракт для админ-панели
 * Определяет, какие страницы доступны и какие действия разрешены
 */
export const ADMIN_READ_ONLY_CONTRACT: ReadOnlyContract = {
  allowedPages: [
    {
      path: '/admin',
      allowedMethods: ['GET'],
      readOnly: true,
      description: 'Главная страница админ-панели - статистика'
    },
    {
      path: '/admin/users',
      allowedMethods: ['GET'],
      readOnly: true,
      description: 'Список пользователей - только просмотр'
    },
    {
      path: '/admin/users/:id',
      allowedMethods: ['GET'],
      readOnly: true,
      description: 'Детали пользователя - только просмотр'
    },
    {
      path: '/admin/wallets',
      allowedMethods: ['GET'],
      readOnly: true,
      description: 'Список кошельков - только просмотр'
    },
    {
      path: '/admin/games',
      allowedMethods: ['GET'],
      readOnly: true,
      description: 'Список игр - только просмотр'
    },
    {
      path: '/admin/games/:id',
      allowedMethods: ['GET'],
      readOnly: true,
      description: 'Детали игры - только просмотр'
    },
    {
      path: '/admin/ledger',
      allowedMethods: ['GET'],
      readOnly: true,
      description: 'Журнал операций - только просмотр'
    },
    {
      path: '/admin/audit',
      allowedMethods: ['GET'],
      readOnly: true,
      description: 'Аудит логи - только просмотр'
    }
  ],
  forbiddenActions: [
    'POST /admin/users/:id/credit',
    'POST /admin/users/:id/debit', 
    'POST /admin/users/:id/block',
    'POST /admin/users/:id/unblock',
    'POST /admin/users/:id/update-status',
    'POST /admin/games/:id/settle',
    'POST /admin/games/:id/refund',
    'POST /admin/ledger/create',
    'PUT /admin/users/:id',
    'DELETE /admin/users/:id',
    'DELETE /admin/games/:id',
    'POST /admin/manual-adjustment',
    'POST /admin/bulk-actions'
  ],
  allowedActions: [
    'GET /admin',           // Получение статистики
    'GET /admin/users',     // Получение списка пользователей
    'GET /admin/users/:id', // Получение деталей пользователя
    'GET /admin/wallets',   // Получение списка кошельков
    'GET /admin/games',     // Получение списка игр
    'GET /admin/games/:id', // Получение деталей игры
    'GET /admin/ledger',    // Получение журнала операций
    'GET /admin/audit'      // Получение аудит логов
  ]
};

/**
 * Проверяет, разрешен ли доступ к странице в read-only режиме
 */
export function isReadOnlyPage(path: string, method: string): boolean {
  const route = ADMIN_READ_ONLY_CONTRACT.allowedPages.find(page => 
    path === page.path || (page.path.includes(':id') && path.startsWith(page.path.split('/:id')[0]))
  );
  
  if (!route) {
    return false; // Неизвестная страница
  }
  
  return route.readOnly && route.allowedMethods.includes(method as any);
}

/**
 * Проверяет, является ли действие запрещенным в read-only режиме
 */
export function isForbiddenAction(path: string, method: string): boolean {
  const action = `${method} ${path}`;
  return ADMIN_READ_ONLY_CONTRACT.forbiddenActions.includes(action);
}

/**
 * Проверяет, является ли действие разрешенным в read-only режиме
 */
export function isAllowedAction(path: string, method: string): boolean {
  const action = `${method} ${path}`;
  return ADMIN_READ_ONLY_CONTRACT.allowedActions.includes(action);
}

/**
 * Возвращает описание read-only контракта
 */
export function getReadOnlyDescription(): string {
  return `
# Read-only контракт админ-панели

## Разрешенные страницы:
${ADMIN_READ_ONLY_CONTRACT.allowedPages.map(page => `- ${page.path} (${page.description})`).join('\n')}

## Запрещенные действия:
${ADMIN_READ_ONLY_CONTRACT.forbiddenActions.map(action => `- ${action}`).join('\n')}

## Разрешенные действия:
${ADMIN_READ_ONLY_CONTRACT.allowedActions.map(action => `- ${action}`).join('\n')}

## Политика безопасности:
- Все страницы админ-панели работают в режиме "только для чтения"
- Любые попытки записи (POST, PUT, DELETE) блокируются
- Исключения могут быть сделаны только через явное изменение этого контракта
- Все операции с балансами и статусами пользователей запрещены
- Административные изменения возможны только через сервисный слой
  `;
}