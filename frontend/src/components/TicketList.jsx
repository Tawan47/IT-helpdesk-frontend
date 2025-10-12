import React from 'react';
import TicketItem from './TicketItem';

export default function TicketList({ tickets, userType, onUpdateStatus, onRateTicket, users }) {
  if (!tickets || tickets.length === 0) {
    return (<div className="bg-white p-6 rounded-lg shadow-md text-center"><p className="text-gray-500">ยังไม่มีรายการ</p></div>);
  }
  return (
    <div className="space-y-4">
      {tickets.map(ticket => (
        <TicketItem 
          key={ticket.id} 
          ticket={ticket} 
          userType={userType}
          onUpdateStatus={onUpdateStatus}
          onRateTicket={onRateTicket}
          users={users}
        />
      ))}
    </div>
  );
}