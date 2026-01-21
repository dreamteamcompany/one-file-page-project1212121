/**
 * Сервис для массовых операций с заявками
 * Single Responsibility: только API вызовы для bulk actions
 */

const BULK_TICKETS_URL = 'https://functions.poehali.dev/582ca427-5c6d-4995-b1b5-f4f206c12a07';

interface BulkActionResult {
  successful: number;
  total: number;
  error?: string;
}

export const bulkTicketsService = {
  async changeStatus(ticketIds: number[], statusId: number, token: string): Promise<BulkActionResult> {
    const response = await fetch(BULK_TICKETS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({
        ticket_ids: ticketIds,
        action: 'change_status',
        status_id: statusId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Ошибка изменения статуса');
    }

    return result;
  },

  async changePriority(ticketIds: number[], priorityId: number, token: string): Promise<BulkActionResult> {
    const response = await fetch(BULK_TICKETS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({
        ticket_ids: ticketIds,
        action: 'change_priority',
        priority_id: priorityId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Ошибка изменения приоритета');
    }

    return result;
  },

  async assignTickets(ticketIds: number[], userId: number, token: string): Promise<BulkActionResult> {
    const response = await fetch(BULK_TICKETS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({
        ticket_ids: ticketIds,
        action: 'assign',
        user_id: userId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Ошибка назначения заявок');
    }

    return result;
  },

  async deleteTickets(ticketIds: number[], token: string): Promise<BulkActionResult> {
    const response = await fetch(BULK_TICKETS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
      },
      body: JSON.stringify({
        ticket_ids: ticketIds,
        action: 'delete',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Ошибка удаления заявок');
    }

    return result;
  },
};
