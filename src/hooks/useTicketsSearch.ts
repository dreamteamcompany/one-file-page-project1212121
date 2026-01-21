/**
 * Хук для поиска и фильтрации заявок
 * Single Responsibility: только поиск
 */
import { useMemo } from 'react';

interface Ticket {
  id: number;
  title: string;
  description?: string;
  category_name?: string;
  priority_name?: string;
  department_name?: string;
  [key: string]: any;
}

export const useTicketsSearch = (tickets: Ticket[], searchQuery: string) => {
  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;

    const query = searchQuery.toLowerCase();
    
    return tickets.filter(ticket => {
      return (
        ticket.title.toLowerCase().includes(query) ||
        ticket.description?.toLowerCase().includes(query) ||
        ticket.category_name?.toLowerCase().includes(query) ||
        ticket.priority_name?.toLowerCase().includes(query) ||
        ticket.department_name?.toLowerCase().includes(query)
      );
    });
  }, [tickets, searchQuery]);

  return filteredTickets;
};
